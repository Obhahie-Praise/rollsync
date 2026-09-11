/**
 * GET  /api/v1/attendance/records
 * POST /api/v1/attendance/records
 *
 * GET — Returns paginated attendance records for the organization.
 *
 * Query params:
 *   limit         number (1–200, default 50)
 *   cursor        string
 *   sessionId     string — filter to a specific session
 *   personId      string — filter to a specific person
 *   classId       string — filter to sessions of a specific class
 *   status        PRESENT | ABSENT | LATE | EXCUSED
 *   date          YYYY-MM-DD — filter by session date
 *
 * POST — Create or update an attendance record.
 * Idempotent: if a record already exists for (sessionId, personId), it is updated.
 *
 * Body:
 * {
 *   sessionId: string,
 *   personId:  string,
 *   status:    "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
 *   note?:     string
 * }
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
import type { AttendanceStatus } from "@/generated/prisma/client";

const VALID_STATUSES = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  const url = new URL(req.url);
  const { limit, cursor } = parsePagination(req);

  const sessionId = url.searchParams.get("sessionId");
  const personId = url.searchParams.get("personId");
  const classId = url.searchParams.get("classId");
  const statusParam = url.searchParams.get("status")?.toUpperCase();
  const dateParam = url.searchParams.get("date");

  if (statusParam && !VALID_STATUSES.has(statusParam)) {
    return apiError(
      "INVALID_FILTER",
      `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}`,
      400
    );
  }

  // Build session sub-filter
  type SessionWhere = {
    organizationId: string;
    id?: string;
    classId?: string;
    sessionDate?: { gte: Date; lte: Date };
  };

  const sessionWhere: SessionWhere = { organizationId };
  if (sessionId) sessionWhere.id = sessionId;
  if (classId) sessionWhere.classId = classId;
  if (dateParam) {
    const [y, mo, d] = dateParam.split("-").map(Number);
    if (isNaN(y) || isNaN(mo) || isNaN(d)) {
      return apiError("INVALID_FILTER", "Invalid date format. Use YYYY-MM-DD.", 400);
    }
    sessionWhere.sessionDate = {
      gte: new Date(Date.UTC(y, mo - 1, d, 0, 0, 0)),
      lte: new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999)),
    };
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      ...(personId ? { personId } : {}),
      ...(statusParam ? { status: statusParam as AttendanceStatus } : {}),
      attendanceSession: sessionWhere,
    },
    select: {
      id: true,
      status: true,
      note: true,
      recordedAt: true,
      createdAt: true,
      updatedAt: true,
      person: {
        select: {
          id: true,
          name: true,
          orgIdentifier: true,
          personType: true,
        },
      },
      attendanceSession: {
        select: {
          id: true,
          sessionDate: true,
          class: { select: { id: true, name: true, code: true } },
          subject: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { attendanceSession: { sessionDate: "desc" } },
      { person: { name: "asc" } },
    ],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const { data, pagination } = paginatedResponse(records, limit);

  return apiOk({
    data: data.map((r) => ({
      id: r.id,
      status: r.status,
      note: r.note,
      recordedAt: r.recordedAt,
      person: {
        id: r.person.id,
        name: r.person.name,
        orgIdentifier: r.person.orgIdentifier,
        type: r.person.personType,
      },
      session: {
        id: r.attendanceSession.id,
        sessionDate: r.attendanceSession.sessionDate,
        class: r.attendanceSession.class,
        subject: r.attendanceSession.subject,
      },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    pagination,
  });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Request body must be valid JSON.", 400);
  }

  if (!body || typeof body !== "object") {
    return apiError("INVALID_BODY", "Request body must be an object.", 400);
  }

  const { sessionId, personId, status, note } = body as Record<string, unknown>;

  if (!sessionId || typeof sessionId !== "string") {
    return apiError("VALIDATION_ERROR", "sessionId is required.", 422);
  }
  if (!personId || typeof personId !== "string") {
    return apiError("VALIDATION_ERROR", "personId is required.", 422);
  }
  if (!status || typeof status !== "string" || !VALID_STATUSES.has(status.toUpperCase())) {
    return apiError(
      "VALIDATION_ERROR",
      `status is required. Must be one of: ${[...VALID_STATUSES].join(", ")}`,
      422
    );
  }
  if (note !== undefined && typeof note !== "string") {
    return apiError("VALIDATION_ERROR", "note must be a string.", 422);
  }

  const normalizedStatus = status.toUpperCase() as AttendanceStatus;

  // Verify the session belongs to this organization
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    select: { id: true, organizationId: true, classId: true, status: true },
  });

  if (!session || session.organizationId !== organizationId) {
    return apiError("NOT_FOUND", "Attendance session not found.", 404);
  }

  if (session.status === "CANCELLED") {
    return apiError(
      "SESSION_CANCELLED",
      "Cannot record attendance for a cancelled session.",
      409
    );
  }

  // Verify the person belongs to this organization
  const person = await prisma.person.findFirst({
    where: { id: personId, organizationId },
    select: { id: true },
  });

  if (!person) {
    return apiError("NOT_FOUND", "Person not found in this organization.", 404);
  }

  // Verify the person is a member of the session's class
  const membership = await prisma.classMembership.findFirst({
    where: { classId: session.classId, personId, endDate: null },
    select: { id: true },
  });

  if (!membership) {
    return apiError(
      "NOT_CLASS_MEMBER",
      "This person is not a current member of the session's class.",
      409
    );
  }

  // Idempotent upsert
  const record = await prisma.attendanceRecord.upsert({
    where: {
      attendanceSessionId_personId: {
        attendanceSessionId: sessionId,
        personId,
      },
    },
    update: {
      status: normalizedStatus,
      note: typeof note === "string" ? note : undefined,
      recordedAt: new Date(),
    },
    create: {
      organizationId,
      attendanceSessionId: sessionId,
      personId,
      status: normalizedStatus,
      note: typeof note === "string" ? note : null,
      recordedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      note: true,
      recordedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiOk(
    {
      id: record.id,
      sessionId,
      personId,
      status: record.status,
      note: record.note,
      recordedAt: record.recordedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    201
  );
}
