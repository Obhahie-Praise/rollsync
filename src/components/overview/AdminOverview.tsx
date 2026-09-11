"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Users,
  BarChart2,
  BookOpen,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import type {
  AdminOverviewData,
  AdminTodaySession,
  WeeklyAttendancePoint,
  AttentionItem,
} from "@/lib/overview-actions";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatCheckin(d: Date): string {
  return new Date(d).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
}

const ARRIVAL_COLOURS: Record<string, string> = {
  EARLY: "text-blue bg-blue/10",
  ON_TIME: "text-green bg-green-accent",
  LATE: "text-amber-700 bg-amber-50",
  VERY_LATE: "text-red-700 bg-red-50",
};

const ARRIVAL_LABELS: Record<string, string> = {
  EARLY: "Early",
  ON_TIME: "On time",
  LATE: "Late",
  VERY_LATE: "Very late",
};

const STATUS_COLOURS: Record<string, string> = {
  ACTIVE: "text-blue bg-blue/10",
  COMPLETED: "text-green bg-green-accent",
  CANCELLED: "text-text-accent bg-accent",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// ─── Metric card ──────────────────────────────────────────────────────────────

interface MetricProps {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}

function Metric({ label, value, sub, icon, accent = "" }: MetricProps) {
  return (
    <div className="bg-white/60 border border-black/8 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-text-accent">{label}</p>
        <span className="text-text-accent/60">{icon}</span>
      </div>
      <p className={`text-[28px] font-semibold tracking-tight leading-none ${accent}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-text-accent">{sub}</p>}
    </div>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({ session, slug }: { session: AdminTodaySession; slug: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/${slug}/attendance/record?session=${session.id}`)}
      className="w-full flex items-start gap-4 px-4 py-3.5 border-b border-black/5 last:border-0 hover:bg-accent/30 transition-colors text-left group"
    >
      <div className="w-[72px] shrink-0 pt-0.5">
        <p className="text-[13px] font-mono font-medium">{formatTime(session.startTime)}</p>
        <p className="text-[11px] font-mono text-text-accent">{formatTime(session.endTime)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold">{session.subjectName}</p>
          <span className="text-[12px] text-text-accent">
            {session.className}
            {session.classCode && (
              <span className="ml-1 font-mono text-[11px] bg-accent px-1 py-0.5 rounded">
                {session.classCode}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <p className="text-[12px] text-text-accent">{session.teacherName}</p>
          <span className="text-[11px] text-text-accent">
            {formatCheckin(session.checkinAt)}
          </span>
          {session.recordCount > 0 && (
            <span className="text-[11px] text-text-accent">
              {session.presentCount}/{session.recordCount} present
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ARRIVAL_COLOURS[session.arrivalStatus]}`}>
          {ARRIVAL_LABELS[session.arrivalStatus]}
        </span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[session.status]}`}>
          {STATUS_LABELS[session.status]}
        </span>
        <ChevronRight size={13} className="text-text-accent/0 group-hover:text-text-accent/50 transition-colors" />
      </div>
    </button>
  );
}

// ─── Attention item ───────────────────────────────────────────────────────────

function AttentionCard({ item }: { item: AttentionItem }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-black/5 last:border-0">
      <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{item.label}</p>
        <p className="text-[12px] text-text-accent mt-0.5">{item.detail}</p>
      </div>
    </div>
  );
}

// ─── Weekly trend (no charting lib — simple bar visualization) ───────────────

function WeeklyTrend({ points }: { points: WeeklyAttendancePoint[] }) {
  const hasData = points.some((p) => p.total > 0);
  if (!hasData) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5 h-16">
        {points.map((p) => {
          const height = p.rate !== null ? Math.round((p.rate / 100) * 64) : 0;
          const isToday = p.date === new Date().toISOString().slice(0, 10);
          return (
            <div key={p.date} className="flex-1 flex flex-col items-center gap-1" title={p.rate !== null ? `${p.rate}%` : "No data"}>
              <div className="w-full relative flex items-end" style={{ height: 64 }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${isToday ? "bg-blue" : "bg-blue/30"}`}
                  style={{ height: height || 2 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {points.map((p) => {
          const isToday = p.date === new Date().toISOString().slice(0, 10);
          return (
            <div key={p.date} className="flex-1 text-center">
              <p className={`text-[11px] font-medium ${isToday ? "text-blue" : "text-text-accent"}`}>
                {p.label}
              </p>
              {p.rate !== null ? (
                <p className="text-[10px] text-text-accent">{p.rate}%</p>
              ) : (
                <p className="text-[10px] text-text-accent/40">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Setup checklist ──────────────────────────────────────────────────────────

interface SetupItem {
  label: string;
  done: boolean;
}

function SetupChecklist({ items }: { items: SetupItem[] }) {
  const allDone = items.every((i) => i.done);
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5 py-1">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-green-accent" : "bg-accent border border-black/10"}`}>
            {item.done ? <Check size={9} className="text-green" strokeWidth={3} /> : null}
          </div>
          <p className={`text-[13px] ${item.done ? "text-foreground" : "text-text-accent"}`}>
            {item.label}
          </p>
        </div>
      ))}
      {allDone && (
        <p className="text-[12px] text-green font-medium pt-1 flex items-center gap-1">
          <CheckCircle2 size={12} />
          Everything is configured
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AdminOverviewProps {
  data: AdminOverviewData;
}

export function AdminOverview({ data }: AdminOverviewProps) {
  const {
    greeting: greet,
    userName,
    orgName,
    orgSlug,
    expectedSessions,
    startedSessions,
    completedSessions,
    sessions,
    attendanceSummary,
    attentionItems,
    weeklyTrend,
    setup,
    isEmpty,
  } = data;

  const notStarted = Math.max(0, expectedSessions - startedSessions);

  const today = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const setupItems: SetupItem[] = [
    { label: "People added", done: setup.peopleAdded },
    { label: "Classes configured", done: setup.classesConfigured },
    { label: "Subjects configured", done: setup.subjectsConfigured },
    { label: "Teachers assigned", done: setup.teachersAssigned },
    { label: "Rooms configured", done: setup.roomsConfigured },
    { label: "Timetable configured", done: setup.timetableConfigured },
    { label: "Attendance recorded", done: setup.attendanceRecorded },
  ];

  const setupDone = setupItems.filter((i) => i.done).length;
  const setupProgress = Math.round((setupDone / setupItems.length) * 100);

  // ── Empty org welcome ─────────────────────────────────────────────────────

  if (isEmpty) {
    return (
      <div className="px-8 sm:px-14 pb-24">
        <div className="mb-8">
          <h1 className="text-[38px] font-semibold tracking-tight">
            {greet}, {userName.split(" ")[0]}
          </h1>
          <p className="text-[16px] text-text-accent mt-1">{orgName}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl p-7 bg-white/70 border border-black/8 rounded-2xl space-y-4"
        >
          <p className="text-[22px] font-semibold tracking-tight">Welcome to Roll SYNC</p>
          <p className="text-[14px] text-text-accent leading-relaxed">
            Your organization is ready. Start by adding people, setting up classes,
            and building your timetable. Once configured, this dashboard will show
            live attendance activity.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${orgSlug}/people`} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue text-white text-[13px] font-medium hover:bg-blue/90 transition-colors">
              Add people <ChevronRight size={13} />
            </Link>
            <Link href={`/${orgSlug}/timetable`} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent hover:bg-accent/70 text-[13px] font-medium transition-colors">
              Set up timetable
            </Link>
          </div>
        </motion.div>

        <div className="mt-8 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-semibold tracking-tight">Setup progress</h2>
            <span className="text-[13px] text-text-accent">{setupDone}/{setupItems.length}</span>
          </div>
          <div className="w-full h-1.5 bg-accent rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-blue"
              initial={{ width: 0 }}
              animate={{ width: `${setupProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <SetupChecklist items={setupItems} />
        </div>
      </div>
    );
  }

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

      {/* Today's metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Metric label="Expected" value={expectedSessions} icon={<CalendarDays size={14} />} />
        <Metric label="Started" value={startedSessions} icon={<Clock size={14} />} accent={startedSessions > 0 ? "text-blue" : ""} />
        <Metric label="Completed" value={completedSessions} icon={<CheckCircle2 size={14} />} accent={completedSessions > 0 ? "text-green" : ""} />
        <Metric label="Not started" value={notStarted} icon={<AlertCircle size={14} />} accent={notStarted > 0 ? "text-amber-700" : ""} />
      </div>

      {/* Two-column layout for wider screens */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: sessions + attention */}
        <div className="space-y-6 min-w-0">
          {/* Today's sessions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[20px] font-semibold tracking-tight">Today&apos;s sessions</h2>
              <Link href={`/${orgSlug}/attendance/session`} className="text-[13px] text-blue hover:underline">
                All sessions →
              </Link>
            </div>

            {sessions.length === 0 ? (
              <div className="py-10 text-center bg-white/50 border border-black/8 rounded-2xl">
                <CalendarDays size={20} className="text-text-accent mx-auto mb-2" />
                <p className="text-[14px] font-medium">No sessions recorded yet</p>
                <p className="text-[12px] text-text-accent mt-1">
                  Teachers have not checked in for today.
                </p>
              </div>
            ) : (
              <div className="bg-white/60 border border-black/8 rounded-2xl overflow-hidden">
                {sessions.map((s) => (
                  <SessionRow key={s.id} session={s} slug={orgSlug} />
                ))}
              </div>
            )}

            {notStarted > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[12px] text-amber-800">
                  {notStarted} scheduled session{notStarted !== 1 ? "s" : ""} not started today.
                </p>
              </div>
            )}
          </section>

          {/* Needs attention */}
          <section>
            <h2 className="text-[20px] font-semibold tracking-tight mb-3">Needs attention</h2>
            {attentionItems.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-accent/30 border border-green/20 rounded-2xl">
                <CheckCircle2 size={18} className="text-green shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold">Everything looks good</p>
                  <p className="text-[12px] text-text-accent mt-0.5">No outstanding issues.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/60 border border-black/8 rounded-2xl overflow-hidden">
                {attentionItems.map((item, i) => (
                  <AttentionCard key={i} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: attendance snapshot + trend + setup + actions */}
        <div className="space-y-5">
          {/* Attendance snapshot */}
          <section className="bg-white/60 border border-black/8 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold tracking-tight">Attendance today</h2>
              <Link href={`/${orgSlug}/reports`} className="text-[12px] text-blue hover:underline">
                Reports →
              </Link>
            </div>

            {attendanceSummary.total === 0 ? (
              <p className="text-[13px] text-text-accent py-2">
                No attendance recorded yet.
              </p>
            ) : (
              <>
                {attendanceSummary.rate !== null && (
                  <div>
                    <p className="text-[36px] font-bold tracking-tight text-blue leading-none">
                      {attendanceSummary.rate}%
                    </p>
                    <p className="text-[12px] text-text-accent mt-0.5">Attendance rate</p>
                  </div>
                )}
                <div className="space-y-1.5 pt-1 border-t border-black/5">
                  {[
                    { label: "Present", value: attendanceSummary.present, colour: "text-green font-semibold" },
                    { label: "Absent", value: attendanceSummary.absent, colour: "text-red-600 font-semibold" },
                    { label: "Late", value: attendanceSummary.late, colour: "text-amber-700" },
                    { label: "Excused", value: attendanceSummary.excused, colour: "text-text-accent" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-[13px]">
                      <span className="text-text-accent">{row.label}</span>
                      <span className={row.colour}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Weekly trend */}
          {weeklyTrend.length > 0 && (
            <section className="bg-white/60 border border-black/8 rounded-2xl p-5 space-y-3">
              <h2 className="text-[16px] font-semibold tracking-tight">Last 7 days</h2>
              <WeeklyTrend points={weeklyTrend} />
            </section>
          )}

          {/* Organization setup */}
          <section className="bg-white/60 border border-black/8 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold tracking-tight">Organization setup</h2>
              <Link href={`/${orgSlug}/organization`} className="text-[12px] text-blue hover:underline">
                View →
              </Link>
            </div>
            <div className="w-full h-1 bg-accent rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-blue"
                initial={{ width: 0 }}
                animate={{ width: `${setupProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <SetupChecklist items={setupItems} />
          </section>

          {/* Quick actions */}
          <section className="bg-white/60 border border-black/8 rounded-2xl p-5 space-y-2">
            <h2 className="text-[16px] font-semibold tracking-tight mb-3">Quick actions</h2>
            {[
              { label: "Add person", href: `/${orgSlug}/people`, icon: <Users size={14} /> },
              { label: "Manage timetable", href: `/${orgSlug}/timetable`, icon: <CalendarDays size={14} /> },
              { label: "View attendance", href: `/${orgSlug}/attendance/session`, icon: <Clock size={14} /> },
              { label: "View reports", href: `/${orgSlug}/reports`, icon: <BarChart2 size={14} /> },
              { label: "Organization", href: `/${orgSlug}/organization`, icon: <BookOpen size={14} /> },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent/60 transition-colors text-[13px] font-medium group"
              >
                <span className="text-text-accent">{a.icon}</span>
                {a.label}
                <ChevronRight size={12} className="ml-auto text-text-accent/0 group-hover:text-text-accent/50 transition-colors" />
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
