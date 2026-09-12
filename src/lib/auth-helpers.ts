"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Shared result type ────────────────────────────────────────────────────────

export interface OrgAccess {
  userId: string;
  orgId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  isAdmin: boolean;
}

// ─── requireAdminAccess ────────────────────────────────────────────────────────
//
// Use on every organization-admin-only page (overview, people, organization,
// reports, developers, settings, timetable management, attendance management).
//
// Behaviour:
//   - Not authenticated           → redirect "/"
//   - Org not found               → notFound() — caller must import notFound
//   - Not a member                → redirect "/"
//   - Teacher-only (MEMBER role, has linked teacher Person, no admin/owner) →
//       redirect to /[slug]/teacher/today
//   - Admin / Owner               → returns OrgAccess, execution continues
//
// "Dual-role" users (Admin/Owner who also happen to be a Teacher Person)
// always pass through as admin — they are NOT redirected to the teacher workspace.

export async function requireAdminAccess(slug: string): Promise<OrgAccess> {
  // 1. Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  // 2. Resolve org
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) {
    // Callers already import notFound; we throw a redirect to "/" as safe fallback
    redirect("/");
  }

  // 3. Membership check
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId: session.user.id, organizationId: org.id },
    },
    select: { role: true },
  });
  if (!membership) redirect("/");

  const isAdmin =
    membership.role === "OWNER" || membership.role === "ADMIN";

  // 4. If not admin/owner, check for teacher-only access
  if (!isAdmin) {
    // Any MEMBER who tries to reach an admin route is redirected.
    // If they have a teacher profile, send them to their workspace.
    // If they have no teacher profile either, redirect to root.
    const teacherPerson = await prisma.person.findFirst({
      where: {
        organizationId: org.id,
        linkedUserId: session.user.id,
        personType: "TEACHER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (teacherPerson) {
      redirect(`/${slug}/teacher/today`);
    }

    // No admin, no teacher — send to root
    redirect("/");
  }

  return {
    userId: session.user.id,
    orgId: org.id,
    role: membership.role as "OWNER" | "ADMIN" | "MEMBER",
    isAdmin: true,
  };
}
