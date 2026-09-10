"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiKeyListItem {
  id: string;
  name: string;
  /** Safe display prefix, e.g. "rs_live_ab12cd34" — never the full secret */
  prefix: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}

export type ListApiKeysResult =
  | { ok: true; keys: ApiKeyListItem[] }
  | { ok: false; error: string };

export interface CreateApiKeyInput {
  slug: string;
  name: string;
  /** ISO date string or null for no expiry */
  expiresAt?: string | null;
}

export type CreateApiKeyResult =
  | { ok: true; key: ApiKeyListItem; rawSecret: string }
  | { ok: false; error: string; field?: "name" };

export type RevokeApiKeyResult =
  | { ok: true }
  | { ok: false; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verify the user is an OWNER or ADMIN of the organization with the given slug.
 */
async function requireOrgAdmin(userId: string, slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!org) throw new Error("Organization not found");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership) throw new Error("Not a member of this organization");
  if (membership.role === "MEMBER") {
    throw new Error("You need Admin or Owner access to manage API keys.");
  }

  return { orgId: org.id, role: membership.role };
}

/**
 * Generate a raw API secret and its SHA-256 hash.
 * Format: rs_live_<32 random hex bytes>
 */
function generateApiSecret(): { rawSecret: string; secretHash: string; prefix: string } {
  const randomHex = crypto.randomBytes(32).toString("hex"); // 64 hex chars
  const rawSecret = `rs_live_${randomHex}`;
  const secretHash = crypto
    .createHash("sha256")
    .update(rawSecret)
    .digest("hex");
  // Display prefix: "rs_live_" + first 8 chars of the random part
  const prefix = `rs_live_${randomHex.slice(0, 8)}`;
  return { rawSecret, secretHash, prefix };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * List all API keys for an organization.
 * Never returns the secret hash — only safe metadata.
 */
export async function listApiKeys(slug: string): Promise<ListApiKeysResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  try {
    const { orgId } = await requireOrgAdmin(session.user.id, slug);

    const keys = await prisma.apiKey.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      ok: true,
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        status: k.status,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
      })),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load API keys.";
    return { ok: false, error: msg };
  }
}

/**
 * Create a new API key for an organization.
 * Returns the raw secret ONCE — it is never stored and cannot be retrieved again.
 */
export async function createApiKey(
  input: CreateApiKeyInput
): Promise<CreateApiKeyResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Key name is required.", field: "name" };
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters.", field: "name" };
  if (name.length > 80) return { ok: false, error: "Name must be 80 characters or fewer.", field: "name" };

  let orgId: string;
  try {
    const result = await requireOrgAdmin(session.user.id, input.slug);
    orgId = result.orgId;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  // Parse optional expiry
  let expiresAt: Date | null = null;
  if (input.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (isNaN(parsed.getTime())) {
      return { ok: false, error: "Invalid expiry date." };
    }
    if (parsed <= new Date()) {
      return { ok: false, error: "Expiry date must be in the future." };
    }
    expiresAt = parsed;
  }

  const { rawSecret, secretHash, prefix } = generateApiSecret();

  try {
    const created = await prisma.apiKey.create({
      data: {
        organizationId: orgId,
        createdById: session.user.id,
        name,
        prefix,
        secretHash,
        status: "ACTIVE",
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });

    // TODO: audit log — key created
    // await logAuditEvent({ action: "API_KEY_CREATED", orgId, userId: session.user.id, meta: { keyId: created.id, name } })

    return {
      ok: true,
      rawSecret,
      key: {
        id: created.id,
        name: created.name,
        prefix: created.prefix,
        status: created.status,
        createdAt: created.createdAt,
        lastUsedAt: created.lastUsedAt,
        expiresAt: created.expiresAt,
      },
    };
  } catch (err) {
    console.error("[createApiKey]", err);
    return { ok: false, error: "Failed to create API key. Please try again." };
  }
}

/**
 * Revoke an API key — sets status to REVOKED.
 * Only the organization's OWNER or ADMIN can revoke.
 */
export async function revokeApiKey(
  keyId: string,
  slug: string
): Promise<RevokeApiKeyResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  let orgId: string;
  try {
    const result = await requireOrgAdmin(session.user.id, slug);
    orgId = result.orgId;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    // Verify the key belongs to this org before revoking
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, organizationId: orgId },
      select: { id: true, status: true },
    });

    if (!key) return { ok: false, error: "API key not found." };
    if (key.status === "REVOKED") return { ok: false, error: "Key is already revoked." };

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { status: "REVOKED" },
    });

    // TODO: audit log — key revoked
    // await logAuditEvent({ action: "API_KEY_REVOKED", orgId, userId: session.user.id, meta: { keyId } })

    return { ok: true };
  } catch (err) {
    console.error("[revokeApiKey]", err);
    return { ok: false, error: "Failed to revoke API key." };
  }
}
