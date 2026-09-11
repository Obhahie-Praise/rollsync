import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeacherClassesPage({ params }: PageProps) {
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

  const teacher = await prisma.person.findFirst({
    where: {
      organizationId: org.id,
      linkedUserId: session.user.id,
      personType: 'TEACHER',
      status: 'ACTIVE',
    },
    select: { id: true, name: true },
  });
  if (!teacher) redirect(`/${slug}/overview`);

  // All unique classes this teacher is assigned to via active timetable entries
  const entries = await prisma.timetableEntry.findMany({
    where: {
      organizationId: org.id,
      teacherPersonId: teacher.id,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      daysOfWeek: true,
      class: {
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { memberships: { where: { endDate: null } } },
          },
        },
      },
      subject: { select: { name: true } },
      room: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  // Deduplicate by classId — show each class once
  const classMap = new Map<string, (typeof entries)[0]>();
  for (const e of entries) {
    if (!classMap.has(e.class.id)) classMap.set(e.class.id, e);
  }
  const classes = Array.from(classMap.values());

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="px-5 sm:px-8 pb-24">
      <div className="pt-2 pb-8">
        <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-tight">
          My Classes
        </h1>
        <p className="text-[14px] sm:text-[16px] text-text-accent mt-1">
          Classes you are assigned to teach.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[16px] font-medium">No classes assigned</p>
          <p className="text-[14px] text-text-accent mt-1">
            Your administrator hasn&apos;t assigned any classes to you yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((e) => {
            const days = e.daysOfWeek
              .split(',')
              .map((d) => DAY_NAMES[parseInt(d.trim(), 10)] ?? '')
              .join(' · ');
            return (
              <div
                key={e.class.id}
                className="rounded-2xl bg-white/70 border border-black/8 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[18px] font-semibold">
                      {e.class.name}
                      {e.class.code ? ` (${e.class.code})` : ''}
                    </p>
                    <p className="text-[14px] text-text-accent mt-0.5">
                      {e.subject.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-text-accent">
                      <span>
                        {e.startTime}–{e.endTime}
                      </span>
                      <span>{days}</span>
                      {e.room && <span>{e.room.name}</span>}
                      <span>{e.class._count.memberships} students</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
