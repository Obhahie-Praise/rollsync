"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Called immediately after a successful login or sign-up.
 *
 * Returns:
 *  - { destination: "/[slug]/teacher/today" } – teacher-only (MEMBER + teacher Person, no admin)
 *  - { destination: "/[slug]/overview" }       – admin/owner single org
 *  - { destination: "/org-select" }             – multiple orgs, pick one
 *  - { destination: "/onboarding" }             – no orgs, start onboarding
 *
 * Dual-role users (Admin/Owner who also have a teacher Person) are treated as
 * admin and land on /overview — they can still navigate to the teacher workspace.
 */
export async function getPostAuthDestination(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return "/";

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: {
      role: true,
      organization: { select: { slug: true, id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    // No organizations — send to onboarding
    return "/onboarding";
  }

  if (memberships.length === 1) {
    const m = memberships[0];
    const isAdmin = m.role === "OWNER" || m.role === "ADMIN";

    // Admin/Owner always go to overview
    if (isAdmin) {
      return `/${m.organization.slug}/overview`;
    }

    // MEMBER: check for a linked teacher Person
    const teacherPerson = await prisma.person.findFirst({
      where: {
        organizationId: m.organization.id,
        linkedUserId: session.user.id,
        personType: "TEACHER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (teacherPerson) {
      return `/${m.organization.slug}/teacher/today`;
    }

    // MEMBER with no teacher profile — send to overview
    // (they'll see a limited-access message there or be redirected as appropriate)
    return `/${m.organization.slug}/overview`;
  }

  // Multiple orgs — show selection screen
  return "/org-select";
}
