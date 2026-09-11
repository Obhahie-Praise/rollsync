/**
 * Shared API key authentication for /api/v1 Route Handlers.
 *
 * API keys are passed as: Authorization: Bearer rs_live_<secret>
 *
 * The raw secret is hashed (SHA-256) and compared against the stored hash.
 * The raw secret is never persisted.
 *
 * Returns the resolved organization and key record on success,
 * or a NextResponse error on failure.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ApiKeyContext {
  organizationId: string;
  orgSlug: string;
  keyId: string;
}

/** Standard JSON error response */
export function apiError(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Standard JSON success response */
export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Authenticate a request using an API key from the Authorization header.
 * Returns { context } on success, or { error: NextResponse } on failure.
 */
export async function authenticateApiKey(
  req: NextRequest
): Promise<
  | { ok: true; context: ApiKeyContext }
  | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return {
      ok: false,
      response: apiError(
        "MISSING_API_KEY",
        "Authorization header is required. Use: Authorization: Bearer <api-key>",
        401
      ),
    };
  }

  const rawSecret = match[1].trim();
  const secretHash = crypto
    .createHash("sha256")
    .update(rawSecret)
    .digest("hex");

  const key = await prisma.apiKey.findFirst({
    where: { secretHash },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      organizationId: true,
      organization: {
        select: { slug: true, id: true },
      },
    },
  });

  if (!key) {
    return {
      ok: false,
      response: apiError("INVALID_API_KEY", "Invalid API key.", 401),
    };
  }

  if (key.status === "REVOKED") {
    return {
      ok: false,
      response: apiError("API_KEY_REVOKED", "This API key has been revoked.", 401),
    };
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return {
      ok: false,
      response: apiError("API_KEY_EXPIRED", "This API key has expired.", 401),
    };
  }

  // Fire-and-forget: update lastUsedAt without blocking the response
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    ok: true,
    context: {
      organizationId: key.organizationId,
      orgSlug: key.organization.slug,
      keyId: key.id,
    },
  };
}

/**
 * Parse cursor-based pagination params from a request URL.
 * Returns { limit, cursor }.
 */
export function parsePagination(req: NextRequest): {
  limit: number;
  cursor: string | null;
} {
  const url = new URL(req.url);
  const rawLimit = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor") ?? null;

  const limit = Math.min(
    Math.max(parseInt(rawLimit ?? "50", 10) || 50, 1),
    200
  );

  return { limit, cursor };
}

/** Build a cursor pagination response envelope */
export function paginatedResponse<T extends { id: string }>(
  items: T[],
  limit: number
): { data: T[]; pagination: { nextCursor: string | null } } {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;
  return { data, pagination: { nextCursor } };
}
