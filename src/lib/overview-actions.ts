"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
  return { start, end };
}

function todayDayOfWeek(): number {
  return new Date().getDay();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface OverviewClass {
  timetableEntryId: string;
  classId: string;
  className: string;
  classCode: string | null;
  subjectName: string;
  roomName: string | null;
  startTime: string;
  endTime: string;
  periodLabel: string | null;
  sessionId: string | null;
  sessionStatus: string | null;     // ACTIVE | COMPLETED | CANCELLED | null
  arrivalStatus: string | null;     // EARLY | ON_TIME | LATE | VERY_LATE | null
  checkinAt: Date | null;
}

export interface OverviewAttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number | null; // percentage 0-100, null if no data
}

// ─── Teacher overview data ────────────────────────────────────────────────────

export interface TeacherOverviewData {
  kind: "teacher";
  greeting: string;
  userName: string;
  orgName: string;
  orgSlug: string;
  orgType: string;
  teacherName: string;
  classes: OverviewClass[];
  // Setup state (used to show empty-org nudges)
  hasSetup: boolean;
}

export type FetchTeacherOverviewResult =
  | { ok: true; data: TeacherOverviewData }
  | { ok: false; error: string; code?: string };

export async function fetchTeacherOverview(
  slug: string
): Promise<FetchTeacherOverviewResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  try {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, type: true },
    });
    if (!org) return { ok: false, error: "Organization not found" };

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: org.id } },
      select: { role: true },
    });
    if (!membership) return { ok: false, error: "Not a member" };

    // Resolve teacher person
    const teacher = await prisma.person.findFirst({
      where: { organizationId: org.id, linkedUserId: session.user.id, personType: "TEACHER", status: "ACTIVE" },
      select: { id: true, name: true },
    });

    // Check if org has any setup
    const hasSetup = (await prisma.timetableEntry.count({ where: { organizationId: org.id, status: "ACTIVE" } })) > 0;

    if (!teacher) {
      return {
        ok: true,
        data: {
          kind: "teacher",
          greeting: greeting(),
          userName: session.user.name ?? session.user.email ?? "User",
          orgName: org.name,
          orgSlug: slug,
          orgType: org.type as string,
          teacherName: session.user.name ?? "",
          classes: [],
          hasSetup,
        },
      };
    }

    const todayDow = todayDayOfWeek();
    const now = new Date();
    const { start, end } = todayRange();

    // Fetch today's timetable entries for this teacher
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
          where: { exceptionDate: { gte: start, lte: end } },
          select: { exceptionType: true, substitutePersonId: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Filter to today's day, skip cancelled/substituted
    const todayEntries = entries.filter((e) => {
      const days = e.daysOfWeek.split(",").map((d) => parseInt(d.trim(), 10));
      if (!days.includes(todayDow)) return false;
      if (e.exceptions.some((ex) => ex.exceptionType === "CANCELLED")) return false;
      if (e.exceptions.some((ex) => ex.exceptionType === "SUBSTITUTED" && ex.substitutePersonId !== teacher.id)) return false;
      return true;
    });

    // Fetch existing sessions for today
    const existingSessions = await prisma.attendanceSession.findMany({
      where: { organizationId: org.id, teacherPersonId: teacher.id, sessionDate: { gte: start, lte: end } },
      select: { id: true, timetableEntryId: true, status: true, arrivalStatus: true, checkinAt: true },
    });

    const sessionMap = new Map(existingSessions.map((s) => [s.timetableEntryId, s]));

    const classes: OverviewClass[] = todayEntries.map((e) => {
      const sess = sessionMap.get(e.id) ?? null;
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
        sessionId: sess?.id ?? null,
        sessionStatus: sess?.status ?? null,
        arrivalStatus: sess?.arrivalStatus ?? null,
        checkinAt: sess?.checkinAt ?? null,
      };
    });

    return {
      ok: true,
      data: {
        kind: "teacher",
        greeting: greeting(),
        userName: session.user.name ?? session.user.email ?? "User",
        orgName: org.name,
        orgSlug: slug,
        orgType: org.type as string,
        teacherName: teacher.name,
        classes,
        hasSetup,
      },
    };
  } catch (err) {
    console.error("[fetchTeacherOverview]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load overview." };
  }
}

// ─── Admin overview data ──────────────────────────────────────────────────────

export interface AdminTodaySession {
  id: string;
  className: string;
  classCode: string | null;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  checkinAt: Date;
  arrivalStatus: string;
  status: string;
  recordCount: number;
  presentCount: number;
}

export interface AttentionItem {
  kind: "no_checkin" | "unmarked_students" | "setup_incomplete";
  label: string;
  detail: string;
}

export interface WeeklyAttendancePoint {
  label: string;   // "Mon", "Tue" etc.
  date: string;    // YYYY-MM-DD
  rate: number | null;
  present: number;
  total: number;
}

export interface AdminOverviewData {
  kind: "admin";
  greeting: string;
  userName: string;
  orgName: string;
  orgSlug: string;
  orgType: string;
  // Today's sessions
  expectedSessions: number;
  startedSessions: number;
  completedSessions: number;
  sessions: AdminTodaySession[];
  // Today's attendance snapshot
  attendanceSummary: OverviewAttendanceSummary;
  // Needs-attention items
  attentionItems: AttentionItem[];
  // Weekly trend (last 7 days)
  weeklyTrend: WeeklyAttendancePoint[];
  // Setup health
  setup: {
    peopleAdded: boolean;
    classesConfigured: boolean;
    subjectsConfigured: boolean;
    teachersAssigned: boolean;
    roomsConfigured: boolean;
    timetableConfigured: boolean;
    attendanceRecorded: boolean;
  };
  isEmpty: boolean;
}

export type FetchAdminOverviewResult =
  | { ok: true; data: AdminOverviewData }
  | { ok: false; error: string };

export async function fetchAdminOverview(
  slug: string
): Promise<FetchAdminOverviewResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  try {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, type: true },
    });
    if (!org) return { ok: false, error: "Organization not found" };

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: org.id } },
      select: { role: true },
    });
    if (!membership) return { ok: false, error: "Not a member" };

    const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
    if (!isAdmin) return { ok: false, error: "Admin access required" };

    const { start, end } = todayRange();
    const todayDow = todayDayOfWeek();
    const now = new Date();

    // Parallel fetch all data
    const [
      activePeople,
      activeClasses,
      totalSubjects,
      totalRooms,
      totalTeachers,
      activeTimetableEntries,
      todaySessions,
      todayRecordsRaw,
      allActiveEntries,
    ] = await Promise.all([
      prisma.person.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
      prisma.class.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
      prisma.subject.count({ where: { organizationId: org.id } }),
      prisma.room.count({ where: { organizationId: org.id } }),
      prisma.person.count({ where: { organizationId: org.id, personType: "TEACHER", status: "ACTIVE" } }),
      prisma.timetableEntry.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
      prisma.attendanceSession.findMany({
        where: { organizationId: org.id, sessionDate: { gte: start, lte: end } },
        include: {
          class: { select: { name: true, code: true } },
          subject: { select: { name: true } },
          teacherPerson: { select: { name: true } },
          timetableEntry: { select: { startTime: true, endTime: true } },
          _count: { select: { records: true } },
          records: { where: { status: "PRESENT" }, select: { id: true } },
        },
        orderBy: { timetableEntry: { startTime: "asc" } },
      }),
      // Today's attendance records (all statuses)
      prisma.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          organizationId: org.id,
          attendanceSession: { sessionDate: { gte: start, lte: end } },
        },
        _count: { status: true },
      }),
      // All active timetable entries to compute expected sessions
      prisma.timetableEntry.findMany({
        where: {
          organizationId: org.id,
          status: "ACTIVE",
          effectiveFrom: { lte: end },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
        },
        include: {
          exceptions: {
            where: { exceptionDate: { gte: start, lte: end } },
            select: { exceptionType: true },
          },
        },
      }),
    ]);

    // Compute expected sessions for today
    const expectedSessions = allActiveEntries.filter((e) => {
      const days = e.daysOfWeek.split(",").map((d) => parseInt(d.trim(), 10));
      if (!days.includes(todayDow)) return false;
      if (e.exceptions.some((ex) => ex.exceptionType === "CANCELLED")) return false;
      return true;
    }).length;

    // Format sessions
    const sessions: AdminTodaySession[] = todaySessions.map((s) => ({
      id: s.id,
      className: s.class.name,
      classCode: s.class.code,
      subjectName: s.subject.name,
      teacherName: s.teacherPerson.name,
      startTime: s.timetableEntry.startTime,
      endTime: s.timetableEntry.endTime,
      checkinAt: s.checkinAt,
      arrivalStatus: s.arrivalStatus as string,
      status: s.status as string,
      recordCount: s._count.records,
      presentCount: s.records.length,
    }));

    // Attendance summary
    const statusCounts = Object.fromEntries(todayRecordsRaw.map((r) => [r.status, r._count.status]));
    const present = statusCounts["PRESENT"] ?? 0;
    const absent = statusCounts["ABSENT"] ?? 0;
    const late = statusCounts["LATE"] ?? 0;
    const excused = statusCounts["EXCUSED"] ?? 0;
    const totalRecords = present + absent + late + excused;
    const attendanceSummary: OverviewAttendanceSummary = {
      present,
      absent,
      late,
      excused,
      total: totalRecords,
      rate: totalRecords > 0 ? Math.round(((present + late) / totalRecords) * 100) : null,
    };

    // Needs-attention items
    const attentionItems: AttentionItem[] = [];

    // Sessions without teacher check-in
    const notStarted = expectedSessions - todaySessions.length;
    if (notStarted > 0) {
      attentionItems.push({
        kind: "no_checkin",
        label: `${notStarted} scheduled session${notStarted !== 1 ? "s" : ""} not started`,
        detail: "Teacher check-in has not been recorded.",
      });
    }

    // Sessions with unmarked students (active sessions only)
    const sessionsWithUnmarked = todaySessions.filter((s) => {
      if (s.status === "COMPLETED") return false;
      // If a session is active but has some records, check for gap
      return s._count.records < s.records.length + (s._count.records - s.records.length);
    });
    // Simpler: active sessions where not all students are marked
    const activeSessions = todaySessions.filter((s) => s.status === "ACTIVE");
    if (activeSessions.length > 0) {
      // For active sessions, attendance may be in progress — only flag if specifically incomplete
      // We surface this simply as "sessions in progress"
    }

    // Setup issues
    if (activeTimetableEntries === 0 && activeClasses > 0) {
      attentionItems.push({
        kind: "setup_incomplete",
        label: "Timetable not configured",
        detail: "Classes exist but no timetable entries are active.",
      });
    }

    void sessionsWithUnmarked;
    void now;

    // Weekly trend (last 7 days)
    const weeklyTrend: WeeklyAttendancePoint[] = [];
    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayEnd = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));
      const dateStr = dayStart.toISOString().slice(0, 10);

      const dayRecords = await prisma.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          organizationId: org.id,
          attendanceSession: { sessionDate: { gte: dayStart, lte: dayEnd } },
        },
        _count: { status: true },
      });

      const dayCounts = Object.fromEntries(dayRecords.map((r) => [r.status, r._count.status]));
      const dayPresent = (dayCounts["PRESENT"] ?? 0) + (dayCounts["LATE"] ?? 0);
      const dayTotal = Object.values(dayCounts).reduce((a, b) => a + b, 0);

      weeklyTrend.push({
        label: DAY_LABELS[d.getDay()],
        date: dateStr,
        rate: dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : null,
        present: dayPresent,
        total: dayTotal,
      });
    }

    const hasWeeklyData = weeklyTrend.some((p) => p.total > 0);

    const setup = {
      peopleAdded: activePeople > 0,
      classesConfigured: activeClasses > 0,
      subjectsConfigured: totalSubjects > 0,
      teachersAssigned: totalTeachers > 0,
      roomsConfigured: totalRooms > 0,
      timetableConfigured: activeTimetableEntries > 0,
      attendanceRecorded: totalRecords > 0,
    };

    const isEmpty = activePeople === 0 && activeClasses === 0 && activeTimetableEntries === 0;

    return {
      ok: true,
      data: {
        kind: "admin",
        greeting: greeting(),
        userName: session.user.name ?? session.user.email ?? "User",
        orgName: org.name,
        orgSlug: slug,
        orgType: org.type as string,
        expectedSessions,
        startedSessions: todaySessions.length,
        completedSessions: todaySessions.filter((s) => s.status === "COMPLETED").length,
        sessions,
        attendanceSummary,
        attentionItems,
        weeklyTrend: hasWeeklyData ? weeklyTrend : [],
        setup,
        isEmpty,
      },
    };
  } catch (err) {
    console.error("[fetchAdminOverview]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load overview." };
  }
}
