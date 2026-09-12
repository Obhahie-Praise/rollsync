import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listSubjects } from "@/lib/timetable-actions";
import { SubjectsClient } from "@/components/timetable/SubjectsClient";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TimetableSubjectsPage({ params }: PageProps) {
  const { slug } = await params;

  // Server-side guard: teachers are redirected to /teacher/today before any data loads
  const { role } = await requireAdminAccess(slug);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const canManage = role === "OWNER" || role === "ADMIN";

  const result = await listSubjects(slug);
  const initialSubjects = result.ok ? result.subjects : [];

  return (
    <SubjectsClient
      slug={slug}
      initialSubjects={initialSubjects}
      canManage={canManage}
    />
  );
}
