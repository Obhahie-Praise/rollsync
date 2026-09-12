import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlugRootPage({ params }: PageProps) {
  const { slug } = await params;

  // Determine the correct landing page for this user in this org.
  // Admins/owners → /overview
  // Teacher-only members → /teacher/today
  // All others → /overview (they'll get appropriate messaging there)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) redirect("/");

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId: session.user.id, organizationId: org.id },
    },
    select: { role: true },
  });
  if (!membership) redirect("/");

  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";

  if (!isAdmin) {
    // Check for a linked teacher person before deciding where to send them
    const teacherPerson = await prisma.person.findFirst({
      where: {
        organizationId: org.id,
        linkedUserId: session.user.id,
        personType: "TEACHER",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (teacherPerson) {
      redirect(`/${slug}/teacher/today`);
    }
  }

  redirect(`/${slug}/overview`);
}
