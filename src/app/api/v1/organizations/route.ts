/**
 * GET /api/v1/organizations
 *
 * Returns the organization associated with the authenticated API key.
 * An API key is scoped to exactly one organization, so this always
 * returns a single-item list for consistency with the collection pattern.
 *
 * Authentication: Bearer API key
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateApiKey,
  apiOk,
} from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      subtype: true,
      location: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          people: true,
          classes: true,
          subjects: true,
          rooms: true,
        },
      },
    },
  });

  if (!org) {
    return apiOk({ data: [], pagination: { nextCursor: null } });
  }

  return apiOk({
    data: [
      {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        subtype: org.subtype,
        location: org.location,
        stats: {
          people: org._count.people,
          classes: org._count.classes,
          subjects: org._count.subjects,
          rooms: org._count.rooms,
        },
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      },
    ],
    pagination: { nextCursor: null },
  });
}
