"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Copy,
  Check,
  Loader2,
  Key,
  AlertTriangle,
  X,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { SettingsSection, SettingsDivider } from "@/components/settings/SettingsSection";
import {
  createApiKey,
  revokeApiKey,
  type ApiKeyListItem,
} from "@/lib/api-key-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
        copied
          ? "bg-green-accent text-green"
          : "bg-accent hover:bg-accent/70 text-foreground",
        className,
      ].join(" ")}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Create API key modal ─────────────────────────────────────────────────────

interface CreateModalProps {
  orgSlug: string;
  onCreated: (key: ApiKeyListItem) => void;
  onClose: () => void;
}

type CreateStep = "form" | "reveal";

function CreateModal({ orgSlug, onCreated, onClose }: CreateModalProps) {
  const [step, setStep] = useState<CreateStep>("form");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [rawSecret, setRawSecret] = useState("");
  const [createdKey, setCreatedKey] = useState<ApiKeyListItem | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  // Compute min expiry date with a lazy initializer (runs once, not on every render)
  const [minExpiryDate] = useState<string>(
    () => new Date(Date.now() + 86_400_000).toISOString().split("T")[0]
  );

  // Focus name input on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Escape (only on form step — prevent accidental close on reveal)
  useEffect(() => {
    if (step !== "form") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, onClose]);

  const validate = (): boolean => {
    const n = name.trim();
    if (!n) { setNameError("Key name is required."); return false; }
    if (n.length < 2) { setNameError("At least 2 characters."); return false; }
    if (n.length > 80) { setNameError("80 characters or fewer."); return false; }
    setNameError("");
    return true;
  };

  const handleCreate = () => {
    if (!validate()) return;
    setSubmitError("");

    startTransition(async () => {
      const result = await createApiKey({
        slug: orgSlug,
        name: name.trim(),
        expiresAt: expiresAt || null,
      });

      if (!result.ok) {
        if (result.field === "name") setNameError(result.error);
        else setSubmitError(result.error);
        return;
      }

      setRawSecret(result.rawSecret);
      setCreatedKey(result.key);
      onCreated(result.key);
      setStep("reveal");
    });
  };

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-label={step === "form" ? "Create API key" : "API key created"}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={step === "form" ? onClose : undefined}
        aria-hidden="true"
      />

      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px] bg-background rounded-2xl shadow-[0px_8px_40px_0_rgba(0,0,0,0.15)] border border-black/6 p-6"
      >
        {step === "form" ? (
          /* ── Form step ── */
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-[24px] font-semibold">Create API key</h2>
                <p className="text-[16px] text-text-accent mt-1">
                  Give your key a name that identifies its purpose.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-accent transition-colors text-text-accent"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Key name */}
            <div className="space-y-1 mb-4">
              <label htmlFor="key-name" className="text-[16px] mb-1 font-medium text-text-accent">
                Key name
              </label>
              <input
                id="key-name"
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                disabled={isPending}
                maxLength={80}
                placeholder="e.g. Production integration"
                className={[
                  "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px]",
                  "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                  "placeholder:text-text-accent/50 disabled:opacity-60",
                  nameError ? "ring-2 ring-red-300" : "",
                ].join(" ")}
              />
              {nameError && (
                <p className="text-red-500 text-[12px] pl-1">{nameError}</p>
              )}
            </div>

            {/* Optional expiry */}
            <div className="space-y-1 mb-6">
              <label htmlFor="key-expiry" className="text-[16px] mb-1 font-medium text-text-accent">
                Expiration{" "}
                <span className="text-text-accent/60 font-normal">(optional)</span>
              </label>
              <input
                id="key-expiry"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={isPending}
                min={minExpiryDate}
                className="w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px] border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all disabled:opacity-60"
              />
              <p className="text-[14px] text-text-accent pl-1">
                Leave blank for a key that never expires.
              </p>
            </div>

            {submitError && (
              <p className="text-red-500 text-[12px] mb-4" role="alert">
                {submitError}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 rounded-full text-[16px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-[16px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Key size={13} />
                    Create key
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* ── Reveal step ── */
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-green-accent flex items-center justify-center shrink-0">
                <Check size={16} className="text-green" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold">API key created</h2>
                <p className="text-[13px] text-text-accent">
                  {createdKey?.name}
                </p>
              </div>
            </div>

            {/* Secret display */}
            <div className="bg-dark-accent rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between gap-2">
                <code className="text-[13px] font-mono text-white flex-1 min-w-0 overflow-hidden">
                  {showSecret ? rawSecret : rawSecret.replace(/rs_live_(.{8})(.+)/, (_, p, rest) => `rs_live_${p}${"•".repeat(rest.length)}`)}
                </code>
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="text-white/60 hover:text-white transition-colors shrink-0"
                  aria-label={showSecret ? "Hide key" : "Show key"}
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <CopyButton text={rawSecret} />
              <p className="text-[12px] text-text-accent">
                Shown once — copy it now
              </p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-5">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[14px] text-amber-800 leading-relaxed">
                This secret will <strong>not</strong> be shown again. Store it
                somewhere secure — a password manager or secrets manager.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-[12px] rounded-full text-[16px] font-medium bg-blue text-white hover:bg-blue/90 transition-colors"
            >
              Done
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Revoke confirmation dialog ───────────────────────────────────────────────

interface RevokeDialogProps {
  keyName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function RevokeDialog({ keyName, onConfirm, onCancel, isPending }: RevokeDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-label="Revoke API key"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden="true"
      />

      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[400px] bg-background rounded-2xl shadow-[0px_8px_40px_0_rgba(0,0,0,0.15)] border border-black/6 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <h2 className="text-[17px] font-semibold">Revoke API key?</h2>
        </div>

        <p className="text-[14px] text-text-accent mb-1">
          <strong className="text-foreground">{keyName}</strong>
        </p>
        <p className="text-[14px] text-text-accent mb-6">
          Applications using this key will immediately lose access. This cannot
          be undone.
        </p>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-[12px] rounded-full text-[16px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-1.5 px-5 py-[12px] rounded-full text-[16px] font-medium bg-red-500 text-white hover:bg-red-600 active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Revoking…
              </>
            ) : (
              "Revoke key"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── API key card ─────────────────────────────────────────────────────────────

interface ApiKeyCardProps {
  apiKey: ApiKeyListItem;
  onRevoke: (id: string) => void;
}

function ApiKeyCard({ apiKey, onRevoke }: ApiKeyCardProps) {
  const isActive = apiKey.status === "ACTIVE";
  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date();
  const effectivelyActive = isActive && !isExpired;

  return (
    <div
      className={[
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-opacity",
        effectivelyActive
          ? "border-black/8 bg-white/40"
          : "border-black/5 bg-black/3 opacity-60",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={[
            "mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            effectivelyActive ? "bg-blue/10" : "bg-black/6",
          ].join(" ")}
        >
          <Key
            size={14}
            className={effectivelyActive ? "text-blue" : "text-text-accent"}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-medium truncate">{apiKey.name}</p>
            {/* Status badge */}
            {!isActive ? (
              <span className="text-[11px] font-medium text-text-accent bg-black/6 px-2 py-0.5 rounded-full">
                Revoked
              </span>
            ) : isExpired ? (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Expired
              </span>
            ) : (
              <span className="text-[11px] font-medium text-green bg-green-accent px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>

          {/* Key prefix */}
          <code className="text-[12px] text-text-accent font-mono">
            {apiKey.prefix}••••••••••••••••••••••••••••••••••••••••
          </code>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <p className="text-[12px] text-text-accent">
              Created {formatDate(apiKey.createdAt)}
            </p>
            {apiKey.lastUsedAt && (
              <p className="text-[12px] text-text-accent">
                Last used {formatRelative(apiKey.lastUsedAt)}
              </p>
            )}
            {!apiKey.lastUsedAt && isActive && (
              <p className="text-[12px] text-text-accent">Never used</p>
            )}
            {apiKey.expiresAt && (
              <p className="text-[12px] text-text-accent">
                {isExpired
                  ? `Expired ${formatDate(apiKey.expiresAt)}`
                  : `Expires ${formatDate(apiKey.expiresAt)}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Revoke button — only for active, non-expired keys */}
      {effectivelyActive && (
        <button
          type="button"
          onClick={() => onRevoke(apiKey.id)}
          className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors self-start sm:self-center"
        >
          Revoke
        </button>
      )}
    </div>
  );
}

// ─── Main developers page component ──────────────────────────────────────────

interface DevelopersPageProps {
  orgSlug: string;
  initialKeys: ApiKeyListItem[];
  canManage: boolean;
}

export function DevelopersPage({
  orgSlug,
  initialKeys,
  canManage,
}: DevelopersPageProps) {
  const [keys, setKeys] = useState<ApiKeyListItem[]>(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyListItem | null>(null);
  const [revokeError, setRevokeError] = useState("");
  const [isRevoking, startRevokeTransition] = useTransition();

  const handleCreated = (key: ApiKeyListItem) => {
    // The modal already called onCreated — add to top of list
    setKeys((prev) => [key, ...prev]);
  };

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return;
    setRevokeError("");

    startRevokeTransition(async () => {
      const result = await revokeApiKey(revokeTarget.id, orgSlug);

      if (!result.ok) {
        setRevokeError(result.error);
        return;
      }

      setKeys((prev) =>
        prev.map((k) =>
          k.id === revokeTarget.id ? { ...k, status: "REVOKED" } : k
        )
      );
      setRevokeTarget(null);
    });
  };

  const activeKeys = keys.filter(
    (k) =>
      k.status === "ACTIVE" &&
      (!k.expiresAt || new Date(k.expiresAt) > new Date())
  );
  const inactiveKeys = keys.filter(
    (k) =>
      k.status === "REVOKED" ||
      (k.expiresAt && new Date(k.expiresAt) <= new Date())
  );

  return (
    <>
      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            orgSlug={orgSlug}
            onCreated={handleCreated}
            onClose={() => setShowCreate(false)}
          />
        )}
        {revokeTarget && (
          <RevokeDialog
            keyName={revokeTarget.name}
            onConfirm={handleRevokeConfirm}
            onCancel={() => { setRevokeTarget(null); setRevokeError(""); }}
            isPending={isRevoking}
          />
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* ── API Access section ── */}
        <SettingsSection title="API access">
          <p className="text-[14px] text-text-accent">
            Connect Roll SYNC with your own applications and services using API
            keys. Keys grant programmatic access to your organization&apos;s
            data.
          </p>

          {!canManage && (
            <div className="p-4 rounded-xl bg-accent/50 border border-black/6 text-[13px] text-text-accent">
              You need Admin or Owner access to manage API keys.
            </div>
          )}

          {canManage && (
            <div>
              {revokeError && (
                <p className="text-red-500 text-[13px] mb-3">{revokeError}</p>
              )}

              {/* Active keys */}
              {activeKeys.length > 0 && (
                <div className="space-y-2 mb-4">
                  {activeKeys.map((key) => (
                    <ApiKeyCard
                      key={key.id}
                      apiKey={key}
                      onRevoke={(id) => {
                        const k = keys.find((k) => k.id === id);
                        if (k) setRevokeTarget(k);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {keys.length === 0 && (
                <div className="p-6 rounded-xl bg-white/40 border border-black/8 text-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent mx-auto mb-3 flex items-center justify-center">
                    <Key size={18} className="text-text-accent" />
                  </div>
                  <p className="text-[14px] font-medium text-foreground">
                    No API keys yet
                  </p>
                  <p className="text-[13px] text-text-accent mt-1">
                    Create your first key to start integrating with Roll SYNC.
                  </p>
                </div>
              )}

              {/* Create button */}
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-[24px] py-[12px] rounded-full text-[16px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all"
              >
                <Plus size={14} />
                Create API key
              </button> 
            </div>
          )}
        </SettingsSection>

        {/* ── Revoked / expired keys ── */}
        {canManage && inactiveKeys.length > 0 && (
          <>
            <SettingsDivider />
            <SettingsSection
              title="Revoked &amp; expired keys"
              description="These keys can no longer be used to authenticate API requests."
            >
              <div className="space-y-2">
                {inactiveKeys.map((key) => (
                  <ApiKeyCard
                    key={key.id}
                    apiKey={key}
                    onRevoke={(id) => {
                      const k = keys.find((k) => k.id === id);
                      if (k) setRevokeTarget(k);
                    }}
                  />
                ))}
              </div>
            </SettingsSection>
          </>
        )}

        <SettingsDivider />

        {/* ── Webhooks placeholder ── */}
        <SettingsSection
          title="Webhooks"
          description="Receive Roll SYNC events in your application."
        >
          <div className="p-4 rounded-xl bg-white/40 border border-black/8">
            <p className="text-[14px] text-text-accent">
              Webhook delivery is coming soon. You&apos;ll be able to register
              endpoints and receive real-time event notifications.
            </p>
          </div>
        </SettingsSection>

        <SettingsDivider />

        {/* ── API docs link ── */}
        <div>
          <Link
            href="/docs/api"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-blue hover:text-blue/80 transition-colors"
          >
            View API documentation
            <ExternalLink size={13} />
          </Link>
          <p className="text-[13px] text-text-accent mt-1">
            Learn how to authenticate requests, use endpoints, and integrate
            Roll SYNC into your application.
          </p>
        </div>
      </div>
    </>
  );
}
