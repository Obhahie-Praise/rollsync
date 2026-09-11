/**
 * GET /api/v1/people
 *
 * Returns paginated list of people in the organization.
 *
 * Query params:
 *   limit         number (1–200, default 50)
 *   cursor        string (id of last item from previous page)
 *   type          STUDENT | TEACHER | STAFF | ADMINISTRATOR | DIRECTOR
 *   status        ACTIVE | INACTIVE (default: ACTIVE)
 *   classId       string — filter to members of this class
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
import type { PersonType, PersonStatus } from "@/generated/prisma/client";

const VALID_PERSON_TYPES = new Set([
  "STUDENT",
  "TEACHER",
  "STAFF",
  "ADMINISTRATOR",
  "DIRECTOR",
]);
const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE"]);

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  const url = new URL(req.url);
  const { limit, cursor } = parsePagination(req);

  const typeParam = url.searchParams.get("type")?.toUpperCase();
  const statusParam = url.searchParams.get("status")?.toUpperCase() ?? "ACTIVE";
  const classId = url.searchParams.get("classId");

  if (typeParam && !VALID_PERSON_TYPES.has(typeParam)) {
    return apiError(
      "INVALID_FILTER",
      `Invalid type. Must be one of: ${[...VALID_PERSON_TYPES].join(", ")}`,
      400
    );
  }
  if (!VALID_STATUSES.has(statusParam)) {
    return apiError(
      "INVALID_FILTER",
      `Invalid status. Must be ACTIVE or INACTIVE.`,
      400
    );
  }

  // If classId provided, verify it belongs to this org
  if (classId) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, organizationId },
      select: { id: true },
    });
    if (!cls) {
      return apiError("NOT_FOUND", "Class not found in this organization.", 404);
    }
  }

  const people = await prisma.person.findMany({
    where: {
      organizationId,
      ...(typeParam ? { personType: typeParam as PersonType } : {}),
      status: statusParam as PersonStatus,
      ...(classId
        ? { classMemberships: { some: { classId, endDate: null } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      orgIdentifier: true,
      personType: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      classMemberships: {
        where: { endDate: null },
        select: {
          class: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: [{ personType: "asc" }, { name: "asc" }],
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const { data, pagination } = paginatedResponse(people, limit);

  return apiOk({
    data: data.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      orgIdentifier: p.orgIdentifier,
      type: p.personType,
      status: p.status,
      classes: p.classMemberships.map((m) => ({
        id: m.class.id,
        name: m.class.name,
        code: m.class.code,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    pagination,
  });
}
