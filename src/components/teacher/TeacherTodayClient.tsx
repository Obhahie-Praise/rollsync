"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  BookOpen,
  MapPin,
  ChevronRight,
} from "lucide-react";
import {
  teacherSignIn,
  fetchTodayClasses,
  type TodayClassItem,
} from "@/lib/attendance-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const base = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0] ?? name;
  return `${base}, ${first}`;
}

function getClassStatus(item: TodayClassItem): {
  label: string;
  color: string;
  dot: string;
} {
  const sess = item.session;
  if (!sess) {
    const now = new Date();
    const [sh, sm] = item.startTime.split(":").map(Number);
    const [eh, em] = item.endTime.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    if (nowMins > endMins)
      return { label: "Not started", dot: "bg-red-400", color: "text-red-600" };
    if (nowMins >= startMins)
      return { label: "Ready", dot: "bg-amber-400", color: "text-amber-600" };
    return { label: "Upcoming", dot: "bg-text-accent/30", color: "text-text-accent" };
  }
  if (sess.status === "COMPLETED")
    return { label: "Completed", dot: "bg-green", color: "text-green" };
  if (sess.status === "CANCELLED")
    return { label: "Cancelled", dot: "bg-text-accent/30", color: "text-text-accent" };
  return { label: "In progress", dot: "bg-blue", color: "text-blue" };
}

// ─── Sign-in confirm sheet ────────────────────────────────────────────────────
// Instead of a QR scanner (not needed on web — class ID is resolved server-side),
// this confirms the sign-in action for the selected class.

interface SignInSheetProps {
  classItem: TodayClassItem;
  orgSlug: string;
  onSuccess: (sessionId: string) => void;
  onClose: () => void;
}

function SignInSheet({ classItem, orgSlug, onSuccess, onClose }: SignInSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSignIn = () => {
    setError("");
    startTransition(async () => {
      const result = await teacherSignIn({
        slug: orgSlug,
        scannedClassId: classItem.classId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess(result.session.id);
    });
  };

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReduced ? {} : { opacity: 0, y: 40 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm bg-background rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to class"
      >
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center mx-auto mb-3">
            <QrCode size={20} className="text-blue" />
          </div>
          <p className="text-[19px] font-semibold">{classItem.subjectName}</p>
          <p className="text-[14px] text-text-accent">
            {classItem.className}
            {classItem.classCode ? ` (${classItem.classCode})` : ""}
          </p>
          <p className="text-[13px] text-text-accent">
            {formatTime(classItem.startTime)}–{formatTime(classItem.endTime)}
          </p>
          {classItem.roomName && (
            <p className="text-[13px] text-text-accent">{classItem.roomName}</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue text-white text-[16px] font-semibold hover:bg-blue/90 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              Sign in to class
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 text-[14px] font-medium text-text-accent hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}

// ─── Class card ───────────────────────────────────────────────────────────────

interface ClassCardProps {
  item: TodayClassItem;
  orgSlug: string;
  onSignIn: (item: TodayClassItem) => void;
}

function ClassCard({ item, orgSlug, onSignIn }: ClassCardProps) {
  const { label, color, dot } = getClassStatus(item);
  const isCompleted = item.session?.status === "COMPLETED";
  const isActive = item.session?.status === "ACTIVE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/70 border border-black/8 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {label}
            </span>
          </div>
          <p className="text-[18px] sm:text-[20px] font-semibold tracking-tight">
            {item.subjectName}
          </p>
          <p className="text-[14px] text-text-accent mt-0.5">
            {item.className}
            {item.classCode ? ` (${item.classCode})` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[13px] text-text-accent">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatTime(item.startTime)}–{formatTime(item.endTime)}
            </span>
            {item.roomName && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {item.roomName}
              </span>
            )}
          </div>
          {isActive && item.session && (
            <p className="text-[12px] text-blue mt-1.5">
              {item.session.presentCount} present · {item.session.recordCount} marked
            </p>
          )}
          {isCompleted && item.session && (
            <p className="text-[12px] text-green mt-1.5">
              {item.session.presentCount} present · {item.session.absentCount} absent
            </p>
          )}
        </div>

        <div className="shrink-0 mt-1">
          {isCompleted ? (
            <Link
              href={`/${orgSlug}/teacher/attendance/${item.session!.id}`}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-accent text-[13px] font-medium text-text-accent hover:bg-accent/70 transition-colors"
            >
              View <ChevronRight size={13} />
            </Link>
          ) : isActive ? (
            <Link
              href={`/${orgSlug}/teacher/attendance/${item.session!.id}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue text-white text-[14px] font-semibold hover:bg-blue/90 active:scale-[0.97] transition-all"
            >
              Continue
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onSignIn(item)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue text-white text-[14px] font-semibold hover:bg-blue/90 active:scale-[0.97] transition-all"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface TeacherTodayClientProps {
  orgSlug: string;
  teacherName: string;
  initialClasses: TodayClassItem[];
  serverError: string | null;
}

export function TeacherTodayClient({
  orgSlug,
  teacherName,
  initialClasses,
  serverError,
}: TeacherTodayClientProps) {
  const router = useRouter();
  const [classes, setClasses] = useState<TodayClassItem[]>(initialClasses);
  const [signingIn, setSigningIn] = useState<TodayClassItem | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const refresh = useCallback(() => {
    startRefresh(async () => {
      const result = await fetchTodayClasses(orgSlug);
      if (result.ok) setClasses(result.classes);
    });
  }, [orgSlug]);

  const handleSignInSuccess = (sessionId: string) => {
    setSigningIn(null);
    router.push(`/${orgSlug}/teacher/attendance/${sessionId}`);
  };

  const completedCount = classes.filter(
    (c) => c.session?.status === "COMPLETED"
  ).length;
  const totalCount = classes.length;

  return (
    <>
      <AnimatePresence>
        {signingIn && (
          <SignInSheet
            key={signingIn.classId}
            classItem={signingIn}
            orgSlug={orgSlug}
            onSuccess={handleSignInSuccess}
            onClose={() => setSigningIn(null)}
          />
        )}
      </AnimatePresence>

      <div className="px-5 sm:px-8 pb-24">
        {/* Header */}
        <div className="pt-2 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] sm:text-[34px] font-semibold tracking-tight">
                {getGreeting(teacherName)}
              </h1>
              <p className="text-[14px] sm:text-[16px] text-text-accent mt-1">
                {today}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={isRefreshing}
              className="mt-1 p-2 rounded-full text-text-accent hover:bg-accent transition-colors disabled:opacity-50"
              aria-label="Refresh schedule"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
          </div>

          {/* Progress */}
          {totalCount > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[12px] text-text-accent mb-1.5">
                <span>Today&apos;s progress</span>
                <span>
                  {completedCount}/{totalCount} classes done
                </span>
              </div>
              <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue rounded-full transition-all duration-500"
                  style={{
                    width:
                      totalCount > 0
                        ? `${(completedCount / totalCount) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {serverError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            {serverError}
          </div>
        )}

        {/* Classes */}
        {classes.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] font-semibold text-text-accent uppercase tracking-wide mb-3">
              Today&apos;s schedule
            </p>
            {classes.map((item) => (
              <ClassCard
                key={item.timetableEntryId}
                item={item}
                orgSlug={orgSlug}
                onSignIn={setSigningIn}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
              <BookOpen size={24} className="text-text-accent" />
            </div>
            <p className="text-[16px] font-medium">No classes today</p>
            <p className="text-[14px] text-text-accent mt-1 max-w-xs">
              {serverError
                ? "Could not load your schedule."
                : "You have no scheduled classes for today."}
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
}
