"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Users,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  saveRollCall,
  type AttendanceSessionSummary,
  type StudentRollItem,
} from "@/lib/attendance-actions";
import type { AttendanceStatus } from "@/generated/prisma/client";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ARRIVAL_LABELS: Record<string, string> = {
  EARLY: "Early",
  ON_TIME: "On time",
  LATE: "Late",
  VERY_LATE: "Very late",
};

const ARRIVAL_COLOURS: Record<string, string> = {
  EARLY: "text-blue",
  ON_TIME: "text-green",
  LATE: "text-amber-700",
  VERY_LATE: "text-red-700",
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

// ─── Student row ──────────────────────────────────────────────────────────────

interface StudentRowProps {
  student: StudentRollItem;
  localStatus: AttendanceStatus | null;
  onMark: (personId: string, status: AttendanceStatus) => void;
}

function StudentRow({ student, localStatus, onMark }: StudentRowProps) {
  const status = localStatus ?? student.status;

  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-3 border-b border-black/5 last:border-0 transition-colors",
        status === "PRESENT"
          ? "bg-green-accent/30"
          : status === "ABSENT"
            ? "bg-red-50/50"
            : "hover:bg-accent/20",
      ].join(" ")}
    >
      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate">{student.name}</p>
        {student.orgIdentifier && (
          <p className="text-[11px] font-mono text-text-accent">
            {student.orgIdentifier}
          </p>
        )}
      </div>

      {/* Status badge */}
      {status && (
        <span
          className={[
            "text-[11px] font-medium px-2 py-0.5 rounded-full mr-2",
            status === "PRESENT"
              ? "bg-green-accent text-green"
              : status === "ABSENT"
                ? "bg-red-100 text-red-700"
                : "bg-accent text-text-accent",
          ].join(" ")}
        >
          {status === "PRESENT"
            ? "Present"
            : status === "ABSENT"
              ? "Absent"
              : status}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onMark(student.personId, "PRESENT")}
          aria-label={`Mark ${student.name} present`}
          className={[
            "w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95",
            status === "PRESENT"
              ? "bg-green text-white shadow-sm"
              : "bg-accent hover:bg-green/20 text-text-accent hover:text-green",
          ].join(" ")}
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => onMark(student.personId, "ABSENT")}
          aria-label={`Mark ${student.name} absent`}
          className={[
            "w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95",
            status === "ABSENT"
              ? "bg-red-500 text-white shadow-sm"
              : "bg-accent hover:bg-red-100 text-text-accent hover:text-red-600",
          ].join(" ")}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RecordClientProps {
  orgSlug: string;
  session: AttendanceSessionSummary;
  students: StudentRollItem[];
}

export function RecordClient({
  orgSlug,
  session,
  students,
}: RecordClientProps) {
  const router = useRouter();

  // Local roll state — tracks unsaved changes
  const [localMarks, setLocalMarks] = useState<
    Map<string, AttendanceStatus>
  >(() => {
    const m = new Map<string, AttendanceStatus>();
    students.forEach((s) => {
      if (s.status) m.set(s.personId, s.status);
    });
    return m;
  });

  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleMark = useCallback(
    (personId: string, status: AttendanceStatus) => {
      setLocalMarks((prev) => {
        const next = new Map(prev);
        next.set(personId, status);
        return next;
      });
      setSaved(false);
    },
    []
  );

  const handleMarkAll = (status: AttendanceStatus) => {
    setLocalMarks(() => {
      const next = new Map<string, AttendanceStatus>();
      students.forEach((s) => next.set(s.personId, status));
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    setSaveError("");
    setSaved(false);
    startTransition(async () => {
      const records = Array.from(localMarks.entries()).map(
        ([personId, status]) => ({ personId, status })
      );
      const result = await saveRollCall({
        slug: orgSlug,
        sessionId: session.id,
        records,
      });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else {
        setSaveError(result.error);
      }
    });
  };

  // Filtered student list
  const filtered = query.trim()
    ? students.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.orgIdentifier ?? "")
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : students;

  // Summary counts (live)
  const present = Array.from(localMarks.values()).filter(
    (v) => v === "PRESENT"
  ).length;
  const absent = Array.from(localMarks.values()).filter(
    (v) => v === "ABSENT"
  ).length;
  const unmarked = students.length - localMarks.size;

  const isDirty = localMarks.size > 0;

  return (
    <div className="px-8 sm:px-14 pb-32">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push(`/${orgSlug}/attendance/session`)}
        className="flex items-center gap-1.5 text-[13px] text-text-accent hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Back to sessions
      </button>

      {/* Session header */}
      <div className="mb-6 p-5 bg-white/60 border border-black/8 rounded-2xl space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">
              {session.subjectName}
            </h1>
            <p className="text-[15px] text-text-accent">
              {session.className}
              {session.classCode && (
                <span className="ml-1.5 font-mono text-[12px] bg-accent px-1.5 py-0.5 rounded">
                  {session.classCode}
                </span>
              )}
            </p>
          </div>
          <span
            className={[
              "text-[12px] font-semibold px-2.5 py-1 rounded-full",
              ARRIVAL_COLOURS[session.arrivalStatus],
            ].join(" ")}
          >
            {ARRIVAL_LABELS[session.arrivalStatus]}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[13px] text-text-accent flex-wrap">
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {formatTime(session.startTime)} – {formatTime(session.endTime)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} />
            Checked in {formatCheckin(session.checkinAt)}
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} />
            {students.length} students
          </span>
        </div>
      </div>

      {/* Roll call summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-accent/50 border border-green/20 rounded-xl p-3 text-center">
          <p className="text-[22px] font-bold text-green">{present}</p>
          <p className="text-[12px] font-medium text-green/80">Present</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
          <p className="text-[22px] font-bold text-red-600">{absent}</p>
          <p className="text-[12px] font-medium text-red-500">Absent</p>
        </div>
        <div className="bg-accent border border-black/8 rounded-xl p-3 text-center">
          <p className="text-[22px] font-bold text-text-accent">{unmarked}</p>
          <p className="text-[12px] font-medium text-text-accent">Unmarked</p>
        </div>
      </div>

      {/* Quick-mark actions */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[13px] text-text-accent font-medium">
          Mark all:
        </span>
        <button
          type="button"
          onClick={() => handleMarkAll("PRESENT")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-accent text-green text-[12px] font-medium hover:bg-green/20 transition-colors"
        >
          <Check size={12} strokeWidth={2.5} />
          All present
        </button>
        <button
          type="button"
          onClick={() => handleMarkAll("ABSENT")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-[12px] font-medium hover:bg-red-100 transition-colors"
        >
          <X size={12} strokeWidth={2.5} />
          All absent
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-accent"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-black/8 text-[14px] outline-none focus:ring-2 focus:ring-blue/30 transition-all"
        />
      </div>

      {/* Student list */}
      {students.length === 0 ? (
        <div className="py-14 text-center bg-white/40 border border-black/8 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-accent mx-auto mb-3 flex items-center justify-center">
            <Users size={20} className="text-text-accent" />
          </div>
          <p className="text-[15px] font-medium">No students in this class</p>
          <p className="text-[13px] text-text-accent mt-1">
            Add students to this class in the People section.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-[14px] text-text-accent">
          No students match &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="bg-white/60 border border-black/8 rounded-2xl overflow-hidden">
          {filtered.map((student) => (
            <StudentRow
              key={student.personId}
              student={student}
              localStatus={localMarks.get(student.personId) ?? null}
              onMark={handleMark}
            />
          ))}
        </div>
      )}

      {/* Sticky save bar */}
      <AnimatePresence>
        {(isDirty || isPending || saved) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-4 px-5 py-3 bg-white rounded-2xl shadow-[0px_4px_24px_0_rgba(0,0,0,0.14)] border border-black/5 min-w-[320px] max-w-[90vw]"
          >
            <p className="text-[13px] font-medium text-text-accent whitespace-nowrap">
              {saved
                ? `Saved — ${present} present, ${absent} absent`
                : `${localMarks.size} of ${students.length} marked`}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || saved}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-70 whitespace-nowrap"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <Check size={13} />
                  Saved
                </>
              ) : (
                "Save roll call"
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save error */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700"
          >
            <AlertCircle size={14} />
            {saveError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
