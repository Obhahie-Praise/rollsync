import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchTodayClasses, fetchAdminSessions } from "@/lib/attendance-actions";
import { SessionClient } from "@/components/attendance/SessionClient";
import { AdminSessionClient } from "@/components/attendance/AdminSessionClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AttendanceSessionPage({ params }: PageProps) {
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

  const isAdmin =
    membership.role === "OWNER" || membership.role === "ADMIN";

  // ── Admin path ──────────────────────────────────────────────────────────
  if (isAdmin) {
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

  // ── Teacher path ────────────────────────────────────────────────────────
  const result = await fetchTodayClasses(slug);

  if (!result.ok) {
    // No teacher profile linked — show a helpful message
    if (result.code === "NO_TEACHER_PROFILE") {
      return (
        <div className="px-8 sm:px-14 pb-24">
          <div className="mb-8">
            <h1 className="text-[40px] font-semibold tracking-tight">
              Attendance
            </h1>
          </div>
          <div className="max-w-md py-12 px-6 bg-white/60 border border-black/8 rounded-2xl text-center mx-auto">
            <p className="text-[16px] font-semibold mb-2">
              No teacher profile linked
            </p>
            <p className="text-[14px] text-text-accent">
              Your account is not linked to a teacher profile in this
              organization. Contact your administrator to be added as a teacher.
            </p>
          </div>
        </div>
      );
    }

    // Generic error
    return (
      <div className="px-8 sm:px-14 pb-24">
        <div className="mb-8">
          <h1 className="text-[40px] font-semibold tracking-tight">
            Attendance
          </h1>
        </div>
        <div className="max-w-md py-12 px-6 bg-red-50 border border-red-200 rounded-2xl text-center mx-auto">
          <p className="text-[15px] font-semibold text-red-800 mb-1">
            Could not load attendance
          </p>
          <p className="text-[13px] text-red-700">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <SessionClient
      orgSlug={slug}
      teacherPersonId={result.teacherPersonId}
      teacherName={result.teacherName}
      initialClasses={result.classes}
    />
  );
}
