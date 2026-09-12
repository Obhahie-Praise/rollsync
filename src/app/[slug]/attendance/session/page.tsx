import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAdminSessions } from "@/lib/attendance-actions";
import { AdminSessionClient } from "@/components/attendance/AdminSessionClient";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AttendanceSessionPage({ params }: PageProps) {
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

  const todayKey = new Date().toISOString().slice(0, 10);
  const result = await fetchAdminSessions(slug, todayKey);
  const data = result.ok
    ? result.data
    : { expectedSessions: 0, startedSessions: 0, completedSessions: 0, sessions: [] };

  return (
    <AdminSessionClient
      orgSlug={slug}
      initialData={data}
      initialDateKey={todayKey}
    />
  );
}
