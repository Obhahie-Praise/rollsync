import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listPeople } from "@/lib/people-actions";
import { PeopleClient } from "@/components/people/PeopleClient";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PeoplePage({ params }: PageProps) {
  const { slug } = await params;

  // Server-side guard: teachers are redirected to /teacher/today before any data loads
  const { orgId, role } = await requireAdminAccess(slug);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const canManage = role === "OWNER" || role === "ADMIN";

  // Load initial people (active by default)
  const result = await listPeople({ slug, status: "ACTIVE" });
  const initialPeople = result.ok ? result.people : [];

  // Count all active people for the header badge
  const totalActive = await prisma.person.count({
    where: { organizationId: orgId, status: "ACTIVE" },
  });

  return (
    <PeopleClient
      orgSlug={slug}
      initialPeople={initialPeople}
      canManage={canManage}
      totalActive={totalActive}
    />
  );
}
