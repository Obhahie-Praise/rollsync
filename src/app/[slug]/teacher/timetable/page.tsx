import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeacherTimetablePage({ params }: PageProps) {
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
      userId_organizationId: { userId: session.user.id, organizationId: org.id },
    },
    select: { role: true },
  });
  if (!membership) redirect("/");

  const teacher = await prisma.person.findFirst({
    where: {
      organizationId: org.id,
      linkedUserId: session.user.id,
      personType: "TEACHER",
      status: "ACTIVE",
    },
    select: { id: true, name: true },
  });
  if (!teacher) redirect(`/${slug}/overview`);

  const entries = await prisma.timetableEntry.findMany({
    where: {
      organizationId: org.id,
      teacherPersonId: teacher.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      daysOfWeek: true,
      periodLabel: true,
      class: { select: { name: true, code: true } },
      subject: { select: { name: true } },
      room: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const DAYS = [
    { dow: 1, label: "Monday" },
    { dow: 2, label: "Tuesday" },
    { dow: 3, label: "Wednesday" },
    { dow: 4, label: "Thursday" },
    { dow: 5, label: "Friday" },
  ];

  const todayDow = new Date().getDay();

  return (
    <div className="px-5 sm:px-8 pb-24">
      <div className="pt-2 pb-8">
        <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-tight">
          My Timetable
        </h1>
        <p className="text-[14px] sm:text-[16px] text-text-accent mt-1">
          Your weekly teaching schedule.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[16px] font-medium">No timetable entries</p>
          <p className="text-[14px] text-text-accent mt-1">
            Your administrator hasn&apos;t set up your timetable yet.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {DAYS.map(({ dow, label }) => {
            const dayEntries = entries
              .filter((e) =>
                e.daysOfWeek
                  .split(",")
                  .map((d) => parseInt(d.trim(), 10))
                  .includes(dow)
              )
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div key={dow}>
                <h2
                  className={`text-[15px] font-semibold mb-3 ${
                    todayDow === dow ? "text-blue" : "text-text-accent"
                  }`}
                >
                  {label}
                  {todayDow === dow && (
                    <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue/10 text-blue align-middle">
                      Today
                    </span>
                  )}
                </h2>

                {dayEntries.length === 0 ? (
                  <p className="text-[13px] text-text-accent/50 pl-1">
                    No classes
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayEntries.map((e) => (
                      <div
                        key={e.id}
                        className={`rounded-xl border p-3 sm:p-4 ${
                          todayDow === dow
                            ? "bg-blue/5 border-blue/20"
                            : "bg-white/60 border-black/8"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-semibold">
                              {e.subject.name}
                            </p>
                            <p className="text-[13px] text-text-accent mt-0.5">
                              {e.class.name}
                              {e.class.code ? ` (${e.class.code})` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[13px] font-medium">
                              {e.startTime}–{e.endTime}
                            </p>
                            {e.room && (
                              <p className="text-[12px] text-text-accent mt-0.5">
                                {e.room.name}
                              </p>
                            )}
                            {e.periodLabel && (
                              <p className="text-[11px] text-text-accent/60 mt-0.5">
                                {e.periodLabel}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
