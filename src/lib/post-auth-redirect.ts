"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Called immediately after a successful login or sign-up.
 *
 * Returns:
 *  - { destination: "/[slug]/overview" }  – single org, go straight in
 *  - { destination: "/org-select" }        – multiple orgs, pick one
 *  - { destination: "/onboarding" }        – no orgs, start onboarding
 */
export async function getPostAuthDestination(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return "/";

  // Check onboarding progress first: if they haven't completed it and
  // have no org yet, send to onboarding.
  const progress = await prisma.onboardingProgress.findUnique({
    where: { userId: session.user.id },
  });

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: { organization: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    // No organizations – send to onboarding
    return "/onboarding";
  }

  if (memberships.length === 1) {
    // Single org – skip selection, go directly
    return `/${memberships[0].organization.slug}/overview`;
  }

  // Multiple orgs – show selection screen
  // If they have a completed onboarding that pointed to a specific org,
  // use that as the default (they can still switch). For now just go to
  // the org-select page which reads their memberships.
  // Prefer the most recently accessed org if we have a hint; otherwise
  // fall back to the first.
  if (progress?.completed) {
    // Try to find the org created during onboarding (the oldest membership)
    return `/${memberships[0].organization.slug}/overview`;
  }

  return "/org-select";
}
