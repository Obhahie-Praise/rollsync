"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPrefs {
  emailAttendanceSummary: boolean;
  emailOrgInvitations: boolean;
  emailSecurityAlerts: boolean;
  emailAccountUpdates: boolean;
  emailProductUpdates: boolean;
}

export type GetNotificationPrefsResult =
  | { ok: true; prefs: NotificationPrefs }
  | { ok: false; error: string };

export type UpdateNotificationPrefsResult =
  | { ok: true }
  | { ok: false; error: string };

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: NotificationPrefs = {
  emailAttendanceSummary: true,
  emailOrgInvitations: true,
  emailSecurityAlerts: true,
  emailAccountUpdates: true,
  emailProductUpdates: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's notification preferences.
 * If no row exists yet, return defaults (without creating a row — we upsert on first write).
 */
export async function getNotificationPrefs(): Promise<GetNotificationPrefsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const row = await prisma.notificationPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (!row) {
      return { ok: true, prefs: DEFAULT_PREFS };
    }

    return {
      ok: true,
      prefs: {
        emailAttendanceSummary: row.emailAttendanceSummary,
        emailOrgInvitations: row.emailOrgInvitations,
        emailSecurityAlerts: row.emailSecurityAlerts,
        emailAccountUpdates: row.emailAccountUpdates,
        emailProductUpdates: row.emailProductUpdates,
      },
    };
  } catch (err) {
    console.error("[getNotificationPrefs]", err);
    return { ok: false, error: "Failed to load notification preferences." };
  }
}

/**
 * Update a single notification preference toggle for the authenticated user.
 * Uses upsert so a row is created on first write.
 */
export async function updateNotificationPref(
  field: keyof NotificationPrefs,
  value: boolean
): Promise<UpdateNotificationPrefsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Allowlist the field to prevent arbitrary column injection
  const allowed: Array<keyof NotificationPrefs> = [
    "emailAttendanceSummary",
    "emailOrgInvitations",
    "emailSecurityAlerts",
    "emailAccountUpdates",
    "emailProductUpdates",
  ];
  if (!allowed.includes(field)) {
    return { ok: false, error: "Invalid preference field." };
  }

  try {
    await prisma.notificationPreferences.upsert({
      where: { userId: session.user.id },
      update: { [field]: value },
      create: {
        userId: session.user.id,
        ...DEFAULT_PREFS,
        [field]: value,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("[updateNotificationPref]", err);
    return { ok: false, error: "Failed to save preference." };
  }
}
