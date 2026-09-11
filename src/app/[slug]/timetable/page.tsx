import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  listTimetableEntries,
  listClasses,
  listSubjects,
  listRooms,
} from "@/lib/timetable-actions";
import { TimetableClient } from "@/components/timetable/TimetableClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TimetablePage({ params }: PageProps) {
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

  const canManage =
    membership.role === "OWNER" || membership.role === "ADMIN";

  // Load all data in parallel
  const [entriesResult, classesResult, subjectsResult, roomsResult, teachers] =
    await Promise.all([
      listTimetableEntries({ slug, status: "ACTIVE" }),
      listClasses(slug),
      listSubjects(slug),
      listRooms(slug),
      // Teachers: people with personType = TEACHER in this org
      prisma.person.findMany({
        where: { organizationId: org.id, personType: "TEACHER", status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const initialEntries = entriesResult.ok ? entriesResult.entries : [];
  const classes = classesResult.ok ? classesResult.classes : [];
  const subjects = subjectsResult.ok ? subjectsResult.subjects : [];
  const rooms = roomsResult.ok ? roomsResult.rooms : [];

  return (
    <TimetableClient
      slug={slug}
      initialEntries={initialEntries}
      classes={classes.filter((c) => c.status === "ACTIVE")}
      subjects={subjects}
      rooms={rooms}
      teachers={teachers}
      canManage={canManage}
    />
  );
}
