"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Check, Monitor, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { SettingsSection, SettingsDivider } from "@/components/settings/SettingsSection";
import { changePassword, revokeSession } from "@/lib/settings-actions";
import type { SessionInfo } from "@/lib/settings-actions";

// ─── Password Form ─────────────────────────────────────────────────────────────

export function PasswordForm() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});
  const [submitError, setSubmitError] = useState("");

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!currentPw) e.current = "Current password is required.";
    if (!newPw || newPw.length < 8) e.new = "At least 8 characters.";
    if (newPw.length > 128) e.new = "128 characters or fewer.";
    if (newPw !== confirmPw) e.confirm = "Passwords don't match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitError("");
    setSaving(true);

    const result = await changePassword({
      currentPassword: currentPw,
      newPassword: newPw,
    });

    setSaving(false);

    if (!result.ok) {
      if (result.field === "currentPassword") {
        setErrors((e) => ({ ...e, current: result.error }));
      } else if (result.field === "newPassword") {
        setErrors((e) => ({ ...e, new: result.error }));
      } else {
        setSubmitError(result.error);
      }
      return;
    }

    setSaved(true);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setTimeout(() => setSaved(false), 3000);
  };

  const isDisabled = saving;

  return (
    <SettingsSection
      title="Password"
      description="Update your account password. You'll need your current password to make changes."
    >
      <div className="space-y-3 max-w-[400px]">
        {/* Current password */}
        <div className="space-y-1">
          <label htmlFor="current-pw" className="text-[16px] font-medium text-text-accent">
            Current password
          </label>
          <div className="relative">
            <input
              id="current-pw"
              type={showCurrent ? "text" : "password"}
              value={currentPw}
              onChange={(e) => {
                setCurrentPw(e.target.value);
                if (errors.current) setErrors((err) => ({ ...err, current: undefined }));
              }}
              disabled={isDisabled}
              placeholder="••••••••"
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 pr-10 text-[20px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/40 disabled:opacity-60",
                errors.current ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-accent hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.current && (
            <p className="text-red-500 text-[12px] pl-1">{errors.current}</p>
          )}
        </div>

        {/* New password */}
        <div className="space-y-1">
          <label htmlFor="new-pw" className="text-[16px] font-medium text-text-accent">
            New password
          </label>
          <div className="relative">
            <input
              id="new-pw"
              type={showNew ? "text" : "password"}
              value={newPw}
              onChange={(e) => {
                setNewPw(e.target.value);
                if (errors.new) setErrors((err) => ({ ...err, new: undefined }));
              }}
              disabled={isDisabled}
              placeholder="••••••••"
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 pr-10 text-[20px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/40 disabled:opacity-60",
                errors.new ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-accent hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.new && (
            <p className="text-red-500 text-[12px] pl-1">{errors.new}</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <label htmlFor="confirm-pw" className="text-[16px] font-medium text-text-accent">
            Confirm new password
          </label>
          <input
            id="confirm-pw"
            type="password"
            value={confirmPw}
            onChange={(e) => {
              setConfirmPw(e.target.value);
              if (errors.confirm) setErrors((err) => ({ ...err, confirm: undefined }));
            }}
            disabled={isDisabled}
            placeholder="••••••••"
            className={[
              "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[20px]",
              "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
              "placeholder:text-text-accent/40 disabled:opacity-60",
              errors.confirm ? "ring-2 ring-red-300" : "",
            ].join(" ")}
          />
          {errors.confirm && (
            <p className="text-red-500 text-[12px] pl-1">{errors.confirm}</p>
          )}
        </div>

        <AnimatePresence>
          {submitError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-[12px]"
              role="alert"
            >
              {submitError}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={handleSave}
          disabled={isDisabled || (!currentPw && !newPw && !confirmPw)}
          className="flex items-center gap-1.5 px-[24px] py-[12px] rounded-full text-[16px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Updating…
            </>
          ) : saved ? (
            <>
              <Check size={14} />
              Password updated
            </>
          ) : (
            "Update password"
          )}
        </button>
      </div>
    </SettingsSection>
  );
}

// ─── Sessions List ─────────────────────────────────────────────────────────────

function parseUA(ua: string | null): { label: string; icon: React.ReactNode } {
  if (!ua) return { label: "Unknown device", icon: <Monitor size={16} /> };
  const u = ua.toLowerCase();
  if (u.includes("mobile") || u.includes("android") || u.includes("iphone")) {
    return { label: "Mobile device", icon: <Smartphone size={16} /> };
  }
  return { label: "Desktop browser", icon: <Monitor size={16} /> };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

interface SessionItemProps {
  session: SessionInfo;
  onRevoke: (token: string) => void;
  revoking: boolean;
}

function SessionItem({ session, onRevoke, revoking }: SessionItemProps) {
  const { label, icon } = parseUA(session.userAgent);

  return (
    <div
      className={[
        "flex items-start justify-between gap-4 p-4 rounded-xl border",
        session.isCurrent
          ? "border-blue/25 bg-blue/5"
          : "border-black/8 bg-white/40",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="text-text-accent mt-0.5 shrink-0">{icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[20px] font-medium">{label}</p>
            {session.isCurrent && (
              <span className="text-[13px] font-medium text-blue bg-blue/10 px-2 py-0.5 rounded-full">
                Current
              </span>
            )}
          </div>
          {session.ipAddress && (
            <p className="text-[12px] text-text-accent mt-0.5">
              {session.ipAddress}
            </p>
          )}
          <p className="text-[12px] text-text-accent mt-0.5">
            Last active {formatDate(session.updatedAt)}
          </p>
        </div>
      </div>

      {!session.isCurrent && (
        <button
          type="button"
          onClick={() => onRevoke(session.token)}
          disabled={revoking}
          className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {revoking ? <Loader2 size={12} className="animate-spin" /> : "Revoke"}
        </button>
      )}
    </div>
  );
}

export function SessionsList({ sessions: initial }: { sessions: SessionInfo[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initial);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleRevoke = async (token: string) => {
    setRevoking(token);
    setError("");
    const result = await revokeSession(token);
    setRevoking(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSessions((prev) => prev.filter((s) => s.token !== token));
    router.refresh();
  };

  if (sessions.length === 0) {
    return (
      <p className="text-[14px] text-text-accent">No active sessions found.</p>
    );
  }

  return (
    <SettingsSection
      title="Active sessions"
      description="These are the devices currently signed in to your account. Revoke any session you don't recognize."
    >
      <div className="space-y-2">
        {sessions.map((s) => (
          <SessionItem
            key={s.id}
            session={s}
            onRevoke={handleRevoke}
            revoking={revoking === s.token}
          />
        ))}
      </div>
      {error && (
        <p className="text-red-500 text-[12px] mt-2">{error}</p>
      )}
    </SettingsSection>
  );
}

// ─── Full Security Page ────────────────────────────────────────────────────────

export function SecurityPageContent({ sessions }: { sessions: SessionInfo[] }) {
  return (
    <div className="space-y-8">
      <PasswordForm />
      <SettingsDivider />
      <SessionsList sessions={sessions} />
    </div>
  );
}
