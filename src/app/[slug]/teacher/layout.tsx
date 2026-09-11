import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface TeacherLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TeacherLayout({
  children,
  params,
}: TeacherLayoutProps) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');

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
  if (!membership) redirect('/');

  // Verify teacher profile
  // Admins/owners can also access the teacher workspace if they have a linked TEACHER Person
  const teacherPerson = await prisma.person.findFirst({
    where: {
      organizationId: org.id,
      linkedUserId: session.user.id,
      personType: 'TEACHER',
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  if (!teacherPerson) {
    // Not a teacher — redirect to the main workspace overview
    redirect(`/${slug}/overview`);
  }

  return <>{children}</>;
}
