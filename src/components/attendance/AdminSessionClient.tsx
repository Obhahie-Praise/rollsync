"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchAdminSessions,
  type AdminSessionsOverview,
  type AdminSessionItem,
} from "@/lib/attendance-actions";

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatCheckin(d: Date): string {
  return new Date(d).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateKey(key: string): string {
  const [y, mo, d] = key.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Metric card ──────────────────────────────────────────────────────────────

interface MetricProps {
  label: string;
  value: number;
  total?: number;
  icon: React.ReactNode;
  colour?: string;
}

function Metric({ label, value, total, icon, colour = "" }: MetricProps) {
  return (
    <div className="bg-white/60 border border-black/8 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-text-accent">{label}</p>
        <span className="text-text-accent/60">{icon}</span>
      </div>
      <p className={`text-[28px] font-semibold tracking-tight leading-none ${colour}`}>
        {value}
        {total !== undefined && total > 0 && (
          <span className="text-[16px] font-normal text-text-accent ml-1">
            / {total}
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────

interface SessionRowProps {
  session: AdminSessionItem;
  slug: string;
}

function SessionRow({ session, slug }: SessionRowProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        router.push(`/${slug}/attendance/record?session=${session.id}`)
      }
      className="w-full flex items-start gap-4 px-4 py-3.5 border-b border-black/5 last:border-0 hover:bg-accent/30 transition-colors text-left group"
    >
      {/* Time */}
      <div className="w-20 shrink-0 pt-0.5">
        <p className="text-[13px] font-mono font-medium">
          {formatTime(session.startTime)}
        </p>
        <p className="text-[11px] text-text-accent font-mono">
          {formatTime(session.endTime)}
        </p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[15px] font-semibold truncate">
            {session.subjectName}
          </p>
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
            Checked in {formatCheckin(session.checkinAt)}
          </span>
          {session.recordCount > 0 && (
            <span className="text-[11px] text-text-accent">
              {session.presentCount}/{session.recordCount} present
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            ARRIVAL_COLOURS[session.arrivalStatus]
          }`}
        >
          {ARRIVAL_LABELS[session.arrivalStatus]}
        </span>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            STATUS_COLOURS[session.status]
          }`}
        >
          {STATUS_LABELS[session.status]}
        </span>
        <ChevronRight
          size={14}
          className="text-text-accent/0 group-hover:text-text-accent/60 transition-colors"
        />
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AdminSessionClientProps {
  orgSlug: string;
  initialData: AdminSessionsOverview;
  initialDateKey: string;
}

export function AdminSessionClient({
  orgSlug,
  initialData,
  initialDateKey,
}: AdminSessionClientProps) {
  const [data, setData] = useState<AdminSessionsOverview>(initialData);
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const notStarted = data.expectedSessions - data.startedSessions;

  const load = (key: string) => {
    setDateKey(key);
    setError("");
    startTransition(async () => {
      const result = await fetchAdminSessions(orgSlug, key);
      if (result.ok) setData(result.data);
      else setError(result.error);
    });
  };

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-8 sm:px-14 pb-24">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[40px] font-semibold tracking-tight">
          Attendance
        </h1>
        <p className="text-[18px] text-text-accent mt-1">
          Organization-wide attendance overview
        </p>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => load(todayKey)}
          disabled={isPending}
          className={[
            "px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors",
            dateKey === todayKey
              ? "bg-blue text-white"
              : "bg-accent hover:bg-accent/70 text-foreground",
          ].join(" ")}
        >
          Today
        </button>

        <input
          type="date"
          value={dateKey}
          onChange={(e) => load(e.target.value)}
          disabled={isPending}
          className="px-3 py-1.5 rounded-full text-[13px] font-medium bg-accent border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all disabled:opacity-60"
        />

        {isPending && (
          <Loader2 size={15} className="animate-spin text-text-accent" />
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700"
          >
            <AlertCircle size={14} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Metric
          label="Expected sessions"
          value={data.expectedSessions}
          icon={<CalendarDays size={15} />}
        />
        <Metric
          label="Started"
          value={data.startedSessions}
          total={data.expectedSessions}
          icon={<Clock size={15} />}
          colour={data.startedSessions > 0 ? "text-blue" : ""}
        />
        <Metric
          label="Completed"
          value={data.completedSessions}
          icon={<CheckCircle2 size={15} />}
          colour={data.completedSessions > 0 ? "text-green" : ""}
        />
        <Metric
          label="Not started"
          value={notStarted < 0 ? 0 : notStarted}
          icon={<Users size={15} />}
          colour={notStarted > 0 ? "text-amber-700" : ""}
        />
      </div>

      {/* Session list */}
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight mb-1">
          Sessions
        </h2>
        <p className="text-[13px] text-text-accent mb-4">
          {formatDateKey(dateKey)}
        </p>

        {data.sessions.length === 0 ? (
          <div className="py-14 text-center bg-white/40 border border-black/8 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-accent mx-auto mb-3 flex items-center justify-center">
              <CalendarDays size={20} className="text-text-accent" />
            </div>
            <p className="text-[15px] font-medium">No sessions recorded</p>
            <p className="text-[13px] text-text-accent mt-1">
              No teachers have checked in for this date.
            </p>
          </div>
        ) : (
          <div className="bg-white/60 border border-black/8 rounded-2xl overflow-hidden">
            {data.sessions.map((sess) => (
              <SessionRow key={sess.id} session={sess} slug={orgSlug} />
            ))}
          </div>
        )}

        {data.expectedSessions > data.startedSessions && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-[13px] text-amber-800 font-medium">
              {notStarted} scheduled{" "}
              {notStarted === 1 ? "session has" : "sessions have"} not been
              started yet for this date.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
