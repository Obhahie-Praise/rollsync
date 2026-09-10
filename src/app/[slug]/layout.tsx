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
    select: { id: true, name: true, slug: true, type: true },
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
        select: { id: true, name: true, slug: true, type: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const memberships: OrgItem[] = rawMemberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    type: m.organization.type as OrgItem["type"],
    image: null,
  }));

  const currentOrg: OrgItem = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    type: organization.type as OrgItem["type"],
    image: null,
  };

  const user = {
    name: session.user.name ?? session.user.email ?? "User",
    image: session.user.image ?? null,
  };

  return (
    <WorkspaceShell
      slug={slug}
      user={user}
      currentOrg={currentOrg}
      memberships={memberships}
    >
      {children}
    </WorkspaceShell>
  );
}
