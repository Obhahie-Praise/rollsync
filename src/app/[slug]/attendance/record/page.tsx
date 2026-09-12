import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchSessionRoll,
  fetchAdminRecords,
} from "@/lib/attendance-actions";
import { RecordClient } from "@/components/attendance/RecordClient";
import { AdminRecordClient } from "@/components/attendance/AdminRecordClient";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}

export default async function AttendanceRecordPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { session: sessionId } = await searchParams;

  // Server-side guard: teachers are redirected to /teacher/today before any data loads
  await requireAdminAccess(slug);

  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession?.user) redirect("/");

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  // ── If a specific session is requested, show the roll call ──────────────
  if (sessionId) {
    const result = await fetchSessionRoll({ slug, sessionId });

    if (!result.ok) {
      return (
        <div className="px-8 sm:px-14 pb-24">
          <div className="max-w-md py-12 px-6 bg-red-50 border border-red-200 rounded-2xl text-center mx-auto mt-10">
            <p className="text-[15px] font-semibold text-red-800 mb-1">
              Could not load session
            </p>
            <p className="text-[13px] text-red-700">{result.error}</p>
          </div>
        </div>
      );
    }

    return (
      <RecordClient
        orgSlug={slug}
        session={result.session}
        students={result.students}
      />
    );
  }

  // ── Admin with no sessionId: show org-wide records ──────────────────────
  const todayKey = new Date().toISOString().slice(0, 10);

  const [recordsResult, classes, subjects] = await Promise.all([
    fetchAdminRecords({
      slug,
      dateFrom: todayKey,
      dateTo: todayKey,
    }),
    prisma.class.findMany({
      where: { organizationId: org.id, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initialRecords = recordsResult.ok ? recordsResult.records : [];
  const initialTotal = recordsResult.ok ? recordsResult.total : 0;

  return (
    <AdminRecordClient
      orgSlug={slug}
      initialRecords={initialRecords}
      initialTotal={initialTotal}
      classOptions={classes}
      subjectOptions={subjects}
    />
  );
}
