"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  ArrivalStatus,
  SessionStatus,
  AttendanceStatus,
} from "@/generated/prisma/client";

// ─── Arrival threshold constants ──────────────────────────────────────────────
// Fixed sensible defaults. No per-org threshold config exists in the schema yet.
// EARLY  : more than 5 min before scheduled start
// ON_TIME: within 5 min before OR up to 10 min after start
// LATE   : 10–30 min after start
// VERY_LATE: > 30 min after start

const EARLY_MINUTES = 5;
const LATE_MINUTES = 10;
const VERY_LATE_MINUTES = 30;

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function getAuthSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

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

  return { org, role: membership.role as string };
}

/** Get today's start/end as UTC Date range covering the calendar day */
function todayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  );
  return { start, end };
}

/** ISO day-of-week: 0=Sun … 6=Sat */
function todayDayOfWeek(): number {
  return new Date().getDay();
}

/** Parse "HH:MM" into minutes since midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Determine ArrivalStatus from scheduled start time and current time */
function computeArrivalStatus(scheduledStart: string): ArrivalStatus {
  const nowMinutes =
    new Date().getHours() * 60 + new Date().getMinutes();
  const startMinutes = parseTime(scheduledStart);
  const diff = nowMinutes - startMinutes; // negative = arrived early

  if (diff < -EARLY_MINUTES) return "EARLY";
  if (diff <= LATE_MINUTES) return "ON_TIME";
  if (diff <= VERY_LATE_MINUTES) return "LATE";
  return "VERY_LATE";
}

// ─── Types exported to client components ──────────────────────────────────────

export interface TodayClassItem {
  timetableEntryId: string;
  classId: string;
  className: string;
  classCode: string | null;
  subjectName: string;
  roomName: string | null;
  startTime: string;
  endTime: string;
  periodLabel: string | null;
  /** Active session if teacher already signed in */
  session: AttendanceSessionSummary | null;
}

export interface AttendanceSessionSummary {
  id: string;
  checkinAt: Date;
  arrivalStatus: ArrivalStatus;
  status: SessionStatus;
  className: string;
  classCode: string | null;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  sessionDate: Date;
  recordCount: number;
  presentCount: number;
  absentCount: number;
}

export interface StudentRollItem {
  personId: string;
  name: string;
  orgIdentifier: string | null;
  status: AttendanceStatus | null; // null = not yet marked
}

// ─── 1. Fetch today's classes for the authenticated teacher ───────────────────

export type FetchTodayClassesResult =
  | {
      ok: true;
      teacherPersonId: string;
      teacherName: string;
      classes: TodayClassItem[];
    }
  | { ok: false; error: string; code?: string };

export async function fetchTodayClasses(
  slug: string
): Promise<FetchTodayClassesResult> {
  let session;
  try {
    session = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated", code: "UNAUTHENTICATED" };
  }

  try {
    const { org } = await requireOrgMember(session.user.id, slug);

    // Resolve linked Person
    const teacher = await prisma.person.findFirst({
      where: {
        organizationId: org.id,
        linkedUserId: session.user.id,
        personType: "TEACHER",
        status: "ACTIVE",
      },
      select: { id: true, name: true },
    });

    if (!teacher) {
      return {
        ok: false,
        error:
          "No teacher profile linked to your account in this organization.",
        code: "NO_TEACHER_PROFILE",
      };
    }

    const todayDow = todayDayOfWeek();
    const now = new Date();

    // Find all active timetable entries assigned to this teacher today
    const entries = await prisma.timetableEntry.findMany({
      where: {
        organizationId: org.id,
        teacherPersonId: teacher.id,
        status: "ACTIVE",
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { name: true } },
        room: { select: { name: true } },
        exceptions: {
          where: {
            exceptionDate: {
              gte: todayRange().start,
              lte: todayRange().end,
            },
          },
          select: { exceptionType: true, substitutePersonId: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Filter to entries that include today's day-of-week
    const todayEntries = entries.filter((e) => {
      const days = e.daysOfWeek.split(",").map((d) => parseInt(d.trim(), 10));
      if (!days.includes(todayDow)) return false;
      // Skip if cancelled today
      const cancelled = e.exceptions.some(
        (ex) => ex.exceptionType === "CANCELLED"
      );
      if (cancelled) return false;
      // Skip if substituted by someone else today (teacher is not covering)
      const substituted = e.exceptions.some(
        (ex) =>
          ex.exceptionType === "SUBSTITUTED" &&
          ex.substitutePersonId !== teacher.id
      );
      if (substituted) return false;
      return true;
    });

    // Fetch existing sessions for today
    const { start, end } = todayRange();
    const existingSessions = await prisma.attendanceSession.findMany({
      where: {
        organizationId: org.id,
        teacherPersonId: teacher.id,
        sessionDate: { gte: start, lte: end },
      },
      include: {
        class: { select: { name: true, code: true } },
        subject: { select: { name: true } },
        teacherPerson: { select: { name: true } },
        _count: { select: { records: true } },
        records: {
          where: { status: "PRESENT" },
          select: { id: true },
        },
      },
    });

    const sessionMap = new Map(
      existingSessions.map((s) => [s.timetableEntryId, s])
    );

    const classes: TodayClassItem[] = todayEntries.map((e) => {
      const sess = sessionMap.get(e.id) ?? null;
      const absentCount = sess
        ? sess._count.records - sess.records.length
        : 0;

      return {
        timetableEntryId: e.id,
        classId: e.class.id,
        className: e.class.name,
        classCode: e.class.code,
        subjectName: e.subject.name,
        roomName: e.room?.name ?? null,
        startTime: e.startTime,
        endTime: e.endTime,
        periodLabel: e.periodLabel,
        session: sess
          ? {
              id: sess.id,
              checkinAt: sess.checkinAt,
              arrivalStatus: sess.arrivalStatus,
              status: sess.status,
              className: sess.class.name,
              classCode: sess.class.code,
              subjectName: sess.subject.name,
              teacherName: sess.teacherPerson.name,
              startTime: e.startTime,
              endTime: e.endTime,
              sessionDate: sess.sessionDate,
              recordCount: sess._count.records,
              presentCount: sess.records.length,
              absentCount,
            }
          : null,
      };
    });

    return {
      ok: true,
      teacherPersonId: teacher.id,
      teacherName: teacher.name,
      classes,
    };
  } catch (err) {
    console.error("[fetchTodayClasses]", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to load today's classes.",
    };
  }
}

// ─── 2. Sign in: validate class QR and create/get session ─────────────────────

export interface SignInInput {
  slug: string;
  /** Class ID decoded from the QR code */
  scannedClassId: string;
}

export type SignInResult =
  | { ok: true; session: AttendanceSessionSummary }
  | { ok: false; error: string; code?: string };

export async function teacherSignIn(
  input: SignInInput
): Promise<SignInResult> {
  let authSession;
  try {
    authSession = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated", code: "UNAUTHENTICATED" };
  }

  try {
    const { org } = await requireOrgMember(authSession.user.id, input.slug);

    // A. Verify the class belongs to this org
    const cls = await prisma.class.findFirst({
      where: {
        id: input.scannedClassId,
        organizationId: org.id,
        status: "ACTIVE",
      },
      select: { id: true, name: true, code: true },
    });
    if (!cls) {
      return {
        ok: false,
        error: "This class does not exist in your organization.",
        code: "INVALID_CLASS",
      };
    }

    // B. Resolve teacher person
    const teacher = await prisma.person.findFirst({
      where: {
        organizationId: org.id,
        linkedUserId: authSession.user.id,
        personType: "TEACHER",
        status: "ACTIVE",
      },
      select: { id: true, name: true },
    });
    if (!teacher) {
      return {
        ok: false,
        error: "No teacher profile linked to your account.",
        code: "NO_TEACHER_PROFILE",
      };
    }

    // C. Find the timetable entry for this teacher + class today
    const todayDow = todayDayOfWeek();
    const now = new Date();

    const entries = await prisma.timetableEntry.findMany({
      where: {
        organizationId: org.id,
        teacherPersonId: teacher.id,
        classId: cls.id,
        status: "ACTIVE",
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      include: {
        subject: { select: { id: true, name: true } },
        exceptions: {
          where: {
            exceptionDate: {
              gte: todayRange().start,
              lte: todayRange().end,
            },
          },
          select: { exceptionType: true },
        },
      },
    });

    // Filter to today's day and not cancelled
    const validEntries = entries.filter((e) => {
      const days = e.daysOfWeek.split(",").map((d) => parseInt(d.trim(), 10));
      if (!days.includes(todayDow)) return false;
      if (e.exceptions.some((ex) => ex.exceptionType === "CANCELLED"))
        return false;
      return true;
    });

    if (validEntries.length === 0) {
      // Check if this class is on the timetable at all for this teacher
      const assignedAtAll = await prisma.timetableEntry.count({
        where: {
          organizationId: org.id,
          teacherPersonId: teacher.id,
          classId: cls.id,
          status: "ACTIVE",
        },
      });
      if (assignedAtAll === 0) {
        return {
          ok: false,
          error: "This class is not assigned to you.",
          code: "NOT_ASSIGNED",
        };
      }
      return {
        ok: false,
        error: "This class is not on your timetable today.",
        code: "NOT_SCHEDULED_TODAY",
      };
    }

    // Use the first matching entry (multiple same-day slots of same class are unusual)
    const entry = validEntries[0];

    // D. Idempotent upsert — prevent duplicate sessions
    const { start, end } = todayRange();
    const todayDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    const existing = await prisma.attendanceSession.findUnique({
      where: {
        timetableEntryId_sessionDate: {
          timetableEntryId: entry.id,
          sessionDate: todayDate,
        },
      },
      include: {
        class: { select: { name: true, code: true } },
        subject: { select: { name: true } },
        teacherPerson: { select: { name: true } },
        _count: { select: { records: true } },
        records: { where: { status: "PRESENT" }, select: { id: true } },
      },
    });

    if (existing) {
      return {
        ok: true,
        session: {
          id: existing.id,
          checkinAt: existing.checkinAt,
          arrivalStatus: existing.arrivalStatus,
          status: existing.status,
          className: existing.class.name,
          classCode: existing.class.code,
          subjectName: existing.subject.name,
          teacherName: existing.teacherPerson.name,
          startTime: entry.startTime,
          endTime: entry.endTime,
          sessionDate: existing.sessionDate,
          recordCount: existing._count.records,
          presentCount: existing.records.length,
          absentCount: existing._count.records - existing.records.length,
        },
      };
    }

    // E. Server-computed arrival status — never trust client timestamp
    const arrivalStatus = computeArrivalStatus(entry.startTime);

    const newSession = await prisma.attendanceSession.create({
      data: {
        organizationId: org.id,
        timetableEntryId: entry.id,
        teacherPersonId: teacher.id,
        classId: cls.id,
        subjectId: entry.subjectId,
        sessionDate: todayDate,
        arrivalStatus,
        status: "ACTIVE",
      },
      include: {
        class: { select: { name: true, code: true } },
        subject: { select: { name: true } },
        teacherPerson: { select: { name: true } },
        _count: { select: { records: true } },
        records: { where: { status: "PRESENT" }, select: { id: true } },
      },
    });

    // Suppress unused variable warning
    void start; void end;

    return {
      ok: true,
      session: {
        id: newSession.id,
        checkinAt: newSession.checkinAt,
        arrivalStatus: newSession.arrivalStatus,
        status: newSession.status,
        className: newSession.class.name,
        classCode: newSession.class.code,
        subjectName: newSession.subject.name,
        teacherName: newSession.teacherPerson.name,
        startTime: entry.startTime,
        endTime: entry.endTime,
        sessionDate: newSession.sessionDate,
        recordCount: 0,
        presentCount: 0,
        absentCount: 0,
      },
    };
  } catch (err) {
    console.error("[teacherSignIn]", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Sign-in failed. Please try again.",
    };
  }
}

// ─── 3. Fetch session + roll call for a teacher ───────────────────────────────

export interface FetchSessionRollInput {
  slug: string;
  sessionId: string;
}

export type FetchSessionRollResult =
  | {
      ok: true;
      session: AttendanceSessionSummary;
      students: StudentRollItem[];
    }
  | { ok: false; error: string };

export async function fetchSessionRoll(
  input: FetchSessionRollInput
): Promise<FetchSessionRollResult> {
  let authSession;
  try {
    authSession = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const { org, role } = await requireOrgMember(authSession.user.id, input.slug);

    const sess = await prisma.attendanceSession.findUnique({
      where: { id: input.sessionId },
      include: {
        class: { select: { name: true, code: true } },
        subject: { select: { name: true } },
        teacherPerson: { select: { name: true, linkedUserId: true } },
        timetableEntry: { select: { startTime: true, endTime: true } },
        records: {
          select: { personId: true, status: true },
        },
        _count: { select: { records: true } },
      },
    });

    if (!sess) return { ok: false, error: "Session not found." };
    if (sess.organizationId !== org.id)
      return { ok: false, error: "Session not found." };

    const isAdmin = role === "OWNER" || role === "ADMIN";
    const isTeacherOfSession =
      sess.teacherPerson.linkedUserId === authSession.user.id;

    if (!isAdmin && !isTeacherOfSession) {
      return {
        ok: false,
        error: "You are not authorized to view this session.",
      };
    }

    // Get current students for this class (active memberships)
    const members = await prisma.classMembership.findMany({
      where: { classId: sess.classId, endDate: null },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            orgIdentifier: true,
            status: true,
            personType: true,
          },
        },
      },
      orderBy: { person: { name: "asc" } },
    });

    const recordMap = new Map(
      sess.records.map((r) => [r.personId, r.status])
    );

    const students: StudentRollItem[] = members
      .filter(
        (m) =>
          m.person.status === "ACTIVE" && m.person.personType === "STUDENT"
      )
      .map((m) => ({
        personId: m.person.id,
        name: m.person.name,
        orgIdentifier: m.person.orgIdentifier,
        status: recordMap.get(m.person.id) ?? null,
      }));

    const presentCount = sess.records.filter((r) => r.status === "PRESENT").length;

    return {
      ok: true,
      session: {
        id: sess.id,
        checkinAt: sess.checkinAt,
        arrivalStatus: sess.arrivalStatus,
        status: sess.status,
        className: sess.class.name,
        classCode: sess.class.code,
        subjectName: sess.subject.name,
        teacherName: sess.teacherPerson.name,
        startTime: sess.timetableEntry.startTime,
        endTime: sess.timetableEntry.endTime,
        sessionDate: sess.sessionDate,
        recordCount: sess._count.records,
        presentCount,
        absentCount: sess._count.records - presentCount,
      },
      students,
    };
  } catch (err) {
    console.error("[fetchSessionRoll]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load session.",
    };
  }
}

// ─── 4. Save roll call (batch upsert) ─────────────────────────────────────────

export interface SaveRollCallInput {
  slug: string;
  sessionId: string;
  records: { personId: string; status: AttendanceStatus }[];
}

export type SaveRollCallResult =
  | { ok: true; saved: number }
  | { ok: false; error: string };

export async function saveRollCall(
  input: SaveRollCallInput
): Promise<SaveRollCallResult> {
  let authSession;
  try {
    authSession = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const { org, role } = await requireOrgMember(authSession.user.id, input.slug);

    // Verify session belongs to org
    const sess = await prisma.attendanceSession.findUnique({
      where: { id: input.sessionId },
      include: {
        teacherPerson: { select: { linkedUserId: true } },
      },
    });
    if (!sess || sess.organizationId !== org.id) {
      return { ok: false, error: "Session not found." };
    }

    const isAdmin = role === "OWNER" || role === "ADMIN";
    const isTeacher = sess.teacherPerson.linkedUserId === authSession.user.id;
    if (!isAdmin && !isTeacher) {
      return { ok: false, error: "Not authorized to save this roll call." };
    }

    // Verify all personIds are actual class members of this session's class
    const validMembers = await prisma.classMembership.findMany({
      where: { classId: sess.classId, endDate: null },
      select: { personId: true },
    });
    const validSet = new Set(validMembers.map((m) => m.personId));

    const validRecords = input.records.filter((r) => validSet.has(r.personId));

    if (validRecords.length === 0) {
      return { ok: true, saved: 0 };
    }

    // Batch upsert — idempotent
    await prisma.$transaction(
      validRecords.map((r) =>
        prisma.attendanceRecord.upsert({
          where: {
            attendanceSessionId_personId: {
              attendanceSessionId: input.sessionId,
              personId: r.personId,
            },
          },
          update: { status: r.status, recordedAt: new Date() },
          create: {
            organizationId: org.id,
            attendanceSessionId: input.sessionId,
            personId: r.personId,
            status: r.status,
            recordedAt: new Date(),
          },
        })
      )
    );

    // Mark session as COMPLETED if all students have been marked
    const totalStudents = validSet.size;
    const markedCount = await prisma.attendanceRecord.count({
      where: { attendanceSessionId: input.sessionId },
    });

    if (markedCount >= totalStudents && sess.status === "ACTIVE") {
      await prisma.attendanceSession.update({
        where: { id: input.sessionId },
        data: { status: "COMPLETED" },
      });
    }

    return { ok: true, saved: validRecords.length };
  } catch (err) {
    console.error("[saveRollCall]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save roll call.",
    };
  }
}

// ─── 5. Admin: fetch org-wide sessions for today ──────────────────────────────

export interface AdminSessionItem {
  id: string;
  className: string;
  classCode: string | null;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  checkinAt: Date;
  arrivalStatus: ArrivalStatus;
  status: SessionStatus;
  sessionDate: Date;
  recordCount: number;
  presentCount: number;
}

export interface AdminSessionsOverview {
  expectedSessions: number;
  startedSessions: number;
  completedSessions: number;
  sessions: AdminSessionItem[];
}

export type FetchAdminSessionsResult =
  | { ok: true; data: AdminSessionsOverview }
  | { ok: false; error: string };

export async function fetchAdminSessions(
  slug: string,
  dateKey?: string // YYYY-MM-DD, defaults to today
): Promise<FetchAdminSessionsResult> {
  let authSession;
  try {
    authSession = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const { org, role } = await requireOrgMember(authSession.user.id, slug);
    const isAdmin = role === "OWNER" || role === "ADMIN";
    if (!isAdmin) {
      return { ok: false, error: "Administrator access required." };
    }

    // Determine date range
    let rangeStart: Date;
    let rangeEnd: Date;

    if (dateKey) {
      const [y, mo, d] = dateKey.split("-").map(Number);
      rangeStart = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
      rangeEnd = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
    } else {
      const r = todayRange();
      rangeStart = r.start;
      rangeEnd = r.end;
    }

    const targetDate = rangeStart;
    const targetDow = targetDate.getDay();

    // Count expected sessions (timetable entries scheduled for that day)
    const allEntries = await prisma.timetableEntry.findMany({
      where: {
        organizationId: org.id,
        status: "ACTIVE",
        effectiveFrom: { lte: rangeEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: rangeStart } }],
      },
      include: {
        exceptions: {
          where: { exceptionDate: { gte: rangeStart, lte: rangeEnd } },
          select: { exceptionType: true },
        },
      },
    });

    const expectedEntries = allEntries.filter((e) => {
      const days = e.daysOfWeek.split(",").map((d) => parseInt(d.trim(), 10));
      if (!days.includes(targetDow)) return false;
      if (e.exceptions.some((ex) => ex.exceptionType === "CANCELLED"))
        return false;
      return true;
    });

    // Fetch actual sessions
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        organizationId: org.id,
        sessionDate: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        class: { select: { name: true, code: true } },
        subject: { select: { name: true } },
        teacherPerson: { select: { name: true } },
        timetableEntry: { select: { startTime: true, endTime: true } },
        _count: { select: { records: true } },
        records: { where: { status: "PRESENT" }, select: { id: true } },
      },
      orderBy: { timetableEntry: { startTime: "asc" } },
    });

    const sessionItems: AdminSessionItem[] = sessions.map((s) => ({
      id: s.id,
      className: s.class.name,
      classCode: s.class.code,
      subjectName: s.subject.name,
      teacherName: s.teacherPerson.name,
      startTime: s.timetableEntry.startTime,
      endTime: s.timetableEntry.endTime,
      checkinAt: s.checkinAt,
      arrivalStatus: s.arrivalStatus,
      status: s.status,
      sessionDate: s.sessionDate,
      recordCount: s._count.records,
      presentCount: s.records.length,
    }));

    return {
      ok: true,
      data: {
        expectedSessions: expectedEntries.length,
        startedSessions: sessions.length,
        completedSessions: sessions.filter((s) => s.status === "COMPLETED")
          .length,
        sessions: sessionItems,
      },
    };
  } catch (err) {
    console.error("[fetchAdminSessions]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load sessions.",
    };
  }
}

// ─── 6. Admin: fetch attendance records with filtering ────────────────────────

export interface AdminRecordItem {
  sessionId: string;
  sessionDate: Date;
  className: string;
  classCode: string | null;
  subjectName: string;
  teacherName: string;
  personName: string;
  orgIdentifier: string | null;
  personType: string;
  status: AttendanceStatus;
  recordedAt: Date;
}

export interface FetchAdminRecordsInput {
  slug: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  status?: string | null;
}

export type FetchAdminRecordsResult =
  | { ok: true; records: AdminRecordItem[]; total: number }
  | { ok: false; error: string };

export async function fetchAdminRecords(
  input: FetchAdminRecordsInput
): Promise<FetchAdminRecordsResult> {
  let authSession;
  try {
    authSession = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const { org, role } = await requireOrgMember(authSession.user.id, input.slug);
    const isAdmin = role === "OWNER" || role === "ADMIN";
    if (!isAdmin) {
      return { ok: false, error: "Administrator access required." };
    }

    // Build where for attendance sessions
    const sessionWhere: {
      organizationId: string;
      classId?: string;
      subjectId?: string;
      sessionDate?: { gte?: Date; lte?: Date };
    } = { organizationId: org.id };

    if (input.classId && input.classId !== "ALL") {
      sessionWhere.classId = input.classId;
    }
    if (input.subjectId && input.subjectId !== "ALL") {
      sessionWhere.subjectId = input.subjectId;
    }
    if (input.dateFrom || input.dateTo) {
      sessionWhere.sessionDate = {};
      if (input.dateFrom) sessionWhere.sessionDate.gte = new Date(input.dateFrom);
      if (input.dateTo) sessionWhere.sessionDate.lte = new Date(input.dateTo);
    }

    const statusFilter =
      input.status && input.status !== "ALL"
        ? (input.status as AttendanceStatus)
        : undefined;

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          organizationId: org.id,
          attendanceSession: sessionWhere,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        include: {
          attendanceSession: {
            include: {
              class: { select: { name: true, code: true } },
              subject: { select: { name: true } },
              teacherPerson: { select: { name: true } },
              timetableEntry: { select: { startTime: true } },
            },
          },
          person: {
            select: { name: true, orgIdentifier: true, personType: true },
          },
        },
        orderBy: [
          { attendanceSession: { sessionDate: "desc" } },
          { person: { name: "asc" } },
        ],
        take: 250,
      }),
      prisma.attendanceRecord.count({
        where: {
          organizationId: org.id,
          attendanceSession: sessionWhere,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      }),
    ]);

    return {
      ok: true,
      total,
      records: records.map((r) => ({
        sessionId: r.attendanceSessionId,
        sessionDate: r.attendanceSession.sessionDate,
        className: r.attendanceSession.class.name,
        classCode: r.attendanceSession.class.code,
        subjectName: r.attendanceSession.subject.name,
        teacherName: r.attendanceSession.teacherPerson.name,
        personName: r.person.name,
        orgIdentifier: r.person.orgIdentifier,
        personType: r.person.personType as string,
        status: r.status,
        recordedAt: r.recordedAt,
      })),
    };
  } catch (err) {
    console.error("[fetchAdminRecords]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load records.",
    };
  }
}

// ─── 7. Re-fetch a single session summary (for polling after sign-in) ─────────

export async function fetchSessionSummary(
  slug: string,
  sessionId: string
): Promise<{ ok: true; session: AttendanceSessionSummary } | { ok: false; error: string }> {
  let authSession;
  try {
    authSession = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const { org } = await requireOrgMember(authSession.user.id, slug);

    const sess = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        class: { select: { name: true, code: true } },
        subject: { select: { name: true } },
        teacherPerson: { select: { name: true } },
        timetableEntry: { select: { startTime: true, endTime: true } },
        _count: { select: { records: true } },
        records: { where: { status: "PRESENT" }, select: { id: true } },
      },
    });

    if (!sess || sess.organizationId !== org.id) {
      return { ok: false, error: "Session not found." };
    }

    const presentCount = sess.records.length;

    return {
      ok: true,
      session: {
        id: sess.id,
        checkinAt: sess.checkinAt,
        arrivalStatus: sess.arrivalStatus,
        status: sess.status,
        className: sess.class.name,
        classCode: sess.class.code,
        subjectName: sess.subject.name,
        teacherName: sess.teacherPerson.name,
        startTime: sess.timetableEntry.startTime,
        endTime: sess.timetableEntry.endTime,
        sessionDate: sess.sessionDate,
        recordCount: sess._count.records,
        presentCount,
        absentCount: sess._count.records - presentCount,
      },
    };
  } catch (err) {
    console.error("[fetchSessionSummary]", err);
    return { ok: false, error: "Failed to load session." };
  }
}


// ─── Teacher context helper ───────────────────────────────────────────────────
// Resolves the full teacher identity chain for an authenticated user in an org.
// Used by attendance session creation and any other route that needs to verify
// the teacher identity server-side.
//
// Chain: Better Auth session → userId → org membership → linked Person (TEACHER)
//
// Returns the teacher Person + org, or an error with a code so callers can
// respond appropriately.

export interface TeacherContext {
  userId: string;
  org: { id: string; slug: string; name: string };
  teacher: {
    id: string;
    name: string;
    orgIdentifier: string | null;
    email: string | null;
  };
  role: string;
}

export type ResolveTeacherContextResult =
  | { ok: true; context: TeacherContext }
  | { ok: false; error: string; code: string };

/**
 * Resolves the teacher identity chain for the currently authenticated user
 * in the organization identified by `slug`.
 *
 * Does NOT trust any client-supplied teacher/person ID.
 */
export async function resolveTeacherContext(
  slug: string
): Promise<ResolveTeacherContextResult> {
  let authSession;
  try {
    authSession = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated", code: "UNAUTHENTICATED" };
  }

  try {
    const { org, role } = await requireOrgMember(authSession.user.id, slug);

    const teacher = await prisma.person.findFirst({
      where: {
        organizationId: org.id,
        linkedUserId: authSession.user.id,
        personType: "TEACHER",
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        orgIdentifier: true,
        email: true,
      },
    });

    if (!teacher) {
      return {
        ok: false,
        error: "No active teacher profile linked to your account in this organization.",
        code: "NO_TEACHER_PROFILE",
      };
    }

    return {
      ok: true,
      context: {
        userId: authSession.user.id,
        org,
        teacher,
        role,
      },
    };
  } catch (err) {
    console.error("[resolveTeacherContext]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to resolve teacher context.",
      code: "ERROR",
    };
  }
}


// ─── 8. Complete session ───────────────────────────────────────────────────────

export type CompleteSessionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function completeSession(
  slug: string,
  sessionId: string
): Promise<CompleteSessionResult> {
  let authSession;
  try {
    authSession = await getAuthSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const { org, role } = await requireOrgMember(authSession.user.id, slug);

    const sess = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { teacherPerson: { select: { linkedUserId: true } } },
    });
    if (!sess || sess.organizationId !== org.id)
      return { ok: false, error: "Session not found." };

    const isAdmin = role === "OWNER" || role === "ADMIN";
    const isTeacher = sess.teacherPerson.linkedUserId === authSession.user.id;
    if (!isAdmin && !isTeacher)
      return { ok: false, error: "Not authorized." };

    if (sess.status === "COMPLETED") return { ok: true }; // idempotent

    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    });

    return { ok: true };
  } catch (err) {
    console.error("[completeSession]", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to complete session.",
    };
  }
}



