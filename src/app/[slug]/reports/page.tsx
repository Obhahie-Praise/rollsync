import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchReportSummary,
  fetchClassReport,
  fetchPeopleReport,
  fetchScheduleReport,
} from "@/lib/reports-actions";
import { ReportsClient } from "@/components/reports/ReportsClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ReportsPage({ params }: PageProps) {
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

  // Fetch all initial report data in parallel
  const [summaryResult, classesResult, peopleResult, scheduleResult] =
    await Promise.all([
      fetchReportSummary(slug),
      fetchClassReport(slug),
      fetchPeopleReport({ slug, status: "ACTIVE" }),
      fetchScheduleReport({ slug }),
    ]);

  // Extract data, falling back to safe empty defaults on error
  const summary = summaryResult.ok
    ? summaryResult.summary
    : {
        totalPeople: 0,
        activePeople: 0,
        inactivePeople: 0,
        totalClasses: 0,
        totalSubjects: 0,
        totalRooms: 0,
        totalTimetableEntries: 0,
        totalExceptions: 0,
        peopleByType: [],
      };

  const initialClasses = classesResult.ok ? classesResult.classes : [];
  const initialPeople = peopleResult.ok ? peopleResult.people : [];
  const initialPeopleTotal = peopleResult.ok ? peopleResult.total : 0;
  const initialSchedule = scheduleResult.ok ? scheduleResult.entries : [];
  const initialExceptions = scheduleResult.ok ? scheduleResult.exceptions : [];

  // Class options for filters — use same data already fetched for classes tab
  const classOptions = initialClasses.map((c) => ({ id: c.id, name: c.name }));

  return (
    <ReportsClient
      orgSlug={slug}
      summary={summary}
      initialClasses={initialClasses}
      initialPeople={initialPeople}
      initialPeopleTotal={initialPeopleTotal}
      initialSchedule={initialSchedule}
      initialExceptions={initialExceptions}
      classOptions={classOptions}
    />
  );
}
