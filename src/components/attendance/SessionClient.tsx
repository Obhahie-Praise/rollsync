"use client";

import {
  useState,
  useTransition,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  QrCode,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronRight,
  CalendarDays,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  teacherSignIn,
  fetchTodayClasses,
  type TodayClassItem,
  type AttendanceSessionSummary,
} from "@/lib/attendance-actions";
import { generateQRCodeDataURL } from "@/lib/qr-generator";

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

const SESSION_STATUS_LABELS: Record<string, string> = {
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
  const date = new Date(d);
  return date.toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── QR Scanner ───────────────────────────────────────────────────────────────
// Uses the browser's camera API to read QR codes via BarcodeDetector or jsQR fallback.
// The QR code contains ONLY the Class ID.

interface QRScannerProps {
  onScan: (classId: string) => void;
  onClose: () => void;
}

function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(true);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        scanLoop();
      } catch {
        setError(
          "Camera access denied. Allow camera permission and try again."
        );
      }
    }

    function scanLoop() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scanLoop);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      // Try BarcodeDetector API (Chrome/Edge)
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        const detector = new (
          window as unknown as {
            BarcodeDetector: new (opts: object) => {
              detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
            };
          }
        ).BarcodeDetector({ formats: ["qr_code"] });

        detector
          .detect(canvas)
          .then((barcodes) => {
            if (cancelled) return;
            if (barcodes.length > 0) {
              setScanning(false);
              stopCamera();
              onScan(barcodes[0].rawValue.trim());
            } else {
              animFrameRef.current = requestAnimationFrame(scanLoop);
            }
          })
          .catch(() => {
            animFrameRef.current = requestAnimationFrame(scanLoop);
          });
      } else {
        // Fallback: show manual input
        setError(
          "QR scanning not supported in this browser. Enter the Class ID manually below."
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera, onScan]);

  const [manualId, setManualId] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="QR scanner"
    >
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-[20px] font-semibold">Scan class QR</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/70 hover:text-white transition-colors p-2"
            aria-label="Close scanner"
          >
            <X size={22} />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 border-white/20">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning overlay */}
          {scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white/70 rounded-xl">
                <motion.div
                  className="w-full h-0.5 bg-blue"
                  animate={{ y: [0, 192] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-white/60 text-[13px] text-center">
          Point your camera at the class QR code
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-amber-900/50 border border-amber-700/50 text-amber-200 text-[13px]">
            {error}
          </div>
        )}

        {/* Manual fallback */}
        <div className="space-y-2">
          <p className="text-white/50 text-[12px] text-center">
            Or enter class ID manually
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Class ID"
              className="flex-1 bg-white/10 text-white placeholder:text-white/30 border border-white/20 rounded-xl px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue/50"
            />
            <button
              type="button"
              onClick={() => {
                if (manualId.trim()) {
                  stopCamera();
                  onScan(manualId.trim());
                }
              }}
              disabled={!manualId.trim()}
              className="px-4 py-2 rounded-xl bg-blue text-white text-[13px] font-medium disabled:opacity-50 hover:bg-blue/90 transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Class QR Display ─────────────────────────────────────────────────────────
// Shows the QR code for a given class (for students to scan in future)

interface ClassQRProps {
  classId: string;
  className: string;
  onClose: () => void;
}

function ClassQRDisplay({ classId, className, onClose }: ClassQRProps) {
  // useMemo is correct here: pure synchronous computation from props, no side effects
  const qrUrl = useMemo(() => {
    try {
      return generateQRCodeDataURL(classId, 280);
    } catch {
      return null;
    }
  }, [classId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-4 text-center"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[18px] font-semibold">Class QR</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-accent hover:text-foreground transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>
        {qrUrl ? (
          <Image
            src={qrUrl}
            alt={`QR code for ${className}`}
            width={280}
            height={280}
            className="mx-auto"
            unoptimized
          />
        ) : (
          <div className="w-[280px] h-[280px] mx-auto bg-accent rounded-xl flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-text-accent" />
          </div>
        )}
        <p className="text-[15px] font-semibold">{className}</p>
        <p className="text-[12px] text-text-accent font-mono break-all">
          {classId}
        </p>
      </motion.div>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

interface ActiveSessionCardProps {
  session: AttendanceSessionSummary;
  slug: string;
}

function ActiveSessionCard({ session, slug }: ActiveSessionCardProps) {
  const router = useRouter();

  return (
    <div className="bg-blue/5 border border-blue/20 rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue mb-1">
            Active session
          </p>
          <h3 className="text-[20px] font-semibold tracking-tight">
            {session.subjectName}
          </h3>
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
          className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${
            ARRIVAL_COLOURS[session.arrivalStatus]
          }`}
        >
          {ARRIVAL_LABELS[session.arrivalStatus]}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[13px] text-text-accent">
        <span className="flex items-center gap-1">
          <Clock size={13} />
          {formatTime(session.startTime)} – {formatTime(session.endTime)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={13} />
          Checked in {formatCheckin(session.checkinAt)}
        </span>
      </div>

      {session.recordCount > 0 && (
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-green font-medium">
            {session.presentCount} present
          </span>
          <span className="text-text-accent">
            {session.absentCount} absent
          </span>
          <span className="text-text-accent">
            {session.recordCount} marked
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          router.push(`/${slug}/attendance/record?session=${session.id}`)
        }
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue text-white font-semibold text-[15px] hover:bg-blue/90 active:scale-[0.98] transition-all"
      >
        <Users size={16} />
        Take attendance
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Today's class card ────────────────────────────────────────────────────────

interface ClassCardProps {
  item: TodayClassItem;
  onSignIn: (item: TodayClassItem) => void;
  onShowQR: (classId: string, className: string) => void;
  slug: string;
  loading: boolean;
}

function ClassCard({ item, onSignIn, onShowQR, slug, loading }: ClassCardProps) {
  const router = useRouter();
  const sess = item.session;

  return (
    <div
      className={[
        "bg-white/60 border rounded-2xl p-5 space-y-3 transition-colors",
        sess ? "border-blue/20" : "border-black/8",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-mono text-text-accent font-medium">
              {formatTime(item.startTime)} – {formatTime(item.endTime)}
            </span>
            {item.periodLabel && (
              <span className="text-[11px] text-text-accent bg-accent px-2 py-0.5 rounded-full">
                {item.periodLabel}
              </span>
            )}
          </div>
          <h3 className="text-[18px] font-semibold tracking-tight">
            {item.subjectName}
          </h3>
          <p className="text-[14px] text-text-accent">
            {item.className}
            {item.classCode && (
              <span className="ml-1.5 font-mono text-[12px] bg-accent px-1.5 py-0.5 rounded">
                {item.classCode}
              </span>
            )}
            {item.roomName && (
              <span className="ml-2 text-[13px]"> · {item.roomName}</span>
            )}
          </p>
        </div>

        {sess && (
          <span
            className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full ${
              ARRIVAL_COLOURS[sess.arrivalStatus]
            }`}
          >
            {ARRIVAL_LABELS[sess.arrivalStatus]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {sess ? (
          <>
            <div className="flex items-center gap-1.5 text-[13px] text-green font-medium">
              <CheckCircle2 size={14} />
              Signed in · {formatCheckin(sess.checkinAt)}
            </div>
            <span className="text-text-accent text-[13px]">
              {SESSION_STATUS_LABELS[sess.status]}
            </span>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${slug}/attendance/record?session=${sess.id}`
                )
              }
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue text-white text-[12px] font-medium hover:bg-blue/90 transition-colors"
            >
              Roll call
              <ChevronRight size={12} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSignIn(item)}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/80 active:scale-[0.97] transition-all disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <QrCode size={13} />
              )}
              Sign in
            </button>
            <button
              type="button"
              onClick={() => onShowQR(item.classId, item.className)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent hover:bg-accent/70 text-[12px] font-medium transition-colors"
              title="View class QR code"
            >
              <QrCode size={12} />
              Class QR
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SessionClientProps {
  orgSlug: string;
  teacherPersonId: string;
  teacherName: string;
  initialClasses: TodayClassItem[];
}

export function SessionClient({
  orgSlug,
  teacherPersonId,
  teacherName,
  initialClasses,
}: SessionClientProps) {
  const [classes, setClasses] = useState<TodayClassItem[]>(initialClasses);
  const [scanTarget, setScanTarget] = useState<TodayClassItem | null>(null);
  const [showQR, setShowQR] = useState<{
    classId: string;
    className: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [signInResult, setSignInResult] =
    useState<AttendanceSessionSummary | null>(null);

  void teacherPersonId;

  const refreshClasses = useCallback(() => {
    startTransition(async () => {
      const result = await fetchTodayClasses(orgSlug);
      if (result.ok) setClasses(result.classes);
    });
  }, [orgSlug]);

  const handleSignIn = (item: TodayClassItem) => {
    setScanTarget(item);
    setError("");
  };

  const handleScanResult = useCallback(
    (classId: string) => {
      setScanTarget(null);
      setError("");
      startTransition(async () => {
        const result = await teacherSignIn({ slug: orgSlug, scannedClassId: classId });
        if (result.ok) {
          setSignInResult(result.session);
          refreshClasses();
        } else {
          setError(result.error);
        }
      });
    },
    [orgSlug, refreshClasses]
  );

  const today = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const activeSessions = classes
    .filter((c) => c.session && c.session.status === "ACTIVE")
    .map((c) => c.session!);

  return (
    <>
      <div className="px-8 sm:px-14 pb-24">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-[40px] font-semibold tracking-tight">
            Attendance
          </h1>
          <p className="text-[18px] text-text-accent mt-1">
            Welcome, {teacherName}
          </p>
          <p className="text-[14px] text-text-accent flex items-center gap-1.5 mt-0.5">
            <CalendarDays size={14} />
            {today}
          </p>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Sign in failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto shrink-0 text-red-400 hover:text-red-600"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign-in success */}
        <AnimatePresence>
          {signInResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6"
            >
              <ActiveSessionCard session={signInResult} slug={orgSlug} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active sessions (if any from initial load) */}
        {activeSessions.length > 0 && !signInResult && (
          <div className="mb-8 space-y-3">
            {activeSessions.map((sess) => (
              <ActiveSessionCard key={sess.id} session={sess} slug={orgSlug} />
            ))}
          </div>
        )}

        {/* Today's schedule */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-semibold tracking-tight">
              Today&apos;s classes
            </h2>
            <span className="text-[13px] text-text-accent bg-accent px-2.5 py-1 rounded-full font-medium">
              {classes.length} scheduled
            </span>
          </div>

          {classes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-accent mx-auto mb-4 flex items-center justify-center">
                <BookOpen size={24} className="text-text-accent" />
              </div>
              <p className="text-[16px] font-medium">No classes today</p>
              <p className="text-[14px] text-text-accent mt-1">
                You have no scheduled classes for today.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((item) => (
                <ClassCard
                  key={item.timetableEntryId}
                  item={item}
                  onSignIn={handleSignIn}
                  onShowQR={(classId, className) =>
                    setShowQR({ classId, className })
                  }
                  slug={orgSlug}
                  loading={isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner modal */}
      <AnimatePresence>
        {scanTarget && (
          <QRScanner
            onScan={handleScanResult}
            onClose={() => setScanTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Class QR display modal */}
      <AnimatePresence>
        {showQR && (
          <ClassQRDisplay
            classId={showQR.classId}
            className={showQR.className}
            onClose={() => setShowQR(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
