"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PersonType, PersonStatus, TimetableStatus } from "@/generated/prisma/client";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireOrgMember(userId: string, slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true },
  });
  if (!org) throw new Error("Organization not found");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership) throw new Error("Not a member of this organization");

  return { org, role: membership.role };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OrgSummary {
  totalPeople: number;
  totalClasses: number;
  totalSubjects: number;
  totalRooms: number;
  totalTimetableEntries: number;
  totalExceptions: number;
  peopleByType: { type: string; count: number }[];
  activePeople: number;
  inactivePeople: number;
}

export type FetchSummaryResult =
  | { ok: true; summary: OrgSummary }
  | { ok: false; error: string };

export interface ClassReportRow {
  id: string;
  name: string;
  code: string | null;
  status: string;
  memberCount: number;
  activeMemberCount: number;
  timetableEntryCount: number;
}

export type FetchClassReportResult =
  | { ok: true; classes: ClassReportRow[] }
  | { ok: false; error: string };

export interface PersonReportRow {
  id: string;
  name: string;
  personType: string;
  status: string;
  orgIdentifier: string | null;
  classNames: string[];
  createdAt: Date;
}

export interface FetchPeopleReportInput {
  slug: string;
  personType?: string | null;
  classId?: string | null;
  status?: string | null;
}

export type FetchPeopleReportResult =
  | { ok: true; people: PersonReportRow[]; total: number }
  | { ok: false; error: string };

export interface ScheduleReportRow {
  id: string;
  className: string;
  classCode: string | null;
  subjectName: string;
  teacherName: string;
  roomName: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
  periodLabel: string | null;
  status: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  exceptionCount: number;
  cancelledCount: number;
  rescheduledCount: number;
  substitutedCount: number;
}

export interface ExceptionSummaryRow {
  id: string;
  exceptionDate: Date;
  exceptionType: string;
  className: string;
  subjectName: string;
  teacherName: string;
  note: string | null;
  substitutePersonName: string | null;
}

export interface FetchScheduleReportInput {
  slug: string;
  /** ISO date string for start of window */
  from?: string | null;
  /** ISO date string for end of window */
  to?: string | null;
  classId?: string | null;
}

export type FetchScheduleReportResult =
  | {
      ok: true;
      entries: ScheduleReportRow[];
      exceptions: ExceptionSummaryRow[];
      totalEntries: number;
      totalExceptions: number;
    }
  | { ok: false; error: string };

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Fetch high-level org summary metrics.
 * Used for the overview metric cards at the top of the reports page.
 */
export async function fetchReportSummary(
  slug: string
): Promise<FetchSummaryResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  try {
    const { org } = await requireOrgMember(session.user.id, slug);

    const [
      activePeople,
      inactivePeople,
      totalClasses,
      totalSubjects,
      totalRooms,
      totalTimetableEntries,
      totalExceptions,
      peopleByTypeRaw,
    ] = await Promise.all([
      prisma.person.count({
        where: { organizationId: org.id, status: "ACTIVE" },
      }),
      prisma.person.count({
        where: { organizationId: org.id, status: "INACTIVE" },
      }),
      prisma.class.count({
        where: { organizationId: org.id, status: "ACTIVE" },
      }),
      prisma.subject.count({
        where: { organizationId: org.id },
      }),
      prisma.room.count({
        where: { organizationId: org.id },
      }),
      prisma.timetableEntry.count({
        where: { organizationId: org.id, status: "ACTIVE" },
      }),
      prisma.timetableException.count({
        where: { organizationId: org.id },
      }),
      // Group by personType for the breakdown
      prisma.person.groupBy({
        by: ["personType"],
        where: { organizationId: org.id, status: "ACTIVE" },
        _count: { personType: true },
      }),
    ]);

    const peopleByType = peopleByTypeRaw.map((row) => ({
      type: row.personType as string,
      count: row._count.personType,
    }));

    return {
      ok: true,
      summary: {
        totalPeople: activePeople + inactivePeople,
        activePeople,
        inactivePeople,
        totalClasses,
        totalSubjects,
        totalRooms,
        totalTimetableEntries,
        totalExceptions,
        peopleByType,
      },
    };
  } catch (err) {
    console.error("[fetchReportSummary]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load report summary.",
    };
  }
}

/**
 * Fetch per-class roster statistics.
 */
export async function fetchClassReport(
  slug: string
): Promise<FetchClassReportResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  try {
    const { org } = await requireOrgMember(session.user.id, slug);

    const classes = await prisma.class.findMany({
      where: { organizationId: org.id },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        // Active memberships (no end date)
        _count: {
          select: {
            memberships: { where: { endDate: null } },
            timetableEntries: { where: { status: "ACTIVE" } },
          },
        },
        // Total (including ended) memberships for historical context
        memberships: {
          select: { endDate: true },
        },
      },
    });

    return {
      ok: true,
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        status: c.status,
        activeMemberCount: c._count.memberships,
        memberCount: c.memberships.length,
        timetableEntryCount: c._count.timetableEntries,
      })),
    };
  } catch (err) {
    console.error("[fetchClassReport]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load class report.",
    };
  }
}

/**
 * Fetch per-person roster with class memberships.
 * Supports filtering by personType, classId, and status.
 */
export async function fetchPeopleReport(
  input: FetchPeopleReportInput
): Promise<FetchPeopleReportResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  try {
    const { org } = await requireOrgMember(session.user.id, input.slug);

    const personTypeFilter =
      input.personType && input.personType !== "ALL"
        ? (input.personType as PersonType)
        : undefined;
    const statusFilter =
      input.status && input.status !== "ALL"
        ? (input.status as PersonStatus)
        : undefined;
    const classMembershipsFilter =
      input.classId && input.classId !== "ALL"
        ? { some: { classId: input.classId, endDate: null as null } }
        : undefined;

    const [people, total] = await Promise.all([
      prisma.person.findMany({
        where: {
          organizationId: org.id,
          ...(personTypeFilter !== undefined ? { personType: personTypeFilter } : {}),
          ...(statusFilter !== undefined ? { status: statusFilter } : {}),
          ...(classMembershipsFilter !== undefined
            ? { classMemberships: classMembershipsFilter }
            : {}),
        },
        orderBy: [{ personType: "asc" }, { name: "asc" }],
        take: 200, // cap to avoid overfetch — sufficient for a report view
        include: {
          classMemberships: {
            where: { endDate: null },
            include: {
              class: { select: { name: true } },
            },
          },
        },
      }),
      prisma.person.count({
        where: {
          organizationId: org.id,
          ...(personTypeFilter !== undefined ? { personType: personTypeFilter } : {}),
          ...(statusFilter !== undefined ? { status: statusFilter } : {}),
          ...(classMembershipsFilter !== undefined
            ? { classMemberships: classMembershipsFilter }
            : {}),
        },
      }),
    ]);

    return {
      ok: true,
      total,
      people: people.map((p) => ({
        id: p.id,
        name: p.name,
        personType: p.personType as string,
        status: p.status as string,
        orgIdentifier: p.orgIdentifier,
        createdAt: p.createdAt,
        classNames: p.classMemberships.map((m) => m.class.name),
      })),
    };
  } catch (err) {
    console.error("[fetchPeopleReport]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load people report.",
    };
  }
}

/**
 * Fetch timetable schedule overview with exception summaries.
 * Optionally filtered by class and/or date window (exception dates).
 */
export async function fetchScheduleReport(
  input: FetchScheduleReportInput
): Promise<FetchScheduleReportResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  try {
    const { org } = await requireOrgMember(session.user.id, input.slug);

    // Date window for exceptions
    const fromDate = input.from ? new Date(input.from) : null;
    const toDate = input.to ? new Date(input.to) : null;
    const exceptionDateWhere: { gte?: Date; lte?: Date } = {};
    if (fromDate) exceptionDateWhere.gte = fromDate;
    if (toDate) exceptionDateWhere.lte = toDate;

    const activeStatus: TimetableStatus = "ACTIVE";

    const [entries, exceptions] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: {
          organizationId: org.id,
          status: activeStatus,
          ...(input.classId && input.classId !== "ALL"
            ? { classId: input.classId }
            : {}),
        },
        orderBy: [{ startTime: "asc" }],
        include: {
          class: { select: { name: true, code: true } },
          subject: { select: { name: true } },
          teacherPerson: { select: { name: true } },
          room: { select: { name: true } },
          exceptions: {
            where:
              fromDate || toDate
                ? { exceptionDate: exceptionDateWhere }
                : undefined,
            select: { exceptionType: true },
          },
        },
      }),

      // Flat exception list for the exceptions summary table
      prisma.timetableException.findMany({
        where: {
          organizationId: org.id,
          ...(input.classId && input.classId !== "ALL"
            ? {
                timetableEntry: { classId: input.classId },
              }
            : {}),
          ...(fromDate || toDate
            ? { exceptionDate: exceptionDateWhere }
            : {}),
        },
        orderBy: { exceptionDate: "desc" },
        take: 100,
        select: {
          id: true,
          exceptionDate: true,
          exceptionType: true,
          note: true,
          substitutePerson: { select: { name: true } },
          timetableEntry: {
            select: {
              class: { select: { name: true } },
              subject: { select: { name: true } },
              teacherPerson: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const entryRows: ScheduleReportRow[] = entries.map((e) => {
      const exceptionsByType = e.exceptions.reduce<Record<string, number>>(
        (acc, ex) => {
          acc[ex.exceptionType] = (acc[ex.exceptionType] ?? 0) + 1;
          return acc;
        },
        {}
      );

      return {
        id: e.id,
        className: e.class.name,
        classCode: e.class.code,
        subjectName: e.subject.name,
        teacherName: e.teacherPerson.name,
        roomName: e.room?.name ?? null,
        startTime: e.startTime,
        endTime: e.endTime,
        daysOfWeek: e.daysOfWeek,
        periodLabel: e.periodLabel,
        status: e.status,
        effectiveFrom: e.effectiveFrom,
        effectiveTo: e.effectiveTo,
        exceptionCount: e.exceptions.length,
        cancelledCount: exceptionsByType["CANCELLED"] ?? 0,
        rescheduledCount: exceptionsByType["RESCHEDULED"] ?? 0,
        substitutedCount: exceptionsByType["SUBSTITUTED"] ?? 0,
      };
    });

    const exceptionRows: ExceptionSummaryRow[] = exceptions.map((ex) => ({
      id: ex.id,
      exceptionDate: ex.exceptionDate,
      exceptionType: ex.exceptionType,
      className: ex.timetableEntry.class.name,
      subjectName: ex.timetableEntry.subject.name,
      teacherName: ex.timetableEntry.teacherPerson.name,
      note: ex.note,
      substitutePersonName: ex.substitutePerson?.name ?? null,
    }));

    return {
      ok: true,
      entries: entryRows,
      exceptions: exceptionRows,
      totalEntries: entryRows.length,
      totalExceptions: exceptionRows.length,
    };
  } catch (err) {
    console.error("[fetchScheduleReport]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load schedule report.",
    };
  }
}
