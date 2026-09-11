import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchSessionRoll } from "@/lib/attendance-actions";
import { RollCallClient } from "@/components/teacher/RollCallClient";

interface PageProps {
  params: Promise<{ slug: string; sessionId: string }>;
}

export default async function TeacherRollCallPage({ params }: PageProps) {
  const { slug, sessionId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId: session.user.id, organizationId: org.id },
    },
    select: { role: true },
  });
  if (!membership) redirect("/");

  const result = await fetchSessionRoll({ slug, sessionId });
  if (!result.ok) notFound();

  return (
    <RollCallClient
      orgSlug={slug}
      initialSession={result.session}
      initialStudents={result.students}
    />
  );
}
