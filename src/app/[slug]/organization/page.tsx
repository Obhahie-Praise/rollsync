import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchOrgPageData } from "@/lib/org-page-actions";
import { OrganizationClient } from "@/components/organization/OrganizationClient";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrganizationPage({ params }: PageProps) {
  const { slug } = await params;

  // Server-side guard: teachers are redirected to /teacher/today before any data loads
  await requireAdminAccess(slug);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const result = await fetchOrgPageData(slug);
  if (!result.ok) {
    notFound();
  }

  return <OrganizationClient data={result.data} />;
}
