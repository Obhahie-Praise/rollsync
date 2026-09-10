import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrgSettingsForm } from "@/components/settings/OrgSettingsForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrgSettingsPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  // Load org with member count
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      logoUrl: true,
      _count: { select: { memberships: true } },
    },
  });

  if (!org) notFound();

  // Check membership + role
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: org.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    redirect("/");
  }

  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const orgData = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type as string,
    logoUrl: org.logoUrl,
    memberCount: org._count.memberships,
  };

  return <OrgSettingsForm org={orgData} canEdit={canEdit} />;
}
