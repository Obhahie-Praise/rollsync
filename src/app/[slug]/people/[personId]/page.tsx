import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPerson } from "@/lib/people-actions";
import { PersonDetailClient } from "@/components/people/PersonDetailClient";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ slug: string; personId: string }>;
}

export default async function PersonDetailPage({ params }: PageProps) {
  const { slug, personId } = await params;

  // Server-side guard: teachers are redirected to /teacher/today before any data loads
  const { role } = await requireAdminAccess(slug);

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

  const result = await getPerson(slug, personId);

  if (!result.ok) {
    notFound();
  }

  return (
    <PersonDetailClient
      person={result.person}
      orgSlug={slug}
      canManage={canManage}
    />
  );
}
