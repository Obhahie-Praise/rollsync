import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WorkspaceShell from "@/components/dashboard/WorkspaceShell";
import type { OrgItem } from "@/components/dashboard/OrgSwitcher";

interface SlugLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function SlugLayout({ children, params }: SlugLayoutProps) {
  const { slug } = await params;

  // 1. Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  // 2. Resolve organization by slug
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true, logoUrl: true, publicId: true },
  });

  if (!organization) {
    notFound();
  }

  // 3. Check membership
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: organization.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  // 4. Fetch all memberships for the org switcher (first 11 to detect "show more")
  const rawMemberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: {
      organization: {
        select: { id: true, name: true, slug: true, type: true, logoUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const memberships: OrgItem[] = rawMemberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    type: m.organization.type as OrgItem["type"],
    image: m.organization.logoUrl ?? null,
  }));

  const currentOrg: OrgItem = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    type: organization.type as OrgItem["type"],
    image: organization.logoUrl ?? null,
  };

  const user = {
    name: session.user.name ?? session.user.email ?? "User",
    image: session.user.image ?? null,
  };

  // 5. Resolve whether this user is a teacher in this org
  //    (has a linked Person of personType=TEACHER and status=ACTIVE)
  const teacherPerson = await prisma.person.findFirst({
    where: {
      organizationId: organization.id,
      linkedUserId: session.user.id,
      personType: "TEACHER",
      status: "ACTIVE",
    },
    select: { id: true },
  });
  const isTeacher = !!teacherPerson;
  // Admins/owners are never treated as "teacher-only" — they see the full workspace
  const isAdminOrOwner =
    membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <WorkspaceShell
      slug={slug}
      user={user}
      currentOrg={currentOrg}
      memberships={memberships}
      isTeacher={isTeacher && !isAdminOrOwner}
    >
      {children}
    </WorkspaceShell>
  );
}
