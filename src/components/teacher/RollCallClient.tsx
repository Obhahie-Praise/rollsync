"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  X,
  Check,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  saveRollCall,
  completeSession,
  type AttendanceSessionSummary,
  type StudentRollItem,
} from "@/lib/attendance-actions";
import type { AttendanceStatus } from "@/generated/prisma/client";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  PRESENT: {
    label: "Present",
    color: "text-green",
    bg: "bg-green/10",
    border: "border-green/30",
  },
  ABSENT: {
    label: "Absent",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  LATE: {
    label: "Late",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  EXCUSED: {
    label: "Excused",
    color: "text-blue",
    bg: "bg-blue/10",
    border: "border-blue/20",
  },
};

const STATUS_CYCLE: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

// ─── Student row ──────────────────────────────────────────────────────────────

interface StudentRowProps {
  student: StudentRollItem;
  onToggle: (personId: string) => void;
  isSessionComplete: boolean;
}

function StudentRow({ student, onToggle, isSessionComplete }: StudentRowProps) {
  const status = student.status;
  const cfg = status ? STATUS_CONFIG[status] : null;

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-black/5 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium truncate">{student.name}</p>
        {student.orgIdentifier && (
          <p className="text-[12px] text-text-accent font-mono">
            {student.orgIdentifier}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => !isSessionComplete && onToggle(student.personId)}
        disabled={isSessionComplete}
        className={[
          "shrink-0 min-w-[82px] py-2 px-3 rounded-xl text-[13px] font-semibold border transition-all active:scale-[0.95]",
          "disabled:cursor-default",
          cfg
            ? `${cfg.bg} ${cfg.border} ${cfg.color}`
            : "bg-accent border-transparent text-text-accent",
        ].join(" ")}
        aria-label={`${student.name}: ${status ?? "unmarked"}`}
      >
        {cfg ? cfg.label : "Mark"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RollCallClientProps {
  orgSlug: string;
  initialSession: AttendanceSessionSummary;
  initialStudents: StudentRollItem[];
}

export function RollCallClient({
  orgSlug,
  initialSession,
  initialStudents,
}: RollCallClientProps) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRollItem[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [isSaving, startSave] = useTransition();
  const [isCompleting, startComplete] = useTransition();
  const [saveError, setSaveError] = useState("");
  const isSessionComplete = initialSession.status === "COMPLETED";

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.orgIdentifier ?? "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const stats = useMemo(() => {
    const total = students.length;
    const marked = students.filter((s) => s.status !== null).length;
    const present = students.filter((s) => s.status === "PRESENT").length;
    const absent = students.filter((s) => s.status === "ABSENT").length;
    const late = students.filter((s) => s.status === "LATE").length;
    return { total, marked, present, absent, late };
  }, [students]);

  const handleToggle = useCallback((personId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.personId !== personId) return s;
        const currentIndex = s.status ? STATUS_CYCLE.indexOf(s.status) : -1;
        const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
        return { ...s, status: nextStatus };
      })
    );
  }, []);

  const handleMarkAll = useCallback((status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  }, []);

  const recordsToSave = useCallback(
    () =>
      students
        .filter((s) => s.status !== null)
        .map((s) => ({ personId: s.personId, status: s.status! })),
    [students]
  );

  const handleSave = useCallback(() => {
    setSaveError("");
    startSave(async () => {
      const result = await saveRollCall({
        slug: orgSlug,
        sessionId: initialSession.id,
        records: recordsToSave(),
      });
      if (!result.ok) setSaveError(result.error);
    });
  }, [orgSlug, initialSession.id, recordsToSave]);

  const handleComplete = useCallback(() => {
    setSaveError("");
    startComplete(async () => {
      const records = recordsToSave();
      if (records.length > 0) {
        await saveRollCall({
          slug: orgSlug,
          sessionId: initialSession.id,
          records,
        });
      }
      const result = await completeSession(orgSlug, initialSession.id);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      router.push(`/${orgSlug}/teacher/today`);
    });
  }, [orgSlug, initialSession.id, recordsToSave, router]);

  const formatTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <div className="px-5 sm:px-8 pb-36">
      {/* Header */}
      <div className="pt-2 pb-5">
        <Link
          href={`/${orgSlug}/teacher/today`}
          className="inline-flex items-center gap-1 text-[13px] text-text-accent hover:text-foreground transition-colors mb-5"
        >
          <ArrowLeft size={13} />
          Today
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] sm:text-[30px] font-semibold tracking-tight">
              {initialSession.subjectName}
            </h1>
            <p className="text-[14px] text-text-accent mt-0.5">
              {initialSession.className} ·{" "}
              {formatTime(initialSession.startTime)}–
              {formatTime(initialSession.endTime)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                  isSessionComplete ? "text-green" : "text-blue"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSessionComplete ? "bg-green" : "bg-blue"
                  }`}
                />
                {isSessionComplete ? "Completed" : "In progress"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-[13px]">
          <span className="flex items-center gap-1 text-text-accent">
            <Users size={13} />
            {stats.total} students
          </span>
          <span className="text-green font-medium">{stats.present} present</span>
          <span className="text-red-600 font-medium">{stats.absent} absent</span>
          {stats.late > 0 && (
            <span className="text-amber-600 font-medium">{stats.late} late</span>
          )}
          <span className="text-text-accent">
            {stats.marked}/{stats.total} marked
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-accent pointer-events-none"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students…"
          className="w-full h-10 pl-9 pr-9 rounded-xl text-[14px] bg-white/60 border border-black/10 outline-none focus:ring-2 focus:ring-blue/30 transition-all"
          aria-label="Search students"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-accent hover:text-foreground"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Mark all strip */}
      {!isSessionComplete && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-[12px] text-text-accent shrink-0">
            Mark all:
          </span>
          {STATUS_CYCLE.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleMarkAll(s)}
                disabled={isSaving || isCompleting}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all disabled:opacity-50 ${cfg.bg} ${cfg.border} ${cfg.color}`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Roll call list */}
      {filteredStudents.length > 0 ? (
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-white/70 border border-black/8 px-4"
        >
          {filteredStudents.map((s) => (
            <StudentRow
              key={s.personId}
              student={s}
              onToggle={handleToggle}
              isSessionComplete={isSessionComplete}
            />
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-10 text-text-accent">
          <p className="text-[14px]">
            {search
              ? "No students match your search."
              : "No students in this class."}
          </p>
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          <AlertCircle size={14} className="shrink-0" />
          {saveError}
        </div>
      )}

      {/* Sticky action footer */}
      {!isSessionComplete && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-black/8 px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isCompleting}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-accent text-[15px] font-semibold hover:bg-accent/70 transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={isSaving || isCompleting || stats.marked === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue text-white text-[15px] font-semibold hover:bg-blue/90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {isCompleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {isCompleting
              ? "Finishing…"
              : `Finish (${stats.marked}/${stats.total})`}
          </button>
        </div>
      )}

      {isSessionComplete && (
        <div className="mt-8 text-center">
          <Link
            href={`/${orgSlug}/teacher/today`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue text-white text-[14px] font-semibold hover:bg-blue/90 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to today
          </Link>
        </div>
      )}
    </div>
  );
}
