"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
  Users,
  BookOpen,
  CalendarDays,
  Building2,
  GraduationCap,
  LayoutGrid,
  Trash2,
  Copy,
  CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateOrganization,
  deleteOrganization,
  type OrgPageData,
} from "@/lib/org-page-actions";
import { useUploadThing } from "@/lib/uploadthing-client";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function entityLabel(type: string): string {
  switch (type) {
    case "SCHOOL":
      return "School";
    case "EVENT":
      return "Event";
    default:
      return "Organization";
  }
}

function entityFallbackIcon(type: string): string {
  switch (type) {
    case "SCHOOL":
      return "/school.svg";
    case "EVENT":
      return "/event.svg";
    default:
      return "/org.svg";
  }
}

function termPeople(type: string): string {
  if (type === "EVENT") return "Attendees";
  return "People";
}

function termClasses(type: string): string {
  if (type === "SCHOOL") return "Classes";
  if (type === "EVENT") return "Groups";
  return "Groups";
}

function termTeachers(type: string): string {
  if (type === "SCHOOL") return "Teachers";
  if (type === "EVENT") return "Facilitators";
  return "Team leads";
}

function termRooms(type: string): string {
  if (type === "SCHOOL") return "Rooms";
  if (type === "EVENT") return "Venues";
  return "Locations";
}

function termTimetable(type: string): string {
  if (type === "SCHOOL") return "Timetable";
  if (type === "EVENT") return "Event schedule";
  return "Schedule";
}

const PERSON_TYPE_LABELS: Record<string, string> = {
  STUDENT: "Students",
  TEACHER: "Teachers",
  STAFF: "Staff",
  ADMINISTRATOR: "Administrators",
  DIRECTOR: "Directors",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

function formatCreatedAt(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

// ─── Small reusable components ────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] font-semibold tracking-tight mb-4">
      {children}
    </h2>
  );
}

function Divider() {
  return <hr className="border-black/6 my-8" />;
}

interface StatRowProps {
  label: string;
  value: number | string;
  href?: string;
  icon?: React.ReactNode;
}

function StatRow({ label, value, href, icon }: StatRowProps) {
  const inner = (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-accent/50 transition-colors group">
      <div className="flex items-center gap-3 text-[15px]">
        {icon && (
          <span className="text-text-accent w-5 flex items-center justify-center">
            {icon}
          </span>
        )}
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[20px] font-semibold">{value}</span>
        {href && (
          <ChevronRight
            size={16}
            className="text-text-accent opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline text-foreground">
        {inner}
      </Link>
    );
  }
  return inner;
}

interface SetupItemProps {
  label: string;
  done: boolean;
  note?: string;
}

function SetupItem({ label, done, note }: SetupItemProps) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div
        className={[
          "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
          done
            ? "bg-green-accent text-green"
            : "bg-accent border border-black/10 text-text-accent",
        ].join(" ")}
        aria-hidden="true"
      >
        {done ? (
          <Check size={11} strokeWidth={2.5} />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-text-accent/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={[
            "text-[14px] font-medium leading-snug",
            done ? "text-foreground" : "text-text-accent",
          ].join(" ")}
        >
          {label}
        </p>
        {note && (
          <p className="text-[12px] text-text-accent mt-0.5">{note}</p>
        )}
      </div>
    </div>
  );
}

// ─── Logo uploader ─────────────────────────────────────────────────────────────

interface LogoUploaderProps {
  orgType: string;
  currentLogoUrl: string | null;
  orgName: string;
  canEdit: boolean;
  orgSlug: string;
}

function LogoUploader({
  orgType,
  currentLogoUrl,
  orgName,
  canEdit,
  orgSlug,
}: LogoUploaderProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl);
  const [hovered, setHovered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveLogo = logoPreview ?? entityFallbackIcon(orgType);
  const hasNewLogo = logoUrl !== currentLogoUrl;

  const { startUpload, isUploading } = useUploadThing("orgLogo", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url ?? null;
      if (url) setLogoUrl(url);
    },
    onUploadError: (err) => {
      setError(err.message ?? "Logo upload failed.");
    },
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError("");
      setLogoPreview(URL.createObjectURL(file));
      setLogoUrl(null); // will be set after upload completes
      await startUpload([file]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [startUpload]
  );

  const handleSave = async () => {
    if (!logoUrl || saving || isUploading) return;
    setError("");
    setSaving(true);
    const result = await updateOrganization({
      slug: orgSlug,
      name: orgName,
      logoUrl,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDiscard = () => {
    setLogoUrl(currentLogoUrl);
    setLogoPreview(currentLogoUrl);
    setError("");
  };

  const isDisabled = !canEdit || saving || isUploading;

  return (
    <div className="flex items-center gap-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isDisabled}
      />
      <button
        type="button"
        onClick={() => canEdit && fileInputRef.current?.click()}
        onMouseEnter={() => canEdit && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={isDisabled}
        className="relative w-[80px] h-[80px] rounded-2xl overflow-hidden bg-accent flex items-center justify-center focus-visible:outline-2 focus-visible:outline-blue/50 disabled:cursor-default shrink-0"
        aria-label={canEdit ? "Change organization logo" : "Organization logo"}
      >
        <Image
          src={effectiveLogo}
          alt={orgName}
          fill
          className="object-cover"
          unoptimized={!!logoPreview && logoPreview !== currentLogoUrl}
        />
        <AnimatePresence>
          {canEdit && (hovered || isUploading) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 rounded-2xl"
            >
              {isUploading ? (
                <Loader2 size={18} className="text-white animate-spin" />
              ) : (
                <>
                  <RefreshCw size={14} className="text-white" />
                  <span className="text-[10px] font-medium text-white">
                    Change
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <div className="flex-1 min-w-0">
        {canEdit && hasNewLogo && !isUploading && (
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !logoUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-blue text-white hover:bg-blue/90 transition-all disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <Check size={12} />
                  Saved
                </>
              ) : (
                "Save logo"
              )}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-60"
            >
              Discard
            </button>
          </div>
        )}
        {canEdit && (
          <p className="text-[12px] text-text-accent">
            {isUploading
              ? "Uploading…"
              : "Click logo to change. JPEG, PNG, or WebP, max 2 MB."}
          </p>
        )}
        {error && (
          <p className="text-[12px] text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Name editor ──────────────────────────────────────────────────────────────

interface NameEditorProps {
  orgName: string;
  orgSlug: string;
  canEdit: boolean;
}

function NameEditor({ orgName, orgSlug, canEdit }: NameEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(orgName);
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const isDirty = name.trim() !== orgName;

  const validate = (v: string): boolean => {
    const t = v.trim();
    if (!t) { setNameError("Name is required."); return false; }
    if (t.length < 2) { setNameError("At least 2 characters."); return false; }
    if (t.length > 100) { setNameError("100 characters or fewer."); return false; }
    setNameError("");
    return true;
  };

  const handleSave = async () => {
    if (!validate(name)) return;
    setError("");
    setSaving(true);
    const result = await updateOrganization({ slug: orgSlug, name: name.trim() });
    setSaving(false);
    if (!result.ok) {
      if (result.field === "name") setNameError(result.error);
      else setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDiscard = () => {
    setName(orgName);
    setNameError("");
    setError("");
  };

  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-text-accent" htmlFor="org-name-field">
        Organization name
      </label>
      <input
        id="org-name-field"
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); if (nameError) validate(e.target.value); }}
        onBlur={() => validate(name)}
        disabled={!canEdit || saving}
        maxLength={100}
        placeholder="Organization name"
        className={[
          "w-full bg-white/60 border border-black/8 rounded-xl px-4 py-2.5 text-[15px] font-medium",
          "outline-none focus:ring-2 focus:ring-blue/30 transition-all disabled:opacity-60",
          nameError ? "ring-2 ring-red-300" : "",
        ].join(" ")}
      />
      <AnimatePresence>
        {nameError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-500 text-[12px]"
            role="alert"
          >
            {nameError}
          </motion.p>
        )}
      </AnimatePresence>
      {error && <p className="text-red-500 text-[12px]" role="alert">{error}</p>}

      <AnimatePresence>
        {isDirty && canEdit && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 pt-1"
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-blue text-white hover:bg-blue/90 transition-all disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 size={13} className="animate-spin" /> Saving…</>
              ) : saved ? (
                <><Check size={13} /> Saved</>
              ) : (
                "Save name"
              )}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="px-4 py-2 rounded-full text-[13px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-60"
            >
              Discard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Slug copy ─────────────────────────────────────────────────────────────────

function SlugDisplay({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex items-center gap-2 w-fit bg-accent/60 hover:bg-accent transition-colors border border-black/5 rounded-xl px-4 py-2.5 text-[14px] font-mono text-text-accent"
      title="Copy organization ID"
    >
      <span>{slug}</span>
      <span className="text-text-accent/60 group-hover:text-text-accent transition-colors">
        {copied ? <CheckCheck size={14} className="text-green" /> : <Copy size={14} />}
      </span>
    </button>
  );
}

// ─── Delete dialog ─────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  orgName: string;
  orgSlug: string;
  onClose: () => void;
}

function DeleteDialog({ orgName, orgSlug, onClose }: DeleteDialogProps) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleDelete = () => {
    setError("");
    startTransition(async () => {
      const result = await deleteOrganization(orgSlug, confirmName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/");
    });
  };

  const matches = confirmName.trim() === orgName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="bg-background rounded-3xl shadow-2xl border border-black/8 w-full max-w-md p-8 space-y-5"
      >
        <div>
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <h3
            id="delete-dialog-title"
            className="text-[20px] font-semibold tracking-tight"
          >
            Delete organization
          </h3>
          <p className="text-[14px] text-text-accent mt-1">
            This will permanently delete <strong className="text-foreground">{orgName}</strong> and all associated data — people, classes, subjects, rooms, timetable entries, and API keys.
          </p>
          <p className="text-[14px] text-text-accent mt-2">
            Roll SYNC user accounts are not affected.
          </p>
          <p className="text-[13px] font-medium text-red-700 mt-3">
            This action cannot be undone.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirm-name-input"
            className="text-[13px] font-medium text-text-accent"
          >
            Type <strong className="text-foreground font-semibold">{orgName}</strong> to confirm
          </label>
          <input
            id="confirm-name-input"
            type="text"
            value={confirmName}
            onChange={(e) => { setConfirmName(e.target.value); setError(""); }}
            placeholder={orgName}
            autoComplete="off"
            className="w-full bg-white/60 border border-black/8 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-red-300 transition-all"
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-600 flex items-center gap-1.5">
            <AlertCircle size={13} />
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-full text-[14px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!matches || isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[14px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Deleting…</>
            ) : (
              <><Trash2 size={14} /> Delete permanently</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OrganizationClientProps {
  data: OrgPageData;
}

export function OrganizationClient({ data }: OrganizationClientProps) {
  const { org, role, counts, setup } = data;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canEdit = role === "OWNER" || role === "ADMIN";
  const isOwner = role === "OWNER";
  const orgType = org.type;

  // ── Setup checklist items ────────────────────────────────────────────────
  const setupItems: { label: string; done: boolean; note?: string }[] = [
    { label: "Organization created", done: setup.orgCreated },
    {
      label: `${termPeople(orgType)} added`,
      done: setup.peopleAdded,
      note: setup.peopleAdded ? undefined : `Add people in the People section`,
    },
    {
      label: `${termClasses(orgType)} configured`,
      done: setup.classesConfigured,
      note: setup.classesConfigured ? undefined : `Create classes in Timetable → Classes`,
    },
    {
      label: "Subjects configured",
      done: setup.subjectsConfigured,
      note: setup.subjectsConfigured ? undefined : `Add subjects in Timetable → Subjects`,
    },
    {
      label: `${termTeachers(orgType)} assigned`,
      done: setup.teachersAssigned,
      note: setup.teachersAssigned ? undefined : `Add teachers as People with type 'Teacher'`,
    },
    {
      label: `${termRooms(orgType)} configured`,
      done: setup.roomsConfigured,
      note: setup.roomsConfigured ? undefined : `Add rooms in Timetable → Rooms`,
    },
    {
      label: `${termTimetable(orgType)} configured`,
      done: setup.timetableConfigured,
      note: setup.timetableConfigured ? undefined : `Set up recurring schedule in Timetable`,
    },
    {
      label: "Attendance recorded",
      done: setup.attendanceRecorded,
      note: "Attendance recording will be available soon",
    },
  ];

  const completedCount = setupItems.filter((i) => i.done).length;
  const totalCount = setupItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // ── People type breakdown ─────────────────────────────────────────────────
  const orderedTypes = ["STUDENT", "TEACHER", "STAFF", "ADMINISTRATOR", "DIRECTOR"];
  const sortedPeopleByType = [...counts.peopleByType].sort(
    (a, b) =>
      orderedTypes.indexOf(a.type) - orderedTypes.indexOf(b.type)
  );

  return (
    <div className="px-8 sm:px-14 pb-24">
      {/* ── Page heading ── */}
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight">Organization</h1>
        <p className="text-[18px] text-text-accent mt-1">
          Manage and review your organization&apos;s identity, structure, and access.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* IDENTITY                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="identity-heading">
        <SectionTitle>
          <span id="identity-heading">Identity</span>
        </SectionTitle>

        <div className="bg-white/60 border border-black/8 rounded-2xl p-6 space-y-6">
          {/* Logo + name + type row */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <LogoUploader
              orgType={orgType}
              currentLogoUrl={org.logoUrl}
              orgName={org.name}
              canEdit={canEdit}
              orgSlug={org.slug}
            />

            <div className="flex-1 min-w-0 space-y-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[28px] font-semibold leading-tight tracking-tight">
                  {org.name}
                </span>
                <span className="text-[13px] font-medium bg-accent text-text-accent px-2.5 py-0.5 rounded-full">
                  {entityLabel(orgType)}
                </span>
              </div>
              {org.subtype && (
                <p className="text-[14px] text-text-accent capitalize">
                  {org.subtype}
                </p>
              )}
              <p className="text-[13px] text-text-accent">
                Created {formatCreatedAt(org.createdAt)}
              </p>
            </div>
          </div>

          <hr className="border-black/6" />

          {/* Name editor */}
          {canEdit ? (
            <NameEditor
              orgName={org.name}
              orgSlug={org.slug}
              canEdit={canEdit}
            />
          ) : (
            <div>
              <p className="text-[13px] font-medium text-text-accent mb-1.5">
                Organization name
              </p>
              <p className="text-[15px] font-medium">{org.name}</p>
            </div>
          )}

          <hr className="border-black/6" />

          {/* Organization ID — read-only */}
          <div>
            <p className="text-[13px] font-medium text-text-accent mb-1.5">
              Organization ID
            </p>
            <SlugDisplay slug={org.slug} />
            <p className="text-[12px] text-text-accent mt-2">
              Used in workspace URLs, API integrations, and QR flows. Cannot be changed.
            </p>
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SETUP / READINESS                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="setup-heading">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>
            <span id="setup-heading">Setup checklist</span>
          </SectionTitle>
          <span className="text-[13px] font-medium text-text-accent">
            {completedCount}/{totalCount} complete
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1.5 bg-accent rounded-full mb-5 overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Setup progress"
        >
          <motion.div
            className="h-full rounded-full bg-blue"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="bg-white/60 border border-black/8 rounded-2xl px-4 divide-y divide-black/5">
          {setupItems.map((item) => (
            <SetupItem
              key={item.label}
              label={item.label}
              done={item.done}
              note={item.note}
            />
          ))}
        </div>
      </section>

      <Divider />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STRUCTURE                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="structure-heading">
        <SectionTitle>
          <span id="structure-heading">Organization structure</span>
        </SectionTitle>

        <div className="bg-white/60 border border-black/8 rounded-2xl overflow-hidden">
          <StatRow
            label={termPeople(orgType)}
            value={counts.activePeople}
            href={`/${org.slug}/people`}
            icon={<Users size={16} />}
          />
          <div className="border-t border-black/5" />
          <StatRow
            label={termClasses(orgType)}
            value={counts.activeClasses}
            href={`/${org.slug}/timetable/classes`}
            icon={<BookOpen size={16} />}
          />
          <div className="border-t border-black/5" />
          <StatRow
            label="Subjects"
            value={counts.totalSubjects}
            href={`/${org.slug}/timetable/subjects`}
            icon={<GraduationCap size={16} />}
          />
          <div className="border-t border-black/5" />
          <StatRow
            label={termRooms(orgType)}
            value={counts.totalRooms}
            href={`/${org.slug}/timetable/rooms`}
            icon={<Building2 size={16} />}
          />
          <div className="border-t border-black/5" />
          <StatRow
            label={termTeachers(orgType)}
            value={counts.totalTeachers}
            href={`/${org.slug}/people`}
            icon={<Users size={16} />}
          />
          <div className="border-t border-black/5" />
          <StatRow
            label={`${termTimetable(orgType)} entries`}
            value={counts.activeTimetableEntries}
            href={`/${org.slug}/timetable`}
            icon={<CalendarDays size={16} />}
          />
          {counts.totalTimetableExceptions > 0 && (
            <>
              <div className="border-t border-black/5" />
              <StatRow
                label="Schedule exceptions"
                value={counts.totalTimetableExceptions}
                href={`/${org.slug}/timetable`}
                icon={<CalendarDays size={16} />}
              />
            </>
          )}
          <div className="border-t border-black/5" />
          <StatRow
            label="Class memberships"
            value={counts.totalClassMemberships}
            icon={<LayoutGrid size={16} />}
          />
        </div>
      </section>

      <Divider />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PEOPLE & ACCESS                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="access-heading">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>
            <span id="access-heading">People &amp; access</span>
          </SectionTitle>
          <Link
            href={`/${org.slug}/people`}
            className="text-[13px] font-medium text-blue hover:underline"
          >
            Manage people →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* People summary */}
          <div className="bg-white/60 border border-black/8 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-[13px] font-medium text-text-accent mb-0.5">
                Total people
              </p>
              <p className="text-[32px] font-semibold tracking-tight leading-none">
                {counts.activePeople}
              </p>
              {counts.peopleWithAccess > 0 && (
                <p className="text-[13px] text-text-accent mt-1">
                  {counts.peopleWithAccess}{" "}
                  {counts.peopleWithAccess === 1 ? "person has" : "people have"}{" "}
                  Roll SYNC access
                </p>
              )}
            </div>

            {sortedPeopleByType.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-black/5">
                {sortedPeopleByType.map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <span className="text-text-accent">
                      {PERSON_TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            )}

            {counts.activePeople === 0 && (
              <p className="text-[13px] text-text-accent">
                No people added yet.{" "}
                <Link
                  href={`/${org.slug}/people`}
                  className="text-blue hover:underline"
                >
                  Add people →
                </Link>
              </p>
            )}
          </div>

          {/* Roll SYNC access (memberships) */}
          <div className="bg-white/60 border border-black/8 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-[13px] font-medium text-text-accent mb-0.5">
                Roll SYNC members
              </p>
              <p className="text-[32px] font-semibold tracking-tight leading-none">
                {counts.totalOrgMembers}
              </p>
              <p className="text-[13px] text-text-accent mt-1">
                Users with workspace access
              </p>
            </div>

            {counts.membersByRole.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-black/5">
                {counts.membersByRole
                  .sort((a, b) => {
                    const order = ["OWNER", "ADMIN", "MEMBER"];
                    return order.indexOf(a.role) - order.indexOf(b.role);
                  })
                  .map((item) => (
                    <div
                      key={item.role}
                      className="flex items-center justify-between text-[13px]"
                    >
                      <span className="text-text-accent">
                        {ROLE_LABELS[item.role] ?? item.role}
                      </span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* QUICK NAVIGATION                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Divider />

      <section aria-labelledby="nav-heading">
        <SectionTitle>
          <span id="nav-heading">Management</span>
        </SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "People", href: `/${org.slug}/people`, icon: <Users size={16} /> },
            { label: termTimetable(orgType), href: `/${org.slug}/timetable`, icon: <CalendarDays size={16} /> },
            { label: "Reports", href: `/${org.slug}/reports`, icon: <LayoutGrid size={16} /> },
            { label: "Developers", href: `/${org.slug}/developers`, icon: <BookOpen size={16} /> },
            { label: "Settings", href: `/${org.slug}/settings`, icon: <Building2 size={16} /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 p-4 bg-white/60 border border-black/8 rounded-2xl hover:bg-accent/60 transition-colors text-[14px] font-medium"
            >
              <span className="text-text-accent">{item.icon}</span>
              {item.label}
              <ChevronRight size={14} className="ml-auto text-text-accent/60" />
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DANGER ZONE — owner only                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isOwner && (
        <>
          <Divider />

          <section aria-labelledby="danger-heading">
            <SectionTitle>
              <span id="danger-heading" className="text-red-700">
                Danger zone
              </span>
            </SectionTitle>

            <div className="border border-red-200 rounded-2xl divide-y divide-red-100 overflow-hidden">
              {/* Delete organization */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-red-900">
                    Delete organization
                  </p>
                  <p className="text-[13px] text-red-700 mt-1 max-w-md">
                    Permanently removes all organization data — people, classes, subjects, rooms, timetable, and API keys. Roll SYNC user accounts are not affected. This cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteDialog(true)}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete organization
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Delete dialog ── */}
      <AnimatePresence>
        {showDeleteDialog && (
          <DeleteDialog
            orgName={org.name}
            orgSlug={org.slug}
            onClose={() => setShowDeleteDialog(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
