/**
 * GET /api/v1/attendance/sessions/:id
 *
 * Returns a single attendance session by ID, including full record summary.
 *
 * Authentication: Bearer API key
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, apiError, apiOk } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  const { id } = await params;

  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      sessionDate: true,
      checkinAt: true,
      arrivalStatus: true,
      status: true,
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true } },
      teacherPerson: { select: { id: true, name: true } },
      timetableEntry: { select: { startTime: true, endTime: true } },
      records: {
        select: {
          id: true,
          status: true,
          person: {
            select: { id: true, name: true, orgIdentifier: true, personType: true },
          },
          recordedAt: true,
        },
        orderBy: { person: { name: "asc" } },
      },
      _count: { select: { records: true } },
    },
  });

  if (!session || session.organizationId !== organizationId) {
    return apiError("NOT_FOUND", "Attendance session not found.", 404);
  }

  const presentCount = session.records.filter((r) => r.status === "PRESENT").length;
  const absentCount = session.records.filter((r) => r.status === "ABSENT").length;

  return apiOk({
    id: session.id,
    sessionDate: session.sessionDate,
    checkinAt: session.checkinAt,
    arrivalStatus: session.arrivalStatus,
    status: session.status,
    scheduledStart: session.timetableEntry.startTime,
    scheduledEnd: session.timetableEntry.endTime,
    class: session.class,
    subject: session.subject,
    teacher: session.teacherPerson,
    summary: {
      total: session._count.records,
      present: presentCount,
      absent: absentCount,
      other: session._count.records - presentCount - absentCount,
    },
    records: session.records.map((r) => ({
      id: r.id,
      status: r.status,
      person: {
        id: r.person.id,
        name: r.person.name,
        orgIdentifier: r.person.orgIdentifier,
        type: r.person.personType,
      },
      recordedAt: r.recordedAt,
    })),
  });
}
