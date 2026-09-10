import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPerson } from "@/lib/people-actions";
import { PersonDetailClient } from "@/components/people/PersonDetailClient";

interface PageProps {
  params: Promise<{ slug: string; personId: string }>;
}

export default async function PersonDetailPage({ params }: PageProps) {
  const { slug, personId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

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

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

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
