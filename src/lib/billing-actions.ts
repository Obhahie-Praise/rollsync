"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Polar } from "@polar-sh/sdk";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js";

// ─── Polar client ─────────────────────────────────────────────────────────────

function getPolarClient(): Polar {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) throw new Error("POLAR_ACCESS_TOKEN is not configured");
  return new Polar({ accessToken: token });
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

async function requireOrgMember(userId: string, slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, polarCustomerId: true },
  });
  if (!org) throw new Error("Organization not found");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership) throw new Error("Not a member of this organization");

  return { org, role: membership.role };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type BillingSubscription = {
  id: string;
  status: string;
  productName: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEnd: Date | null;
  pastDueAt: Date | null | undefined;
};

export type BillingInfo =
  | { ok: true; subscription: BillingSubscription | null; canManage: boolean }
  | { ok: false; error: string };

export type ManagePortalResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

// ─── Get billing info ─────────────────────────────────────────────────────────

export async function getBillingInfo(slug: string): Promise<BillingInfo> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  const canManage =
    orgData.role === "OWNER" || orgData.role === "ADMIN";

  const { polarCustomerId } = orgData.org;

  // No Polar customer yet → free plan
  if (!polarCustomerId) {
    return { ok: true, subscription: null, canManage };
  }

  try {
    const polar = getPolarClient();

    // Fetch active/trialing subscriptions for this customer
    const iter = await polar.subscriptions.list({
      customerId: polarCustomerId,
      active: true,
    });

    let activeSub: Subscription | null = null;

    for await (const page of iter) {
      if (page.result.items.length > 0) {
        activeSub = page.result.items[0] ?? null;
        break;
      }
    }

    // If no active subscription found, try fetching any subscription
    if (!activeSub) {
      const allIter = await polar.subscriptions.list({
        customerId: polarCustomerId,
      });
      for await (const page of allIter) {
        if (page.result.items.length > 0) {
          activeSub = page.result.items[0] ?? null;
          break;
        }
      }
    }

    if (!activeSub) {
      return { ok: true, subscription: null, canManage };
    }

    const subscription: BillingSubscription = {
      id: activeSub.id,
      status: activeSub.status,
      productName: activeSub.product.name,
      amount: activeSub.amount,
      currency: activeSub.currency,
      recurringInterval: activeSub.recurringInterval,
      currentPeriodEnd: activeSub.currentPeriodEnd,
      cancelAtPeriodEnd: activeSub.cancelAtPeriodEnd,
      canceledAt: activeSub.canceledAt,
      trialEnd: activeSub.trialEnd,
      pastDueAt: activeSub.pastDueAt,
    };

    return { ok: true, subscription, canManage };
  } catch (err) {
    console.error("[getBillingInfo] Polar error:", err);
    // Don't crash the page — return graceful state
    return { ok: true, subscription: null, canManage };
  }
}

// ─── Create Polar customer portal session ─────────────────────────────────────

export async function createManagePortalSession(
  slug: string
): Promise<ManagePortalResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let orgData;
  try {
    orgData = await requireOrgMember(session.user.id, slug);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  // Only OWNER or ADMIN can manage billing
  if (orgData.role === "MEMBER") {
    return {
      ok: false,
      error: "You don't have permission to manage billing.",
    };
  }

  const { polarCustomerId } = orgData.org;

  if (!polarCustomerId) {
    return { ok: false, error: "No billing account found for this organization." };
  }

  try {
    const polar = getPolarClient();
    const customerSession = await polar.customerSessions.create({
      customerId: polarCustomerId,
    });
    return { ok: true, url: customerSession.customerPortalUrl };
  } catch (err) {
    console.error("[createManagePortalSession] Polar error:", err);
    return {
      ok: false,
      error: "Failed to open billing portal. Please try again.",
    };
  }
}
