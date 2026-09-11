"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  X,
  Check,
  UserRound,
  ShieldCheck,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import {
  updatePerson,
  setPersonStatus,
  addMember,
  type PersonDetail,
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

// ─── Edit Person modal ────────────────────────────────────────────────────────

interface EditPersonModalProps {
  person: PersonDetail;
  orgSlug: string;
  onSaved: () => void;
  onClose: () => void;
}

function EditPersonModal({
  person,
  orgSlug,
  onSaved,
  onClose,
}: EditPersonModalProps) {
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [orgIdentifier, setOrgIdentifier] = useState(
    person.orgIdentifier ?? ""
  );
  const [personType, setPersonType] = useState<PersonType>(person.personType);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [isPending, startTransition] = useTransition();

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

  const handleSave = () => {
    if (!validate()) return;
    setSubmitError("");

    startTransition(async () => {
      const result = await updatePerson({
        slug: orgSlug,
        personId: person.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        orgIdentifier: orgIdentifier.trim() || null,
        personType,
      });

      if (!result.ok) {
        if (result.field) {
          setErrors((p) => ({ ...p, [result.field!]: result.error }));
        } else {
          setSubmitError(result.error);
        }
        return;
      }

      onSaved();
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
      aria-label="Edit person"
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
            <h2 className="text-[18px] font-semibold">Edit person</h2>
            <p className="text-[13px] text-text-accent mt-0.5 truncate max-w-[300px]">
              {person.name}
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
            <label className="text-[13px] font-medium text-text-accent">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: "" }));
              }}
              disabled={isPending}
              maxLength={150}
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
            <label className="text-[13px] font-medium text-text-accent">
              Type <span className="text-red-400">*</span>
            </label>
            <select
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
            <label className="text-[13px] font-medium text-text-accent">
              Email{" "}
              <span className="text-text-accent/60 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
              }}
              disabled={isPending}
              maxLength={200}
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
            <label className="text-[13px] font-medium text-text-accent">
              Phone{" "}
              <span className="text-text-accent/60 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
              maxLength={30}
              className="w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px] border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all placeholder:text-text-accent/50 disabled:opacity-60"
            />
          </div>

          {/* Org identifier */}
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-text-accent">
              Organization ID{" "}
              <span className="text-text-accent/60 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={orgIdentifier}
              onChange={(e) => {
                setOrgIdentifier(e.target.value);
                if (errors.orgIdentifier)
                  setErrors((p) => ({ ...p, orgIdentifier: "" }));
              }}
              disabled={isPending}
              maxLength={100}
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/50 disabled:opacity-60",
                errors.orgIdentifier ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            {errors.orgIdentifier && (
              <p className="text-red-500 text-[12px] pl-1">
                {errors.orgIdentifier}
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
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check size={13} />
                Save changes
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-3 border-b border-black/5 last:border-0">
      <p className="sm:w-[180px] shrink-0 text-[13px] text-text-accent">{label}</p>
      <p className={`text-[14px] text-foreground ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="text-text-accent/50">—</span>}
      </p>
    </div>
  );
}

// ─── Add Member panel ─────────────────────────────────────────────────────────
// Shown when the person has no linked account yet.
// Admin clicks "Add as member" → prompts for email → provisions account.

interface AddMemberPanelProps {
  person: PersonDetail;
  orgSlug: string;
  onSuccess: () => void;
}

function AddMemberPanel({ person, orgSlug, onSuccess }: AddMemberPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState(person.email ?? "");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const handleAdd = () => {
    const e: Record<string, string> = {};
    const em = email.trim().toLowerCase();
    if (!em) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = "Invalid email address.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitError("");
    startTransition(async () => {
      const result = await addMember({
        slug: orgSlug,
        name: person.name,
        email: em,
        personType: person.personType,
        existingPersonId: person.id,
      });

      if (!result.ok) {
        if (result.field === "email") {
          setErrors({ email: result.error });
        } else {
          setSubmitError(result.error);
        }
        return;
      }

      setSuccess(true);
      onSuccess();
    });
  };

  if (success) {
    return (
      <div className="flex items-start gap-3 p-1">
        <div className="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center shrink-0 mt-0.5">
          <Check size={15} className="text-green" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-green">Account provisioned</p>
          <p className="text-[13px] text-text-accent mt-0.5">
            {person.name} now has a Roll SYNC account and organization membership.
            Their initial password is the organization ID — they should change it on first login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <div className="flex items-start gap-3 p-1">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck size={15} className="text-text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-medium">No Roll SYNC access</p>
            <p className="text-[13px] text-text-accent mt-0.5">
              This person can participate in attendance but cannot log in to Roll SYNC.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all"
            >
              <UserPlus size={13} />
              Add as member
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-blue/5 border border-blue/15 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-blue">Add as Roll SYNC member</p>
              <p className="text-[12px] text-text-accent mt-0.5">
                This creates an official account. The initial password is the organization ID.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowForm(false); setErrors({}); setSubmitError(""); }}
              className="shrink-0 p-1 rounded-full text-text-accent hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Email field */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-text-accent">
              Email address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              disabled={isPending}
              maxLength={200}
              placeholder="e.g. jane@school.edu"
              className={[
                "w-full bg-white/70 rounded-xl px-3 py-2 text-[14px]",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/50 disabled:opacity-60",
                errors.email ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            {errors.email && (
              <p className="text-red-500 text-[12px] pl-1">{errors.email}</p>
            )}
          </div>

          {submitError && (
            <p className="text-red-600 text-[13px]" role="alert">
              {submitError}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setErrors({}); setSubmitError(""); }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus size={12} />
                  Create account
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main detail component ────────────────────────────────────────────────────

interface PersonDetailClientProps {
  person: PersonDetail;
  orgSlug: string;
  canManage: boolean;
}

export function PersonDetailClient({
  person,
  orgSlug,
  canManage,
}: PersonDetailClientProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [isChangingStatus, startStatusTransition] = useTransition();
  const [statusError, setStatusError] = useState("");

  const handleStatusToggle = () => {
    setStatusError("");
    const newStatus: PersonStatus =
      person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    startStatusTransition(async () => {
      const result = await setPersonStatus(orgSlug, person.id, newStatus);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const accessInfo = () => {
    if (!person.linkedUserId) return null;
    const role = person.linkedUserRole;
    const name = person.linkedUserName ?? "Unknown user";
    const email = person.linkedUserEmail ?? "";
    const roleLabel =
      role === "OWNER" ? "Owner" : role === "ADMIN" ? "Admin" : "Member";
    return { name, email, roleLabel };
  };

  const linked = accessInfo();

  return (
    <>
      <AnimatePresence>
        {showEdit && canManage && (
          <EditPersonModal
            person={person}
            orgSlug={orgSlug}
            onSaved={() => router.refresh()}
            onClose={() => setShowEdit(false)}
          />
        )}
      </AnimatePresence>

      <div className="px-20 sm:px-32 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-8 text-[13px] text-text-accent">
          <Link
            href={`/${orgSlug}/people`}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft size={13} />
            People
          </Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {person.name}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shrink-0">
              <UserRound size={28} className="text-text-accent" />
            </div>
            <div>
              <h1 className="text-[30px] font-semibold tracking-tight">
                {person.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[14px] text-text-accent">
                  {PERSON_TYPE_LABELS[person.personType]}
                </span>
                <span className="text-text-accent/40">·</span>
                {person.status === "ACTIVE" ? (
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-green">
                    <span className="w-1.5 h-1.5 rounded-full bg-green" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-text-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-accent/40" />
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 mt-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-accent hover:bg-accent/70 transition-colors"
              >
                <Pencil size={13} />
                Edit
              </button>
              <button
                type="button"
                onClick={handleStatusToggle}
                disabled={isChangingStatus}
                className={[
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all disabled:opacity-60",
                  person.status === "ACTIVE"
                    ? "bg-accent text-text-accent hover:bg-accent/70"
                    : "bg-blue/10 text-blue hover:bg-blue/15",
                ].join(" ")}
              >
                {isChangingStatus ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : person.status === "ACTIVE" ? (
                  "Deactivate"
                ) : (
                  "Reactivate"
                )}
              </button>
            </div>
          )}
        </div>

        {statusError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {statusError}
          </div>
        )}

        <div className="space-y-10 max-w-[700px]">
          {/* ── Identity ── */}
          <section>
            <h2 className="text-[17px] font-semibold mb-1">Identity</h2>
            <p className="text-[13px] text-text-accent mb-4">
              This person&apos;s information within your organization.
            </p>
            <div className="rounded-2xl bg-white/60 border border-black/8 px-5">
              <InfoRow label="Full name" value={person.name} />
              <InfoRow
                label="Type"
                value={PERSON_TYPE_LABELS[person.personType]}
              />
              <InfoRow
                label="Organization ID"
                value={person.orgIdentifier}
                mono
              />
              <InfoRow label="Email" value={person.email} />
              <InfoRow label="Phone" value={person.phone} />
            </div>
          </section>

          {/* ── Roll SYNC Access ── */}
          <section>
            <h2 className="text-[17px] font-semibold mb-1">
              Roll SYNC access
            </h2>
            <p className="text-[13px] text-text-accent mb-4">
              Whether this person has a Roll SYNC account linked to their
              organization identity.
            </p>

            {linked ? (
              <div className="rounded-2xl bg-white/60 border border-black/8 px-5">
                <InfoRow label="Account" value={linked.name} />
                <InfoRow label="Email" value={linked.email} />
                <InfoRow label="Role" value={linked.roleLabel} />
              </div>
            ) : (
              <div className="rounded-2xl bg-white/60 border border-black/8 p-5">
                {/* Add Member panel — available for any person type when canManage + active */}
                {canManage && person.status === "ACTIVE" ? (
                  <AddMemberPanel
                    person={person}
                    orgSlug={orgSlug}
                    onSuccess={() => router.refresh()}
                  />
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck size={15} className="text-text-accent" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium">No Roll SYNC access</p>
                      <p className="text-[13px] text-text-accent mt-0.5">
                        This person can participate in attendance but cannot log
                        in to Roll SYNC.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Attendance (future) ── */}
          <section>
            <h2 className="text-[17px] font-semibold mb-1">Attendance</h2>
            <p className="text-[13px] text-text-accent mb-4">
              Attendance history for this person.
            </p>
            <div className="rounded-2xl bg-white/60 border border-black/8 p-5">
              <p className="text-[14px] text-text-accent">
                Attendance records will appear here once attendance sessions are
                configured.
              </p>
            </div>
          </section>

          {/* ── Meta ── */}
          <section>
            <h2 className="text-[17px] font-semibold mb-4">Details</h2>
            <div className="rounded-2xl bg-white/60 border border-black/8 px-5">
              <InfoRow
                label="Added"
                value={formatDate(person.createdAt)}
              />
              <InfoRow
                label="Last updated"
                value={formatDate(person.updatedAt)}
              />
              <InfoRow label="Status" value={person.status === "ACTIVE" ? "Active" : "Inactive"} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
