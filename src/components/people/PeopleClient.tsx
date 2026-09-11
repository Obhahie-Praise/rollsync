"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  X,
  Loader2,
  UserRound,
  ChevronDown,
  Check,
  CheckCheck,
  Copy,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import {
  listPeople,
  createPerson,
  addMember,
  setPersonStatus,
  type PersonListItem,
  type PersonType,
  type PersonStatus,
} from "@/lib/people-actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
  STAFF: "Staff",
  ADMINISTRATOR: "Administrator",
  DIRECTOR: "Director",
};

const PERSON_TYPE_OPTIONS = (
  Object.entries(PERSON_TYPE_LABELS) as [PersonType, string][]
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accessLabel(person: PersonListItem): {
  label: string;
  variant: "none" | "member" | "admin" | "owner";
} {
  if (!person.linkedUserId) return { label: "No access", variant: "none" };
  const role = person.linkedUserRole;
  if (role === "OWNER") return { label: "Owner", variant: "owner" };
  if (role === "ADMIN") return { label: "Admin", variant: "admin" };
  return { label: "Member", variant: "member" };
}

// ─── Select dropdown ──────────────────────────────────────────────────────────

interface SelectProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder: string;
  disabled?: boolean;
}

function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={[
          "flex items-center gap-2 h-9 px-3 rounded-full text-[13px] font-medium border transition-colors whitespace-nowrap",
          value
            ? "bg-blue/10 border-blue/20 text-blue"
            : "bg-white/60 border-black/10 text-foreground hover:bg-white/80",
          disabled ? "opacity-50 cursor-default" : "cursor-pointer",
        ].join(" ")}
      >
        {selected ? selected.label : placeholder}
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1.5 z-30 min-w-[160px] bg-background rounded-2xl border border-black/8 shadow-[0_4px_20px_rgba(0,0,0,0.10)] py-1.5 overflow-hidden"
          >
            {value && (
              <button
                type="button"
                onClick={() => { onChange("" as T); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-[13px] text-text-accent hover:bg-accent/50 transition-colors"
              >
                Clear filter
              </button>
            )}
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={[
                  "w-full text-left px-4 py-2 text-[13px] flex items-center justify-between transition-colors",
                  opt.value === value
                    ? "text-blue bg-blue/5"
                    : "text-foreground hover:bg-accent/50",
                ].join(" ")}
              >
                {opt.label}
                {opt.value === value && <Check size={12} className="text-blue" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Add Person modal ─────────────────────────────────────────────────────────

interface AddPersonModalProps {
  orgSlug: string;
  onCreated: (person: PersonListItem) => void;
  onClose: () => void;
}

function AddPersonModal({ orgSlug, onCreated, onClose }: AddPersonModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orgIdentifier, setOrgIdentifier] = useState("");
  const [personType, setPersonType] = useState<PersonType>("STUDENT");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const n = name.trim();
    if (!n) e.name = "Name is required.";
    else if (n.length < 2) e.name = "At least 2 characters.";
    else if (n.length > 150) e.name = "150 characters or fewer.";

    const em = email.trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      e.email = "Invalid email address.";
    }

    const id = orgIdentifier.trim();
    if (id && id.length > 100) e.orgIdentifier = "100 characters or fewer.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitError("");

    startTransition(async () => {
      const result = await createPerson({
        slug: orgSlug,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        orgIdentifier: orgIdentifier.trim() || null,
        personType,
      });

      if (!result.ok) {
        if (result.field) {
          setErrors((prev) => ({ ...prev, [result.field!]: result.error }));
        } else {
          setSubmitError(result.error);
        }
        return;
      }

      onCreated(result.person);
      onClose();
    });
  };

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-label="Add person"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[480px] bg-background rounded-2xl shadow-[0px_8px_40px_0_rgba(0,0,0,0.15)] border border-black/6 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[18px] font-semibold">Add person</h2>
            <p className="text-[13px] text-text-accent mt-0.5">
              Add someone to your organization. They won&apos;t get Roll SYNC access
              unless explicitly invited.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-accent transition-colors text-text-accent shrink-0 ml-4"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="person-name" className="text-[13px] font-medium text-text-accent">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              id="person-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: "" }));
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              disabled={isPending}
              maxLength={150}
              placeholder="e.g. Jane Smith"
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/50 disabled:opacity-60",
                errors.name ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            {errors.name && (
              <p className="text-red-500 text-[12px] pl-1">{errors.name}</p>
            )}
          </div>

          {/* Person type */}
          <div className="space-y-1">
            <label htmlFor="person-type" className="text-[13px] font-medium text-text-accent">
              Type <span className="text-red-400">*</span>
            </label>
            <select
              id="person-type"
              value={personType}
              onChange={(e) => setPersonType(e.target.value as PersonType)}
              disabled={isPending}
              className="w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px] border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all disabled:opacity-60"
            >
              {PERSON_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="person-email" className="text-[13px] font-medium text-text-accent">
              Email{" "}
              <span className="text-text-accent/60 font-normal">(optional)</span>
            </label>
            <input
              id="person-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
              }}
              disabled={isPending}
              maxLength={200}
              placeholder="e.g. jane@school.edu"
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/50 disabled:opacity-60",
                errors.email ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            {errors.email && (
              <p className="text-red-500 text-[12px] pl-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label htmlFor="person-phone" className="text-[13px] font-medium text-text-accent">
              Phone{" "}
              <span className="text-text-accent/60 font-normal">(optional)</span>
            </label>
            <input
              id="person-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
              maxLength={30}
              placeholder="e.g. +1 555 000 0000"
              className="w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px] border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all placeholder:text-text-accent/50 disabled:opacity-60"
            />
          </div>

          {/* Org identifier */}
          <div className="space-y-1">
            <label
              htmlFor="person-org-id"
              className="text-[13px] font-medium text-text-accent"
            >
              Organization ID{" "}
              <span className="text-text-accent/60 font-normal">(optional)</span>
            </label>
            <input
              id="person-org-id"
              type="text"
              value={orgIdentifier}
              onChange={(e) => {
                setOrgIdentifier(e.target.value);
                if (errors.orgIdentifier)
                  setErrors((p) => ({ ...p, orgIdentifier: "" }));
              }}
              disabled={isPending}
              maxLength={100}
              placeholder="e.g. STU-2024-001"
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/50 disabled:opacity-60",
                errors.orgIdentifier ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            {errors.orgIdentifier ? (
              <p className="text-red-500 text-[12px] pl-1">
                {errors.orgIdentifier}
              </p>
            ) : (
              <p className="text-[12px] text-text-accent pl-1">
                Used by future attendance methods (QR, ID scan, roll call).
              </p>
            )}
          </div>
        </div>

        {submitError && (
          <p className="text-red-500 text-[13px] mt-4" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-full text-[13px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <UserRound size={13} />
                Add person
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Member modal ─────────────────────────────────────────────────────────
// Provisions a full Roll SYNC account (User + Person + Membership) for someone
// who will actively use Roll SYNC (e.g. a teacher signing in to take attendance).

interface AddMemberModalProps {
  orgSlug: string;
  onCreated: (person: PersonListItem) => void;
  onClose: () => void;
}

function AddMemberModal({ orgSlug, onCreated, onClose }: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [personType, setPersonType] = useState<PersonType>("TEACHER");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  // Credentials shown after successful creation
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    initialPassword: string;
    name: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const n = name.trim();
    if (!n) e.name = "Name is required.";
    else if (n.length < 2) e.name = "At least 2 characters.";
    else if (n.length > 150) e.name = "150 characters or fewer.";

    const em = email.trim();
    if (!em) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = "Invalid email address.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitError("");

    startTransition(async () => {
      const result = await addMember({
        slug: orgSlug,
        name: name.trim(),
        email: email.trim(),
        personType,
      });

      if (!result.ok) {
        if (result.field) {
          setErrors((prev) => ({ ...prev, [result.field!]: result.error }));
        } else {
          setSubmitError(result.error);
        }
        return;
      }

      // Notify parent immediately so the list updates
      onCreated({
        id: result.personId,
        name: name.trim(),
        email: email.trim(),
        phone: null,
        orgIdentifier: null,
        personType,
        status: "ACTIVE",
        linkedUserId: "provisioned", // non-null signals access
        linkedUserName: name.trim(),
        linkedUserEmail: email.trim(),
        linkedUserRole: "MEMBER",
        createdAt: new Date(),
      });

      // Show credentials before closing
      setCreatedCredentials({
        email: email.trim(),
        initialPassword: result.initialPassword,
        name: name.trim(),
      });
    });
  };

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // ── Success / credentials view ──────────────────────────────────────────────
  if (createdCredentials) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        aria-modal="true"
        role="dialog"
        aria-label="Account created"
      >
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden="true"
        />
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-[480px] bg-background rounded-2xl shadow-[0px_8px_40px_0_rgba(0,0,0,0.15)] border border-black/6 p-6"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
              <Check size={22} className="text-green" />
            </div>
            <h2 className="text-[18px] font-semibold">Account created</h2>
            <p className="text-[13px] text-text-accent mt-1">
              Share these login credentials with {createdCredentials.name}.
            </p>
          </div>

          <div className="rounded-2xl bg-accent/50 border border-black/8 p-4 space-y-3 mb-5">
            <div>
              <p className="text-[11px] font-semibold text-text-accent uppercase tracking-wide mb-1">
                Email
              </p>
              <p className="text-[15px] font-medium">{createdCredentials.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-accent uppercase tracking-wide mb-1">
                Initial password
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-mono font-medium flex-1">
                  {createdCredentials.initialPassword}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(createdCredentials.initialPassword);
                      setCopiedPassword(true);
                      setTimeout(() => setCopiedPassword(false), 2000);
                    } catch { /* silent */ }
                  }}
                  className="shrink-0 p-1.5 rounded-lg bg-white border border-black/8 text-text-accent hover:text-foreground transition-colors"
                  aria-label="Copy password"
                >
                  {copiedPassword
                    ? <CheckCheck size={14} className="text-green" />
                    : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-text-accent text-center mb-5">
            They should change their password after first login via Settings → Security.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-full text-[14px] font-medium bg-blue text-white hover:bg-blue/90 transition-colors"
          >
            Done
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Add member form ─────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-label="Add member"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={prefersReduced ? {} : { opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[480px] bg-background rounded-2xl shadow-[0px_8px_40px_0_rgba(0,0,0,0.15)] border border-black/6 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[18px] font-semibold">Add member</h2>
            <p className="text-[13px] text-text-accent mt-0.5">
              Creates an official Roll SYNC account for this person. They&apos;ll be
              able to log in with their initial password (the organization ID).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-accent transition-colors text-text-accent shrink-0 ml-4"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2.5 mb-4 p-3.5 rounded-xl bg-blue/5 border border-blue/15">
          <ShieldCheck size={15} className="shrink-0 text-blue mt-0.5" />
          <p className="text-[12px] text-blue/80 leading-relaxed">
            A Roll SYNC account, person record, and organization membership will be created.
            Existing accounts will be reused rather than duplicated.
          </p>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="member-name" className="text-[13px] font-medium text-text-accent">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              id="member-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: "" }));
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              disabled={isPending}
              maxLength={150}
              placeholder="e.g. Jane Smith"
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/50 disabled:opacity-60",
                errors.name ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            {errors.name && (
              <p className="text-red-500 text-[12px] pl-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="member-email" className="text-[13px] font-medium text-text-accent">
              Email address <span className="text-red-400">*</span>
            </label>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              disabled={isPending}
              maxLength={200}
              placeholder="e.g. jane@school.edu"
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/50 disabled:opacity-60",
                errors.email ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            {errors.email && (
              <p className="text-red-500 text-[12px] pl-1">{errors.email}</p>
            )}
          </div>

          {/* Person type */}
          <div className="space-y-1">
            <label htmlFor="member-type" className="text-[13px] font-medium text-text-accent">
              Type <span className="text-red-400">*</span>
            </label>
            <select
              id="member-type"
              value={personType}
              onChange={(e) => setPersonType(e.target.value as PersonType)}
              disabled={isPending}
              className="w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px] border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all disabled:opacity-60"
            >
              {PERSON_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {submitError && (
          <p className="text-red-500 text-[13px] mt-4" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-full text-[13px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <UserPlus size={13} />
                Add member
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Access badge ─────────────────────────────────────────────────────────────

function AccessBadge({ person }: { person: PersonListItem }) {
  const { label, variant } = accessLabel(person);
  const cls = {
    none: "bg-accent text-text-accent",
    member: "bg-blue/10 text-blue",
    admin: "bg-blue/15 text-blue font-semibold",
    owner: "bg-dark-accent text-white",
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PersonStatus }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-accent text-green">
        <span className="w-1.5 h-1.5 rounded-full bg-green" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent text-text-accent">
      <span className="w-1.5 h-1.5 rounded-full bg-text-accent/40" />
      Inactive
    </span>
  );
}

// ─── Person row ───────────────────────────────────────────────────────────────

interface PersonRowProps {
  person: PersonListItem;
  slug: string;
  canManage: boolean;
  onStatusChange: (id: string, status: PersonStatus) => void;
  isPendingStatus: boolean;
}

function PersonRow({
  person,
  slug,
  canManage,
  onStatusChange,
  isPendingStatus,
}: PersonRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="group border-b border-black/5 hover:bg-black/[0.015] transition-colors"
    >
      {/* Name */}
      <td className="py-3 pl-0 pr-4">
        <Link
          href={`/${slug}/people/${person.id}`}
          className="block"
          prefetch={false}
        >
          <p
            className={`text-[14px] font-medium hover:text-blue transition-colors ${
              person.status === "INACTIVE" ? "text-text-accent line-through decoration-text-accent/40" : "text-foreground"
            }`}
          >
            {person.name}
          </p>
          {person.email && (
            <p className="text-[12px] text-text-accent mt-0.5 truncate max-w-[220px]">
              {person.email}
            </p>
          )}
          {!person.email && person.orgIdentifier && (
            <p className="text-[12px] text-text-accent mt-0.5 font-mono">
              {person.orgIdentifier}
            </p>
          )}
        </Link>
      </td>

      {/* Type */}
      <td className="py-3 px-4 hidden sm:table-cell">
        <span className="text-[13px] text-text-accent">
          {PERSON_TYPE_LABELS[person.personType]}
        </span>
      </td>

      {/* Access */}
      <td className="py-3 px-4 hidden md:table-cell">
        <AccessBadge person={person} />
      </td>

      {/* Status */}
      <td className="py-3 px-4 hidden sm:table-cell">
        <StatusBadge status={person.status} />
      </td>

      {/* Actions */}
      {canManage && (
        <td className="py-3 pl-4 pr-0 text-right">
          <div ref={menuRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={isPendingStatus}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-2 py-1 rounded-lg text-[12px] font-medium text-text-accent hover:bg-accent transition-all"
              aria-label="Actions"
            >
              ···
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-background rounded-xl border border-black/8 shadow-[0_4px_20px_rgba(0,0,0,0.10)] py-1 overflow-hidden"
                >
                  <Link
                    href={`/${slug}/people/${person.id}`}
                    className="block px-4 py-2 text-[13px] text-foreground hover:bg-accent/50 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    View details
                  </Link>
                  {person.status === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => {
                        onStatusChange(person.id, "INACTIVE");
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-[13px] text-text-accent hover:bg-accent/50 transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onStatusChange(person.id, "ACTIVE");
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-[13px] text-blue hover:bg-blue/5 transition-colors"
                    >
                      Reactivate
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </td>
      )}
    </motion.tr>
  );
}

// ─── Main PeopleClient ────────────────────────────────────────────────────────

interface PeopleClientProps {
  orgSlug: string;
  initialPeople: PersonListItem[];
  canManage: boolean;
  totalActive: number;
}

export function PeopleClient({
  orgSlug,
  initialPeople,
  canManage,
  totalActive,
}: PeopleClientProps) {
  const router = useRouter();

  // List state
  const [people, setPeople] = useState<PersonListItem[]>(initialPeople);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PersonType | "">("");
  const [statusFilter, setStatusFilter] = useState<PersonStatus | "">("ACTIVE");
  const [accessFilter, setAccessFilter] = useState<"yes" | "no" | "">("");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Status changes
  const [, startStatusTransition] = useTransition();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  // Debounced search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPeople = useCallback(
    async (
      searchVal: string,
      typeVal: PersonType | "",
      statusVal: PersonStatus | "",
      accessVal: "yes" | "no" | ""
    ) => {
      setLoading(true);
      setLoadError("");
      const result = await listPeople({
        slug: orgSlug,
        search: searchVal,
        personType: typeVal,
        status: statusVal,
        hasAccess: accessVal,
      });
      setLoading(false);
      if (result.ok) {
        setPeople(result.people);
      } else {
        setLoadError(result.error);
      }
    },
    [orgSlug]
  );

  // Re-fetch whenever filters change (search is debounced)
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchPeople(val, typeFilter, statusFilter, accessFilter);
    }, 300);
  };

  const handleTypeChange = (val: PersonType | "") => {
    setTypeFilter(val);
    fetchPeople(search, val, statusFilter, accessFilter);
  };

  const handleStatusChange = (val: PersonStatus | "") => {
    setStatusFilter(val);
    fetchPeople(search, typeFilter, val, accessFilter);
  };

  const handleAccessChange = (val: "yes" | "no" | "") => {
    setAccessFilter(val);
    fetchPeople(search, typeFilter, statusFilter, val);
  };

  const handleStatusToggle = (personId: string, newStatus: PersonStatus) => {
    setPendingStatusId(personId);
    startStatusTransition(async () => {
      const result = await setPersonStatus(orgSlug, personId, newStatus);
      setPendingStatusId(null);
      if (result.ok) {
        router.refresh();
        await fetchPeople(search, typeFilter, statusFilter, accessFilter);
      }
    });
  };

  const handleCreated = (person: PersonListItem) => {
    setPeople((prev) => [person, ...prev]);
    router.refresh(); // update the active count in the header
  };

  const activeFiltersCount = [typeFilter, statusFilter !== "ACTIVE" ? statusFilter : "", accessFilter].filter(Boolean).length;

  return (
    <>
      <AnimatePresence>
        {showAdd && (
          <AddPersonModal
            orgSlug={orgSlug}
            onCreated={handleCreated}
            onClose={() => setShowAdd(false)}
          />
        )}
        {showAddMember && (
          <AddMemberModal
            orgSlug={orgSlug}
            onCreated={(person) => {
              setPeople((prev) => [person, ...prev]);
              router.refresh();
            }}
            onClose={() => setShowAddMember(false)}
          />
        )}
      </AnimatePresence>

      <div className="px-8 sm:px-14 pb-20">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[40px] font-semibold tracking-tight">People</h1>
              {totalActive > 0 && (
                <span className="mt-1 px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-accent text-text-accent">
                  {totalActive} active
                </span>
              )}
            </div>
            <p className="text-[16px] text-text-accent mt-1.5">
              Manage the people in your organization. People are attendance identities — they don&apos;t need a Roll SYNC account.
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 mt-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-accent text-foreground hover:bg-accent/70 active:scale-[0.97] transition-all border border-black/8"
              >
                <UserPlus size={16} />
                Add member
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all"
              >
                <Plus size={16} />
                Add person
              </button>
            </div>
          )}
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-accent pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email, or ID…"
              className="w-full h-9 pl-9 pr-3 rounded-full text-[13px] bg-white/60 border border-black/10 outline-none focus:ring-2 focus:ring-blue/30 transition-all placeholder:text-text-accent/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Type filter */}
          <Select<PersonType | "">
            value={typeFilter}
            onChange={handleTypeChange}
            options={PERSON_TYPE_OPTIONS.map(([v, l]) => ({ value: v, label: l }))}
            placeholder="All types"
          />

          {/* Status filter */}
          <Select<PersonStatus | "">
            value={statusFilter}
            onChange={handleStatusChange}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            placeholder="All statuses"
          />

          {/* Access filter */}
          <Select<"yes" | "no" | "">
            value={accessFilter}
            onChange={handleAccessChange}
            options={[
              { value: "yes", label: "Has access" },
              { value: "no", label: "No access" },
            ]}
            placeholder="All access"
          />

          {/* Clear filters */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("");
                setStatusFilter("ACTIVE");
                setAccessFilter("");
                fetchPeople(search, "", "ACTIVE", "");
              }}
              className="h-9 px-3 rounded-full text-[13px] text-text-accent hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              Reset filters
            </button>
          )}

          {/* Loading indicator */}
          {loading && (
            <Loader2 size={14} className="text-text-accent animate-spin ml-1" />
          )}
        </div>

        {/* ── Error state ── */}
        {loadError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {loadError}
          </div>
        )}

        {/* ── Table ── */}
        {people.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-black/8">
                  <th className="text-left py-2.5 pl-0 pr-4 text-[12px] font-semibold text-text-accent uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left py-2.5 px-4 text-[12px] font-semibold text-text-accent uppercase tracking-wide hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left py-2.5 px-4 text-[12px] font-semibold text-text-accent uppercase tracking-wide hidden md:table-cell">
                    Access
                  </th>
                  <th className="text-left py-2.5 px-4 text-[12px] font-semibold text-text-accent uppercase tracking-wide hidden sm:table-cell">
                    Status
                  </th>
                  {canManage && (
                    <th className="py-2.5 pl-4 pr-0 text-right text-[12px] font-semibold text-text-accent uppercase tracking-wide">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <AnimatePresence mode="popLayout">
                <tbody>
                  {people.map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      slug={orgSlug}
                      canManage={canManage}
                      onStatusChange={handleStatusToggle}
                      isPendingStatus={pendingStatusId === person.id}
                    />
                  ))}
                </tbody>
              </AnimatePresence>
            </table>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
              <UserRound size={24} className="text-text-accent" />
            </div>
            {search || typeFilter || accessFilter || statusFilter ? (
              <>
                <p className="text-[16px] font-medium text-foreground">
                  No people found
                </p>
                <p className="text-[14px] text-text-accent mt-1">
                  Try adjusting your search or filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("");
                    setStatusFilter("ACTIVE");
                    setAccessFilter("");
                    fetchPeople("", "", "ACTIVE", "");
                  }}
                  className="mt-4 px-4 py-2 rounded-full text-[13px] font-medium bg-accent hover:bg-accent/70 transition-colors"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-[16px] font-medium text-foreground">
                  No people yet
                </p>
                <p className="text-[14px] text-text-accent mt-1 max-w-[300px]">
                  Add your first person to start building your organization&apos;s attendance identities.
                </p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium bg-blue text-white hover:bg-blue/90 transition-all"
                  >
                    <Plus size={14} />
                    Add person
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Row count */}
        {people.length > 0 && (
          <p className="mt-4 text-[12px] text-text-accent">
            {people.length} {people.length === 1 ? "person" : "people"}
            {(search || typeFilter || statusFilter || accessFilter) && " matching filters"}
          </p>
        )}
      </div>
    </>
  );
}
