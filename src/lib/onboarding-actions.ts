"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, slugify } from "@/lib/slug";
import type { OnboardingData, EntityType } from "@/lib/onboarding-types";

// ─── getSession helper ────────────────────────────────────────────────────────

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// ─── saveOnboardingProgress ───────────────────────────────────────────────────

/**
 * Upsert the user's onboarding progress record with the latest step and data.
 * Called from each onboarding step whenever the user clicks Next.
 */
export async function saveOnboardingProgress(
  step: number,
  data: OnboardingData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    await prisma.onboardingProgress.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        currentStep: step,
        data: JSON.stringify(data),
        completed: false,
      },
      update: {
        currentStep: step,
        data: JSON.stringify(data),
        updatedAt: new Date(),
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to save progress" };
  }
}

// ─── getOnboardingProgress ────────────────────────────────────────────────────

/**
 * Return the user's current onboarding state from the database.
 */
export async function getOnboardingProgress(): Promise<{
  currentStep: number;
  data: OnboardingData;
  completed: boolean;
} | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const progress = await prisma.onboardingProgress.findUnique({
    where: { userId: session.user.id },
  });

  if (!progress) return null;

  let data: OnboardingData = {};
  try {
    data = JSON.parse(progress.data) as OnboardingData;
  } catch {
    // malformed JSON – start fresh
  }

  return {
    currentStep: progress.currentStep,
    data,
    completed: progress.completed,
  };
}

// ─── completeOnboarding ───────────────────────────────────────────────────────

/**
 * Finalize onboarding:
 *  1. Validate the collected data
 *  2. Generate a unique slug
 *  3. Create the Organization
 *  4. Create the Owner Membership
 *  5. Mark OnboardingProgress as completed
 *  6. Return the slug so the client can redirect
 */
export async function completeOnboarding(
  data: OnboardingData
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, error: "Not authenticated" };
  }

  // ── Validation ────────────────────────────────────────────────────────────
  if (!data.entityType) {
    return { ok: false, error: "Entity type is required." };
  }
  if (!data.name || data.name.trim().length < 2) {
    return { ok: false, error: "Name must be at least 2 characters." };
  }
  if (data.name.trim().length > 100) {
    return { ok: false, error: "Name must be 100 characters or fewer." };
  }
  if (!["SCHOOL", "ORGANIZATION", "EVENT"].includes(data.entityType)) {
    return { ok: false, error: "Invalid entity type." };
  }

  const baseSlug = slugify(data.name.trim());
  if (!baseSlug) {
    return {
      ok: false,
      error: "Name cannot generate a valid slug. Please use alphanumeric characters.",
    };
  }

  try {
    const slug = await generateUniqueSlug(data.name.trim());

    // ── Create org + membership + mark progress atomically ────────────────
    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name!.trim(),
          slug,
          type: data.entityType as EntityType,
          subtype: data.subtype ?? null,
          sizeRange: data.sizeRange ?? null,
          location: data.location?.trim() ?? null,
          attendanceMethods: data.attendanceMethods?.join(",") ?? null,
        },
      });

      await tx.membership.create({
        data: {
          userId: session.user.id,
          organizationId: org.id,
          role: "OWNER",
        },
      });

      await tx.onboardingProgress.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          currentStep: 4,
          data: JSON.stringify(data),
          completed: true,
        },
        update: {
          currentStep: 4,
          data: JSON.stringify(data),
          completed: true,
          updatedAt: new Date(),
        },
      });
    });

    return { ok: true, slug };
  } catch (err) {
    console.error("[completeOnboarding]", err);
    return { ok: false, error: "Failed to create organization. Please try again." };
  }
}

// ─── getOnboardingRedirect ────────────────────────────────────────────────────

/**
 * Determine where to send the user after they land on /onboarding.
 * Returns null if they should stay on /onboarding (fresh start).
 */
export async function getOnboardingRedirect(): Promise<string | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const progress = await prisma.onboardingProgress.findUnique({
    where: { userId: session.user.id },
  });

  if (!progress) return null; // fresh user, let them start onboarding

  if (progress.completed) {
    // Already finished onboarding — find their organization
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, role: "OWNER" },
      include: { organization: { select: { slug: true } } },
    });
    if (membership) {
      return `/${membership.organization.slug}/overview`;
    }
  }

  // Incomplete: restore to the step they were on
  return `/onboarding/${stepNumberToPath(progress.currentStep)}`;
}

function stepNumberToPath(step: number): string {
  switch (step) {
    case 1:
      return "one";
    case 2:
      return "two";
    case 3:
      return "three";
    default:
      return "one";
  }
}
