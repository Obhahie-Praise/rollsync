"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  return session;
}

/**
 * Verify the user is a member of the organization with the given slug.
 * Returns the org if found and the user is a member.
 */
async function requireOrgMember(userId: string, slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true, logoUrl: true },
  });
  if (!org) throw new Error("Organization not found");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership) throw new Error("Not a member of this organization");

  return { org, role: membership.role };
}

// ─── Profile actions ──────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  name: string;
  image?: string | null;
}

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" };

export async function updateProfile(
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Name is required.", field: "name" };
  if (name.length < 2)
    return {
      ok: false,
      error: "Name must be at least 2 characters.",
      field: "name",
    };
  if (name.length > 100)
    return {
      ok: false,
      error: "Name must be 100 characters or fewer.",
      field: "name",
    };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        ...(input.image !== undefined ? { image: input.image } : {}),
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("[updateProfile]", err);
    return { ok: false, error: "Failed to update profile. Please try again." };
  }
}

// ─── Organization actions ──────────────────────────────────────────────────────

export interface UpdateOrgInput {
  slug: string; // current org slug (used to look up the org)
  name: string;
  logoUrl?: string | null;
}

export type UpdateOrgResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" };

export async function updateOrganization(
  input: UpdateOrgInput
): Promise<UpdateOrgResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, input.slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  // Only OWNER or ADMIN can update
  if (orgData.role === "MEMBER") {
    return { ok: false, error: "You don't have permission to edit this organization." };
  }

  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Name is required.", field: "name" };
  if (name.length < 2)
    return {
      ok: false,
      error: "Name must be at least 2 characters.",
      field: "name",
    };
  if (name.length > 100)
    return {
      ok: false,
      error: "Name must be 100 characters or fewer.",
      field: "name",
    };

  try {
    await prisma.organization.update({
      where: { id: orgData.org.id },
      data: {
        name,
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("[updateOrganization]", err);
    return {
      ok: false,
      error: "Failed to update organization. Please try again.",
    };
  }
}

// ─── Attendance settings ───────────────────────────────────────────────────────
// The schema currently stores attendanceMethods as a comma-separated string.
// We expose only what the existing schema supports.

export interface UpdateAttendanceSettingsInput {
  slug: string;
  attendanceMethods: string[];
}

export type UpdateAttendanceSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateAttendanceSettings(
  input: UpdateAttendanceSettingsInput
): Promise<UpdateAttendanceSettingsResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, input.slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  if (orgData.role === "MEMBER") {
    return {
      ok: false,
      error: "You don't have permission to edit attendance settings.",
    };
  }

  const validMethods = ["qr", "roll-call", "id-scan", "mobile", "api"];
  const methods = input.attendanceMethods.filter((m) =>
    validMethods.includes(m)
  );

  try {
    await prisma.organization.update({
      where: { id: orgData.org.id },
      data: {
        attendanceMethods: methods.length > 0 ? methods.join(",") : null,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("[updateAttendanceSettings]", err);
    return {
      ok: false,
      error: "Failed to update attendance settings. Please try again.",
    };
  }
}

// ─── Password change ───────────────────────────────────────────────────────────

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string; field?: "currentPassword" | "newPassword" };

export async function changePassword(
  input: ChangePasswordInput
): Promise<ChangePasswordResult> {
  try {
    void (await requireSession());
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  if (!input.currentPassword) {
    return {
      ok: false,
      error: "Current password is required.",
      field: "currentPassword",
    };
  }
  if (!input.newPassword || input.newPassword.length < 8) {
    return {
      ok: false,
      error: "New password must be at least 8 characters.",
      field: "newPassword",
    };
  }
  if (input.newPassword.length > 128) {
    return {
      ok: false,
      error: "New password must be 128 characters or fewer.",
      field: "newPassword",
    };
  }

  try {
    // Use Better Auth's built-in changePassword API
    const result = await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: false,
      },
    });

    if (!result) {
      return { ok: false, error: "Failed to change password." };
    }

    return { ok: true };
  } catch (err) {
    console.error("[changePassword]", err);
    const message =
      err instanceof Error ? err.message : "Failed to change password.";
    // Better Auth throws with meaningful messages for wrong current password
    if (
      message.toLowerCase().includes("incorrect") ||
      message.toLowerCase().includes("invalid") ||
      message.toLowerCase().includes("wrong")
    ) {
      return {
        ok: false,
        error: "Current password is incorrect.",
        field: "currentPassword",
      };
    }
    return { ok: false, error: "Failed to change password. Please try again." };
  }
}

// ─── Revoke session ───────────────────────────────────────────────────────────

export type RevokeSessionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function revokeSession(
  sessionToken: string
): Promise<RevokeSessionResult> {
  try {
    void (await requireSession());
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    await auth.api.revokeSession({
      headers: await headers(),
      body: { token: sessionToken },
    });
    return { ok: true };
  } catch (err) {
    console.error("[revokeSession]", err);
    return { ok: false, error: "Failed to revoke session." };
  }
}

// ─── Get sessions ─────────────────────────────────────────────────────────────

export interface SessionInfo {
  id: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

export async function getSessions(): Promise<SessionInfo[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return [];

  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return sessions.map((s) => ({
      id: s.id,
      token: s.token,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      expiresAt: s.expiresAt,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      isCurrent: s.token === session.session.token,
    }));
  } catch {
    return [];
  }
}
