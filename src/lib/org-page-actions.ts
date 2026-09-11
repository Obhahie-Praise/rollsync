"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateOrganization } from "@/lib/settings-actions";

// Re-export updateOrganization so the client component only needs this file
export { updateOrganization };

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

async function requireOrgAdmin(userId: string, slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      subtype: true,
      logoUrl: true,
      createdAt: true,
    },
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

export interface OrgStructureCounts {
  totalPeople: number;
  activePeople: number;
  totalClasses: number;
  activeClasses: number;
  totalSubjects: number;
  totalRooms: number;
  totalTeachers: number;
  totalTimetableEntries: number;
  activeTimetableEntries: number;
  totalTimetableExceptions: number;
  totalClassMemberships: number;
  totalOrgMembers: number;
  peopleWithAccess: number; // People linked to a Roll SYNC User
  peopleByType: { type: string; count: number }[];
  membersByRole: { role: string; count: number }[];
}

export interface OrgSetupStatus {
  orgCreated: boolean;
  peopleAdded: boolean;
  classesConfigured: boolean;
  subjectsConfigured: boolean;
  teachersAssigned: boolean;
  roomsConfigured: boolean;
  timetableConfigured: boolean;
  attendanceRecorded: boolean; // not yet — AttendanceSession model doesn't exist
}

export interface OrgPageData {
  org: {
    id: string;
    name: string;
    slug: string;
    type: string;
    subtype: string | null;
    logoUrl: string | null;
    createdAt: Date;
  };
  role: string;
  counts: OrgStructureCounts;
  setup: OrgSetupStatus;
}

export type FetchOrgPageDataResult =
  | { ok: true; data: OrgPageData }
  | { ok: false; error: string };

// ─── Main fetch action ─────────────────────────────────────────────────────────

export async function fetchOrgPageData(
  slug: string
): Promise<FetchOrgPageDataResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  try {
    const { org, role } = await requireOrgAdmin(session.user.id, slug);

    const [
      activePeople,
      totalPeople,
      activeClasses,
      totalClasses,
      totalSubjects,
      totalRooms,
      totalTeachers,
      activeTimetableEntries,
      totalTimetableEntries,
      totalTimetableExceptions,
      totalClassMemberships,
      totalOrgMembers,
      peopleWithAccess,
      peopleByTypeRaw,
      membersByRoleRaw,
    ] = await Promise.all([
      prisma.person.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
      prisma.person.count({ where: { organizationId: org.id } }),
      prisma.class.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
      prisma.class.count({ where: { organizationId: org.id } }),
      prisma.subject.count({ where: { organizationId: org.id } }),
      prisma.room.count({ where: { organizationId: org.id } }),
      prisma.person.count({
        where: { organizationId: org.id, personType: "TEACHER", status: "ACTIVE" },
      }),
      prisma.timetableEntry.count({
        where: { organizationId: org.id, status: "ACTIVE" },
      }),
      prisma.timetableEntry.count({ where: { organizationId: org.id } }),
      prisma.timetableException.count({ where: { organizationId: org.id } }),
      prisma.classMembership.count({
        where: { organizationId: org.id, endDate: null },
      }),
      prisma.membership.count({ where: { organizationId: org.id } }),
      // People linked to a Roll SYNC User account
      prisma.person.count({
        where: { organizationId: org.id, linkedUserId: { not: null } },
      }),
      prisma.person.groupBy({
        by: ["personType"],
        where: { organizationId: org.id, status: "ACTIVE" },
        _count: { personType: true },
      }),
      prisma.membership.groupBy({
        by: ["role"],
        where: { organizationId: org.id },
        _count: { role: true },
      }),
    ]);

    const counts: OrgStructureCounts = {
      totalPeople,
      activePeople,
      totalClasses,
      activeClasses,
      totalSubjects,
      totalRooms,
      totalTeachers,
      totalTimetableEntries,
      activeTimetableEntries,
      totalTimetableExceptions,
      totalClassMemberships,
      totalOrgMembers,
      peopleWithAccess,
      peopleByType: peopleByTypeRaw.map((r) => ({
        type: r.personType as string,
        count: r._count.personType,
      })),
      membersByRole: membersByRoleRaw.map((r) => ({
        role: r.role as string,
        count: r._count.role,
      })),
    };

    const setup: OrgSetupStatus = {
      orgCreated: true, // if we're here, it exists
      peopleAdded: activePeople > 0,
      classesConfigured: activeClasses > 0,
      subjectsConfigured: totalSubjects > 0,
      teachersAssigned: totalTeachers > 0,
      roomsConfigured: totalRooms > 0,
      timetableConfigured: activeTimetableEntries > 0,
      attendanceRecorded: false, // AttendanceSession/Record models not yet implemented
    };

    return {
      ok: true,
      data: {
        org: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          type: org.type as string,
          subtype: org.subtype,
          logoUrl: org.logoUrl,
          createdAt: org.createdAt,
        },
        role: role as string,
        counts,
        setup,
      },
    };
  } catch (err) {
    console.error("[fetchOrgPageData]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load organization data.",
    };
  }
}

// ─── Delete organization ───────────────────────────────────────────────────────
// Only OWNER can delete. Cascades through Prisma relations.
// Does NOT delete Better Auth Users — only the org + memberships + org data.

export type DeleteOrgResult = { ok: true } | { ok: false; error: string };

export async function deleteOrganization(
  slug: string,
  confirmName: string
): Promise<DeleteOrgResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const { org, role } = await requireOrgAdmin(session.user.id, slug);

    if (role !== "OWNER") {
      return {
        ok: false,
        error: "Only the organization owner can delete this organization.",
      };
    }

    // Require explicit name confirmation
    if (confirmName.trim() !== org.name) {
      return {
        ok: false,
        error: "Organization name does not match. Deletion cancelled.",
      };
    }

    // Prisma cascades handle: memberships, people, classes, subjects, rooms,
    // timetable entries, exceptions, class memberships, API keys, etc.
    await prisma.organization.delete({ where: { id: org.id } });

    return { ok: true };
  } catch (err) {
    console.error("[deleteOrganization]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete organization.",
    };
  }
}
