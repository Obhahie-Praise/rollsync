"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  AlertCircle,
  QrCode,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import type { TeacherOverviewData, OverviewClass } from "@/lib/overview-actions";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function minutesUntil(startTime: string): number {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [h, m] = startTime.split(":").map(Number);
  return h * 60 + m - nowMins;
}

function minutesSince(startTime: string): number {
  return -minutesUntil(startTime);
}

function isPast(endTime: string): boolean {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [eh, em] = endTime.split(":").map(Number);
  return nowMins > eh * 60 + em;
}

const ARRIVAL_LABELS: Record<string, string> = {
  EARLY: "Early",
  ON_TIME: "On time",
  LATE: "Late",
  VERY_LATE: "Very late",
};

const ARRIVAL_COLOURS: Record<string, string> = {
  EARLY: "text-blue bg-blue/10",
  ON_TIME: "text-green bg-green-accent",
  LATE: "text-amber-700 bg-amber-50",
  VERY_LATE: "text-red-700 bg-red-50",
};

// ─── Class status helper ──────────────────────────────────────────────────────

type ClassState = "completed" | "active" | "upcoming" | "past_no_checkin";

function getClassState(cls: OverviewClass): ClassState {
  if (cls.sessionStatus === "COMPLETED") return "completed";
  if (cls.sessionStatus === "ACTIVE") return "active";
  if (isPast(cls.endTime) && !cls.sessionId) return "past_no_checkin";
  return "upcoming";
}

// ─── Next class card ──────────────────────────────────────────────────────────

function NextClassCard({ cls, slug }: { cls: OverviewClass; slug: string }) {
  const router = useRouter();
  const state = getClassState(cls);
  const minsUntil = minutesUntil(cls.startTime);
  const minsSince = minutesSince(cls.startTime);

  return (
    <div className="bg-white/70 border border-black/8 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-accent">
            {state === "active" ? "Active session" : "Next class"}
          </p>
          <h2 className="text-[24px] font-semibold tracking-tight leading-tight">
            {cls.subjectName}
          </h2>
          <p className="text-[15px] text-text-accent">
            {cls.className}
            {cls.classCode && (
              <span className="ml-1.5 font-mono text-[12px] bg-accent px-1.5 py-0.5 rounded">
                {cls.classCode}
              </span>
            )}
          </p>
        </div>
        {cls.arrivalStatus && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${ARRIVAL_COLOURS[cls.arrivalStatus]}`}>
            {ARRIVAL_LABELS[cls.arrivalStatus]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-[13px] text-text-accent flex-wrap">
        <span className="flex items-center gap-1.5">
          <Clock size={13} />
          {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
        </span>
        {cls.roomName && (
          <span>{cls.roomName}</span>
        )}
        {cls.periodLabel && (
          <span className="bg-accent px-2 py-0.5 rounded-full text-[11px]">{cls.periodLabel}</span>
        )}
      </div>

      {/* Status / timing message */}
      {state === "upcoming" && minsUntil > 0 && (
        <p className="text-[13px] text-text-accent">
          {minsUntil < 60
            ? `Starts in ${minsUntil} minute${minsUntil !== 1 ? "s" : ""}`
            : `Starts at ${formatTime(cls.startTime)}`}
        </p>
      )}
      {state === "active" && (
        <p className="text-[13px] text-blue font-medium">
          {cls.checkinAt
            ? `Started ${minsSince} minute${minsSince !== 1 ? "s" : ""} ago`
            : "In progress"}
        </p>
      )}

      {/* CTA */}
      <div className="pt-1">
        {state === "active" && cls.sessionId ? (
          <button
            type="button"
            onClick={() => router.push(`/${slug}/attendance/record?session=${cls.sessionId}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue text-white font-semibold text-[15px] hover:bg-blue/90 active:scale-[0.98] transition-all"
          >
            <Users size={16} />
            Take attendance
            <ChevronRight size={16} />
          </button>
        ) : state === "upcoming" || (state === "past_no_checkin") ? (
          <button
            type="button"
            onClick={() => router.push(`/${slug}/attendance/session`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background font-semibold text-[15px] hover:bg-foreground/85 active:scale-[0.98] transition-all"
          >
            <QrCode size={16} />
            Sign in
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push(`/${slug}/attendance/record?session=${cls.sessionId}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent hover:bg-accent/70 font-semibold text-[15px] active:scale-[0.98] transition-all"
          >
            <CheckCircle2 size={16} className="text-green" />
            View attendance
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Schedule row ─────────────────────────────────────────────────────────────

function ScheduleRow({ cls, slug }: { cls: OverviewClass; slug: string }) {
  const router = useRouter();
  const state = getClassState(cls);

  const stateIcon = {
    completed: <CheckCircle2 size={14} className="text-green" />,
    active: <span className="w-2 h-2 rounded-full bg-blue animate-pulse inline-block" />,
    upcoming: <span className="w-2 h-2 rounded-full bg-black/20 inline-block" />,
    past_no_checkin: <AlertCircle size={14} className="text-amber-500" />,
  }[state];

  const stateLabel = {
    completed: "Completed",
    active: "Active",
    upcoming: "Upcoming",
    past_no_checkin: "No check-in",
  }[state];

  const stateColour = {
    completed: "text-green",
    active: "text-blue",
    upcoming: "text-text-accent",
    past_no_checkin: "text-amber-600",
  }[state];

  const handleClick = () => {
    if (cls.sessionId) {
      router.push(`/${slug}/attendance/record?session=${cls.sessionId}`);
    } else {
      router.push(`/${slug}/attendance/session`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center gap-4 px-4 py-3 border-b border-black/5 last:border-0 hover:bg-accent/30 transition-colors text-left group"
    >
      <div className="w-16 shrink-0">
        <p className="text-[13px] font-mono font-medium">{formatTime(cls.startTime)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate">{cls.subjectName}</p>
        <p className="text-[12px] text-text-accent truncate">
          {cls.className}
          {cls.roomName ? ` · ${cls.roomName}` : ""}
        </p>
      </div>
      <div className={`flex items-center gap-1.5 text-[12px] font-medium shrink-0 ${stateColour}`}>
        {stateIcon}
        {stateLabel}
      </div>
      <ChevronRight size={14} className="text-text-accent/0 group-hover:text-text-accent/50 transition-colors shrink-0" />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TeacherOverviewProps {
  data: TeacherOverviewData;
}

export function TeacherOverview({ data }: TeacherOverviewProps) {
  const { greeting: greet, userName, orgName, orgSlug, classes, hasSetup } = data;

  // Find the "focus" class: active session first, then next upcoming, then last completed
  const activeClass = classes.find((c) => c.sessionStatus === "ACTIVE");
  const nextUpcoming = classes.find((c) => !c.sessionStatus && !isPast(c.endTime));
  const focusClass = activeClass ?? nextUpcoming ?? null;

  const completed = classes.filter((c) => c.sessionStatus === "COMPLETED").length;
  const active = classes.filter((c) => c.sessionStatus === "ACTIVE").length;
  const upcoming = classes.filter((c) => !c.sessionStatus && !isPast(c.endTime)).length;
  const allDone = classes.length > 0 && upcoming === 0 && active === 0;

  const today = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="px-8 sm:px-14 pb-24">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-[38px] font-semibold tracking-tight leading-tight">
          {greet}, {userName.split(" ")[0]}
        </h1>
        <p className="text-[16px] text-text-accent mt-1 flex items-center gap-1.5">
          <CalendarDays size={15} />
          {today} · {orgName}
        </p>
      </div>

      {/* Empty org state */}
      {!hasSetup && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-white/60 border border-black/8 rounded-2xl space-y-4"
        >
          <p className="text-[18px] font-semibold">Welcome to Roll SYNC</p>
          <p className="text-[14px] text-text-accent">
            Your organization is ready. Start by setting up the timetable so your classes appear here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${orgSlug}/timetable`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue text-white text-[13px] font-medium hover:bg-blue/90 transition-colors"
            >
              Set up timetable
              <ChevronRight size={13} />
            </Link>
            <Link
              href={`/${orgSlug}/people`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent hover:bg-accent/70 text-[13px] font-medium transition-colors"
            >
              Add people
            </Link>
          </div>
        </motion.div>
      )}

      {/* Today's snapshot metrics */}
      {classes.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Classes", value: classes.length },
            { label: "Completed", value: completed },
            { label: "Active", value: active },
            { label: "Upcoming", value: upcoming },
          ].map((m) => (
            <div key={m.label} className="bg-white/60 border border-black/8 rounded-2xl p-4 text-center">
              <p className="text-[28px] font-semibold tracking-tight leading-none">{m.value}</p>
              <p className="text-[11px] font-medium text-text-accent mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Focus card — next class or all done */}
      {allDone ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-green-accent/40 border border-green/20 rounded-2xl"
        >
          <div className="flex items-center gap-3 mb-1">
            <CheckCircle2 size={20} className="text-green" />
            <p className="text-[18px] font-semibold">You&apos;re done for today</p>
          </div>
          <p className="text-[14px] text-text-accent">
            All {classes.length} class{classes.length !== 1 ? "es" : ""} completed for today.
          </p>
        </motion.div>
      ) : focusClass ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <NextClassCard cls={focusClass} slug={orgSlug} />
        </motion.div>
      ) : classes.length === 0 && hasSetup ? (
        <div className="mb-8 p-6 bg-white/60 border border-black/8 rounded-2xl text-center">
          <BookOpen size={24} className="text-text-accent mx-auto mb-2" />
          <p className="text-[16px] font-medium">No classes today</p>
          <p className="text-[13px] text-text-accent mt-1">
            Your timetable has no classes scheduled for today.
          </p>
          <Link
            href={`/${orgSlug}/timetable`}
            className="inline-flex items-center gap-1 mt-3 text-[13px] text-blue hover:underline"
          >
            View timetable <ChevronRight size={12} />
          </Link>
        </div>
      ) : null}

      {/* Today's schedule */}
      {classes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[20px] font-semibold tracking-tight">Today&apos;s classes</h2>
            <Link href={`/${orgSlug}/attendance/session`} className="text-[13px] text-blue hover:underline">
              Session view →
            </Link>
          </div>
          <div className="bg-white/60 border border-black/8 rounded-2xl overflow-hidden">
            {classes.map((cls) => (
              <ScheduleRow key={cls.timetableEntryId} cls={cls} slug={orgSlug} />
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="mt-8">
        <h2 className="text-[20px] font-semibold tracking-tight mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Attendance", href: `/${orgSlug}/attendance/session`, icon: <QrCode size={15} /> },
            { label: "Timetable", href: `/${orgSlug}/timetable`, icon: <CalendarDays size={15} /> },
            { label: "People", href: `/${orgSlug}/people`, icon: <Users size={15} /> },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-2.5 p-4 bg-white/60 border border-black/8 rounded-2xl hover:bg-accent/60 transition-colors text-[14px] font-medium"
            >
              <span className="text-text-accent">{a.icon}</span>
              {a.label}
              <ChevronRight size={13} className="ml-auto text-text-accent/50" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
