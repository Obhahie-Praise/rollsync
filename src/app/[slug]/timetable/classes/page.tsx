import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listClasses } from "@/lib/timetable-actions";
import { ClassesClient } from "@/components/timetable/ClassesClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TimetableClassesPage({ params }: PageProps) {
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

  const result = await listClasses(slug);
  const initialClasses = result.ok ? result.classes : [];

  return (
    <ClassesClient
      slug={slug}
      initialClasses={initialClasses}
      canManage={canManage}
    />
  );
}
