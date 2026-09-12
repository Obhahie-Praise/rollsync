"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Camera,
  CameraOff,
  RefreshCw,
} from "lucide-react";
import jsQR from "jsqr";
import {
  resolveClassCheckIn,
  confirmClassCheckIn,
  type CheckInPreview,
} from "@/lib/attendance-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the Roll SYNC public code from a QR payload.
 * Accepts:
 *   - "https://rollsync.app/c/RS-XXXXXXXX"
 *   - "RS-XXXXXXXX"  (bare code)
 */
function extractPublicCode(raw: string): string | null {
  const trimmed = raw.trim();
  // URL form
  const urlMatch = trimmed.match(
    /rollsync\.app\/c\/(RS-[A-Z0-9]{8})/i
  );
  if (urlMatch) return urlMatch[1].toUpperCase();
  // Bare code form
  const bareMatch = trimmed.match(/^(RS-[A-Z0-9]{8})$/i);
  if (bareMatch) return bareMatch[1].toUpperCase();
  return null;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

const ARRIVAL_LABELS: Record<string, { label: string; color: string }> = {
  EARLY: { label: "Early", color: "text-blue" },
  ON_TIME: { label: "On time", color: "text-green-600" },
  LATE: { label: "Late", color: "text-amber-600" },
  VERY_LATE: { label: "Very late", color: "text-red-600" },
};

// ─── States ───────────────────────────────────────────────────────────────────

type ScanState =
  | { phase: "scanning" }
  | { phase: "resolving"; code: string }
  | { phase: "preview"; preview: CheckInPreview }
  | { phase: "confirming"; preview: CheckInPreview }
  | { phase: "error"; message: string; code?: string }
  | { phase: "success"; sessionId: string; preview: CheckInPreview };

// ─── Camera Scanner ───────────────────────────────────────────────────────────

interface CameraScannerProps {
  onDetected: (publicCode: string) => void;
  onError: (msg: string) => void;
  active: boolean;
}

function CameraScanner({ onDetected, onError, active }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Keep stable refs to callbacks so the effect doesn't need them as deps
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  useEffect(() => { onDetectedRef.current = onDetected; });
  useEffect(() => { onErrorRef.current = onError; });

  useEffect(() => {
    if (!active) {
      // Use a microtask so setState is not synchronous in effect body
      void Promise.resolve().then(() => setCameraReady(false));
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf: number | null = null;
    const lastDetected: { code: string | null } = { code: null };

    const scanFrame = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        raf = requestAnimationFrame(scanFrame);
        return;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        raf = requestAnimationFrame(scanFrame);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (result) {
        const code = extractPublicCode(result.data);
        if (code && code !== lastDetected.code) {
          lastDetected.code = code;
          onDetectedRef.current(code);
          return; // stop after first valid code
        }
      }
      raf = requestAnimationFrame(scanFrame);
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          await video.play();
          if (!cancelled) {
            setCameraReady(true);
            raf = requestAnimationFrame(scanFrame);
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setPermissionDenied(true);
            onErrorRef.current(
              "Camera permission denied. Please allow camera access and try again."
            );
          } else {
            onErrorRef.current("Camera unavailable. Please try again.");
          }
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (raf !== null) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      // Capture the current ref value before cleanup runs
      const video = videoRef.current;
      if (video) video.srcObject = null;
      void Promise.resolve().then(() => setCameraReady(false));
    };
  }, [active]);

  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-64 text-center px-6">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <CameraOff size={24} className="text-red-500" />
        </div>
        <p className="text-[15px] font-medium">Camera access denied</p>
        <p className="text-[13px] text-text-accent">
          Allow camera access in your browser settings, then refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
      {/* Hidden canvas for frame processing */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        aria-label="Camera viewfinder"
      />

      {/* Scanning overlay */}
      {cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Corner brackets */}
          <div className="relative w-52 h-52">
            {/* TL */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
            {/* TR */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
            {/* BL */}
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
            {/* BR */}
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />

            {/* Animated scan line */}
            <motion.div
              className="absolute left-2 right-2 h-0.5 bg-blue/80"
              animate={{ top: ["10%", "90%", "10%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              style={{ top: "10%" }}
            />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!cameraReady && !permissionDenied && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Preview screen ───────────────────────────────────────────────────────────

interface PreviewScreenProps {
  preview: CheckInPreview;
  confirming: boolean;
  onConfirm: () => void;
  onRetry: () => void;
}

function PreviewScreen({
  preview,
  confirming,
  onConfirm,
  onRetry,
}: PreviewScreenProps) {
  const arrival = ARRIVAL_LABELS[preview.arrivalStatus] ?? {
    label: preview.arrivalStatus,
    color: "text-text-accent",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <div className="w-12 h-12 rounded-full bg-blue/10 flex items-center justify-center mx-auto mb-3">
          <QrCode size={22} className="text-blue" />
        </div>
        <p className="text-[22px] font-semibold tracking-tight">Check in to class</p>
        <p className="text-[14px] text-text-accent">
          Review the details below before confirming.
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-2xl bg-accent/50 border border-black/8 p-5 space-y-3">
        <div>
          <p className="text-[22px] font-semibold">{preview.subjectName}</p>
          <p className="text-[15px] text-text-accent mt-0.5">
            {preview.className}
            {preview.classCode ? ` (${preview.classCode})` : ""}
          </p>
        </div>

        <div className="border-t border-black/8 pt-3 space-y-2 text-[14px]">
          <div className="flex justify-between">
            <span className="text-text-accent">Time</span>
            <span className="font-medium">
              {formatTime(preview.startTime)}–{formatTime(preview.endTime)}
            </span>
          </div>
          {preview.roomName && (
            <div className="flex justify-between">
              <span className="text-text-accent">Room</span>
              <span className="font-medium">{preview.roomName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-accent">Teacher</span>
            <span className="font-medium">{preview.teacherName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-accent">Arrival</span>
            <span className={`font-medium ${arrival.color}`}>
              {arrival.label}
            </span>
          </div>
        </div>
      </div>

      {/* Already checked in banner */}
      {preview.alreadyCheckedIn && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <p>You already checked in to this class today. Confirming again is safe — it will open the existing session.</p>
        </div>
      )}

      {/* Actions */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirming}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue text-white text-[17px] font-semibold hover:bg-blue/90 active:scale-[0.98] transition-all disabled:opacity-60"
        aria-live="polite"
      >
        {confirming ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Checking in…
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            Check in
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onRetry}
        disabled={confirming}
        className="w-full py-3 text-[14px] font-medium text-text-accent hover:text-foreground transition-colors disabled:opacity-50"
      >
        Scan a different QR
      </button>
    </motion.div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

interface SuccessScreenProps {
  preview: CheckInPreview;
  sessionId: string;
  orgSlug: string;
}

function SuccessScreen({ preview, sessionId, orgSlug }: SuccessScreenProps) {
  const router = useRouter();
  const arrival = ARRIVAL_LABELS[preview.arrivalStatus] ?? {
    label: preview.arrivalStatus,
    color: "text-text-accent",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-5 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
        <CheckCircle2 size={32} className="text-green-600" />
      </div>
      <div>
        <p className="text-[24px] font-semibold">You&apos;re checked in</p>
        <p className="text-[15px] text-text-accent mt-1">
          {preview.subjectName} · {preview.className}
        </p>
      </div>

      <div className="w-full rounded-2xl bg-accent/50 border border-black/8 p-5 text-left space-y-2 text-[14px]">
        <div className="flex justify-between">
          <span className="text-text-accent">Time</span>
          <span className="font-medium">
            {formatTime(preview.startTime)}–{formatTime(preview.endTime)}
          </span>
        </div>
        {preview.roomName && (
          <div className="flex justify-between">
            <span className="text-text-accent">Room</span>
            <span className="font-medium">{preview.roomName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-text-accent">Arrival</span>
          <span className={`font-medium ${arrival.color}`}>
            {arrival.label}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          router.push(`/${orgSlug}/teacher/attendance/${sessionId}`)
        }
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue text-white text-[17px] font-semibold hover:bg-blue/90 active:scale-[0.98] transition-all"
      >
        Enter class
      </button>

      <button
        type="button"
        onClick={() => router.push(`/${orgSlug}/teacher/today`)}
        className="w-full py-3 text-[14px] font-medium text-text-accent hover:text-foreground transition-colors"
      >
        Back to Today
      </button>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ScanClientProps {
  orgSlug: string;
}

export function ScanClient({ orgSlug }: ScanClientProps) {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>({ phase: "scanning" });
  const [, startTransition] = useTransition();

  const handleDetected = useCallback(
    (publicCode: string) => {
      setScanState({ phase: "resolving", code: publicCode });
      startTransition(async () => {
        const result = await resolveClassCheckIn(orgSlug, publicCode);
        if (!result.ok) {
          setScanState({
            phase: "error",
            message: result.error,
            code: result.code,
          });
        } else {
          setScanState({ phase: "preview", preview: result.preview });
        }
      });
    },
    [orgSlug]
  );

  const handleScanError = useCallback((msg: string) => {
    setScanState({ phase: "error", message: msg });
  }, []);

  const handleConfirm = useCallback(
    (preview: CheckInPreview) => {
      setScanState({ phase: "confirming", preview });
      startTransition(async () => {
        const result = await confirmClassCheckIn(
          orgSlug,
          preview.timetableEntryId,
          preview.classPublicCode
        );
        if (!result.ok) {
          setScanState({
            phase: "error",
            message: result.error,
            code: result.code,
          });
        } else {
          setScanState({ phase: "success", sessionId: result.session.id, preview });
        }
      });
    },
    [orgSlug]
  );

  const handleRetry = useCallback(() => {
    setScanState({ phase: "scanning" });
  }, []);

  const isCameraActive =
    scanState.phase === "scanning" || scanState.phase === "resolving";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-black/5 px-5 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors text-text-accent"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[18px] font-semibold flex-1">Scan class QR</h1>
        {(scanState.phase === "scanning" || scanState.phase === "resolving") && (
          <span className="text-[13px] text-text-accent">Point camera at QR</span>
        )}
      </div>

      <div className="px-5 py-6 max-w-sm mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {/* ── Scanning phase ── */}
          {(scanState.phase === "scanning" ||
            scanState.phase === "resolving") && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <CameraScanner
                active={isCameraActive}
                onDetected={handleDetected}
                onError={handleScanError}
              />

              {scanState.phase === "resolving" && (
                <div className="flex items-center justify-center gap-2 py-3 text-[14px] text-text-accent">
                  <Loader2 size={16} className="animate-spin" />
                  Resolving class…
                </div>
              )}

              {scanState.phase === "scanning" && (
                <p className="text-[13px] text-text-accent text-center leading-relaxed">
                  Scan the QR code posted in your classroom to check in.
                </p>
              )}
            </motion.div>
          )}

          {/* ── Preview phase ── */}
          {(scanState.phase === "preview" ||
            scanState.phase === "confirming") && (
            <motion.div key="preview">
              <PreviewScreen
                preview={scanState.preview}
                confirming={scanState.phase === "confirming"}
                onConfirm={() => handleConfirm(scanState.preview)}
                onRetry={handleRetry}
              />
            </motion.div>
          )}

          {/* ── Error phase ── */}
          {scanState.phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 text-center pt-8"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle size={26} className="text-red-500" />
              </div>
              <div>
                <p className="text-[18px] font-semibold">
                  {/* Show a friendly heading based on error code */}
                  {scanState.code === "CLASS_NOT_FOUND"
                    ? "Class not found"
                    : scanState.code === "NOT_ASSIGNED"
                    ? "Class not yours"
                    : scanState.code === "NOT_SCHEDULED_TODAY"
                    ? "Not scheduled today"
                    : scanState.code === "CLASS_CANCELLED"
                    ? "Class cancelled"
                    : scanState.code === "SUBSTITUTED"
                    ? "Substitute assigned"
                    : scanState.code === "WRONG_ORG"
                    ? "Wrong organization"
                    : "Check-in failed"}
                </p>
                <p className="text-[14px] text-text-accent mt-2 leading-relaxed">
                  {scanState.message}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue text-white text-[15px] font-semibold hover:bg-blue/90 active:scale-[0.98] transition-all"
              >
                <RefreshCw size={15} />
                Try again
              </button>

              <button
                type="button"
                onClick={() => router.push(`/${orgSlug}/teacher/today`)}
                className="text-[14px] text-text-accent hover:text-foreground transition-colors"
              >
                Back to Today
              </button>
            </motion.div>
          )}

          {/* ── Success phase ── */}
          {scanState.phase === "success" && (
            <motion.div key="success">
              <SuccessScreen
                preview={scanState.preview}
                sessionId={scanState.sessionId}
                orgSlug={orgSlug}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera icon + hint only on scanning phase */}
        {scanState.phase === "scanning" && (
          <div className="flex items-center justify-center gap-2 text-[12px] text-text-accent/60">
            <Camera size={13} />
            <span>Camera feed stays on device</span>
          </div>
        )}
      </div>
    </div>
  );
}
