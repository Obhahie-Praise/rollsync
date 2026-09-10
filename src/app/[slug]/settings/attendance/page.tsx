import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceSettingsForm } from "@/components/settings/AttendanceSettingsForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AttendanceSettingsPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      attendanceMethods: true,
    },
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

  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  // Parse comma-separated attendance methods
  const initialMethods = org.attendanceMethods
    ? org.attendanceMethods.split(",").map((m) => m.trim()).filter(Boolean)
    : [];

  return (
    <AttendanceSettingsForm
      orgSlug={org.slug}
      initialMethods={initialMethods}
      canEdit={canEdit}
    />
  );
}
