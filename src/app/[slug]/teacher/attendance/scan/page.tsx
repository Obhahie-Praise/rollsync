import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScanClient } from "./ScanClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ScanPage({ params }: PageProps) {
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

  // Must have a linked teacher person (enforced by teacher layout, but double-checked here)
  const teacherPerson = await prisma.person.findFirst({
    where: {
      organizationId: org.id,
      linkedUserId: session.user.id,
      personType: "TEACHER",
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!teacherPerson) redirect(`/${slug}/overview`);

  return <ScanClient orgSlug={slug} />;
}
