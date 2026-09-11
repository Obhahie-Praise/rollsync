/**
 * GET /api/v1/attendance/sessions
 *
 * Returns paginated list of attendance sessions for the organization.
 *
 * Query params:
 *   limit         number (1–200, default 50)
 *   cursor        string
 *   date          YYYY-MM-DD — filter to a specific calendar date
 *   classId       string
 *   status        ACTIVE | COMPLETED | CANCELLED
 *
 * Authentication: Bearer API key
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateApiKey,
  apiError,
  apiOk,
  parsePagination,
  paginatedResponse,
} from "@/lib/api-auth";
import type { SessionStatus } from "@/generated/prisma/client";

const VALID_STATUSES = new Set(["ACTIVE", "COMPLETED", "CANCELLED"]);

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  const url = new URL(req.url);
  const { limit, cursor } = parsePagination(req);

  const dateParam = url.searchParams.get("date");
  const classId = url.searchParams.get("classId");
  const statusParam = url.searchParams.get("status")?.toUpperCase();

  if (statusParam && !VALID_STATUSES.has(statusParam)) {
    return apiError(
      "INVALID_FILTER",
      `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}`,
      400
    );
  }

  // Parse date filter
  let dateFilter:
    | { gte: Date; lte: Date }
    | undefined;

  if (dateParam) {
    const parsed = new Date(dateParam);
    if (isNaN(parsed.getTime())) {
      return apiError("INVALID_FILTER", "Invalid date format. Use YYYY-MM-DD.", 400);
    }
    const [y, mo, d] = dateParam.split("-").map(Number);
    dateFilter = {
      gte: new Date(Date.UTC(y, mo - 1, d, 0, 0, 0)),
      lte: new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999)),
    };
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      organizationId,
      ...(classId ? { classId } : {}),
      ...(statusParam ? { status: statusParam as SessionStatus } : {}),
      ...(dateFilter ? { sessionDate: dateFilter } : {}),
    },
    select: {
      id: true,
      sessionDate: true,
      checkinAt: true,
      arrivalStatus: true,
      status: true,
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true } },
      teacherPerson: { select: { id: true, name: true } },
      timetableEntry: { select: { startTime: true, endTime: true } },
      _count: { select: { records: true } },
    },
    orderBy: [{ sessionDate: "desc" }, { checkinAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const { data, pagination } = paginatedResponse(sessions, limit);

  return apiOk({
    data: data.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate,
      checkinAt: s.checkinAt,
      arrivalStatus: s.arrivalStatus,
      status: s.status,
      scheduledStart: s.timetableEntry.startTime,
      scheduledEnd: s.timetableEntry.endTime,
      class: s.class,
      subject: s.subject,
      teacher: s.teacherPerson,
      recordCount: s._count.records,
    })),
    pagination,
  });
}
