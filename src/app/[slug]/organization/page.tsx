import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchOrgPageData } from "@/lib/org-page-actions";
import { OrganizationClient } from "@/components/organization/OrganizationClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrganizationPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: org.id,
      },
    },
    select: { role: true },
  });
  if (!membership) redirect("/");

  const result = await fetchOrgPageData(slug);
  if (!result.ok) {
    // Unlikely if membership check passes, but handle gracefully
    notFound();
  }

  return <OrganizationClient data={result.data} />;
}
