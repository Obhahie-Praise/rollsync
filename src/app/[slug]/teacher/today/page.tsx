import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchTodayClasses } from '@/lib/attendance-actions';
import { TeacherTodayClient } from '@/components/teacher/TeacherTodayClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeacherTodayPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const result = await fetchTodayClasses(slug);

  const teacherName = result.ok ? result.teacherName : (session.user.name ?? '');
  const classes = result.ok ? result.classes : [];
  const error = result.ok ? null : result.error;

  return (
    <TeacherTodayClient
      orgSlug={slug}
      teacherName={teacherName}
      initialClasses={classes}
      serverError={error}
    />
  );
}
