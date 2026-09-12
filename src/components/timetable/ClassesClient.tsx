"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  X,
  Loader2,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Users,
  QrCode,
  Download,
  Copy,
  Check,
} from "lucide-react";
import {
  listClasses,
  createClass,
  updateClass,
  setClassStatus,
  type ClassItem,
  type ClassStatus,
} from "@/lib/timetable-actions";
import { generateQRCodeDataURL } from "@/lib/qr-generator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: ClassStatus) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-neutral-100 text-neutral-500">
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
      Inactive
    </span>
  );
}

// ─── QR Panel ─────────────────────────────────────────────────────────────────

interface QRPanelProps {
  cls: ClassItem;
  onClose: () => void;
}

function QRPanel({ cls, onClose }: QRPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The canonical Roll SYNC class URL encoded in the QR
  const qrPayload = `https://rollsync.app/c/${cls.publicCode}`;

  useEffect(() => {
    if (!cls.publicCode) return;
    let cancelled = false;
    // Use a microtask to avoid calling setState synchronously in the effect body
    const generate = async () => {
      try {
        const url = generateQRCodeDataURL(qrPayload, 320);
        if (!cancelled) setQrDataUrl(url);
      } catch {
        // ignore generation errors
      }
    };
    void generate();
    return () => {
      cancelled = true;
    };
  }, [cls.publicCode, qrPayload]);

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    // Filename: "SS2A-class-qr.png"
    const safeName = cls.name.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 40) || "class";
    a.download = `${safeName}-class-qr.png`;
    a.click();
  }, [qrDataUrl, cls.name]);

  const handleCopy = useCallback(async () => {
    if (!cls.publicCode) return;
    try {
      await navigator.clipboard.writeText(cls.publicCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }, [cls.publicCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-xs bg-background rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`QR code for ${cls.name}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[18px] font-semibold">{cls.name}</p>
            {cls.code && (
              <p className="text-[13px] text-text-accent">{cls.code}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-accent transition-colors text-text-accent"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {cls.publicCode ? (
          <>
            {/* Public code display */}
            <div className="flex items-center justify-between bg-accent/60 rounded-xl px-4 py-2.5 mb-4">
              <span className="font-mono text-[15px] font-medium tracking-widest">
                {cls.publicCode}
              </span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-text-accent"
                aria-label="Copy class code"
                title="Copy code"
              >
                {copied ? (
                  <Check size={14} className="text-green-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>

            {/* QR code */}
            <div className="flex justify-center mb-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${cls.name} (${cls.publicCode})`}
                  width={200}
                  height={200}
                  className="rounded-xl border border-black/8"
                />
              ) : (
                <div className="w-[200px] h-[200px] rounded-xl bg-accent flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-text-accent" />
                </div>
              )}
            </div>

            <p className="text-[12px] text-text-accent text-center mb-4 leading-relaxed">
              Teachers scan this QR to check in to{" "}
              <span className="font-medium text-foreground">{cls.name}</span>.
            </p>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue text-white text-[15px] font-medium hover:bg-blue/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Download size={16} />
              Download QR
            </button>
          </>
        ) : (
          <p className="text-[14px] text-text-accent text-center py-8">
            No QR code available for this class.
          </p>
        )}
      </motion.div>
    </div>
  );
}



function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
        <Users size={28} strokeWidth={1.4} className="text-text-accent" />
      </div>
      <h3 className="text-[22px] font-medium mb-2">No classes yet</h3>
      <p className="text-text-accent text-[15px] mb-6 max-w-xs">
        Create your first class to group students and assign teachers in the
        timetable.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue text-white rounded-full text-[15px] font-medium hover:bg-blue/90 transition-colors"
      >
        <Plus size={16} />
        Add class
      </button>
    </div>
  );
}

// ─── Inner form (mounts fresh each open via key) ───────────────────────────────

interface ClassFormInnerProps {
  editing: ClassItem | null;
  slug: string;
  onClose: () => void;
  onSaved: (cls: ClassItem) => void;
  onUpdated: () => void;
}

function ClassFormInner({
  editing,
  slug,
  onClose,
  onSaved,
  onUpdated,
}: ClassFormInnerProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [code, setCode] = useState(editing?.code ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<"name" | "code" | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    startTransition(async () => {
      if (editing) {
        const result = await updateClass({
          slug,
          classId: editing.id,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
        });
        if (!result.ok) {
          setError(result.error);
          setFieldError((result.field as "name" | "code") ?? null);
          return;
        }
        onUpdated();
        onClose();
      } else {
        const result = await createClass({
          slug,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
        });
        if (!result.ok) {
          setError(result.error);
          setFieldError((result.field as "name" | "code") ?? null);
          return;
        }
        onSaved(result.class);
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-text-accent mb-1.5">
          Class name <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. SS2A, Grade 10 Blue, Year 11"
          maxLength={100}
          className={[
            "w-full px-4 py-2.5 rounded-xl border bg-input text-[15px] outline-none transition-colors",
            fieldError === "name"
              ? "border-red-400 focus:border-red-500"
              : "border-transparent focus:border-blue/50",
          ].join(" ")}
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-text-accent mb-1.5">
          Short code{" "}
          <span className="text-text-accent/60 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. SS2A"
          maxLength={20}
          className={[
            "w-full px-4 py-2.5 rounded-xl border bg-input text-[15px] outline-none transition-colors",
            fieldError === "code"
              ? "border-red-400 focus:border-red-500"
              : "border-transparent focus:border-blue/50",
          ].join(" ")}
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-text-accent mb-1.5">
          Description{" "}
          <span className="text-text-accent/60 font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes about this class"
          rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-transparent bg-input text-[15px] outline-none transition-colors focus:border-blue/50 resize-none"
        />
      </div>

      {error && <p className="text-red-500 text-[13px]">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-[15px] font-medium hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-blue text-white text-[15px] font-medium hover:bg-blue/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={15} className="animate-spin" />}
          {editing ? "Save changes" : "Add class"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

interface ClassFormModalProps {
  isOpen: boolean;
  editing: ClassItem | null;
  slug: string;
  onClose: () => void;
  onSaved: (cls: ClassItem) => void;
  onUpdated: () => void;
}

function ClassFormModal({
  isOpen,
  editing,
  slug,
  onClose,
  onSaved,
  onUpdated,
}: ClassFormModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-[24px] shadow-[0px_8px_40px_0_rgba(0,0,0,0.12)] p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[22px] font-medium">
                {editing ? "Edit class" : "Add class"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            {/* key forces remount (fresh state) on each open/editing change */}
            <ClassFormInner
              key={editing?.id ?? "new"}
              editing={editing}
              slug={slug}
              onClose={onClose}
              onSaved={onSaved}
              onUpdated={onUpdated}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ClassesClientProps {
  slug: string;
  initialClasses: ClassItem[];
  canManage: boolean;
}

export function ClassesClient({
  slug,
  initialClasses,
  canManage,
}: ClassesClientProps) {
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "ALL">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [qrClass, setQrClass] = useState<ClassItem | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const refreshClasses = () => {
    startTransition(async () => {
      const result = await listClasses(slug);
      if (result.ok) setClasses(result.classes);
    });
  };

  const filtered = classes.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus =
      statusFilter === "ALL" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleToggleStatus = async (cls: ClassItem) => {
    if (!canManage) return;
    setTogglingId(cls.id);
    const newStatus: ClassStatus =
      cls.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await setClassStatus(slug, cls.id, newStatus);
    if (result.ok) {
      setClasses((prev) =>
        prev.map((c) => (c.id === cls.id ? { ...c, status: newStatus } : c))
      );
    }
    setTogglingId(null);
  };

  const handleEdit = (cls: ClassItem) => {
    setEditing(cls);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const statusFilterLabel = {
    ALL: "All statuses",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
  }[statusFilter];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* QR Panel overlay */}
      <AnimatePresence>
        {qrClass && (
          <QRPanel
            key={qrClass.id}
            cls={qrClass}
            onClose={() => setQrClass(null)}
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[36px] font-medium tracking-tight">Classes</h1>
          <p className="text-text-accent text-[15px] mt-1">
            Manage cohorts and groups within your organisation.
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue text-white rounded-full text-[15px] font-medium hover:bg-blue/90 transition-colors shrink-0"
          >
            <Plus size={16} />
            Add class
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-accent pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-transparent text-[14px] outline-none focus:border-blue/40 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-accent hover:text-black transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div ref={filterRef} className="relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-input text-[14px] font-medium transition-colors hover:bg-accent"
          >
            {statusFilterLabel}
            <ChevronDown size={14} className="text-text-accent" />
          </button>
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 w-44 bg-background rounded-xl shadow-[0_4px_24px_0_rgba(0,0,0,0.1)] z-10 overflow-hidden"
              >
                {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setFilterOpen(false);
                    }}
                    className={[
                      "w-full text-left px-4 py-2.5 text-[14px] transition-colors hover:bg-accent",
                      statusFilter === s ? "font-medium text-blue" : "",
                    ].join(" ")}
                  >
                    {s === "ALL"
                      ? "All statuses"
                      : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      {classes.length === 0 ? (
        <EmptyState onAdd={handleAdd} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-accent text-[16px]">
            No classes match your search.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
            }}
            className="mt-3 text-blue text-[14px] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cls) => (
            <motion.div
              key={cls.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-5 py-4 bg-background border border-neutral-100 rounded-2xl hover:border-neutral-200 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <Users
                    size={18}
                    strokeWidth={1.5}
                    className="text-text-accent"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-medium truncate">
                      {cls.name}
                    </span>
                    {cls.code && (
                      <span className="text-[12px] text-text-accent bg-accent px-2 py-0.5 rounded-full shrink-0">
                        {cls.code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {statusBadge(cls.status)}
                    <span className="text-[13px] text-text-accent">
                      {cls.memberCount}{" "}
                      {cls.memberCount === 1 ? "member" : "members"}
                    </span>
                    {cls.description && (
                      <span className="text-[13px] text-text-accent truncate max-w-[200px]">
                        {cls.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {cls.publicCode && (
                    <button
                      onClick={() => setQrClass(cls)}
                      className="p-2 rounded-lg hover:bg-accent transition-colors text-text-accent hover:text-black"
                      aria-label="Show QR code"
                      title="Class QR code"
                    >
                      <QrCode size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(cls)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors text-text-accent hover:text-black"
                    aria-label="Edit class"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(cls)}
                    disabled={togglingId === cls.id}
                    className="p-2 rounded-lg hover:bg-accent transition-colors text-text-accent hover:text-black disabled:opacity-50"
                    aria-label={
                      cls.status === "ACTIVE"
                        ? "Deactivate class"
                        : "Activate class"
                    }
                    title={cls.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  >
                    {togglingId === cls.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : cls.status === "ACTIVE" ? (
                      <ToggleRight size={18} className="text-green-600" />
                    ) : (
                      <ToggleLeft size={18} />
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <ClassFormModal
        isOpen={modalOpen}
        editing={editing}
        slug={slug}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={(cls) => {
          setClasses((prev) => [cls, ...prev]);
        }}
        onUpdated={refreshClasses}
      />
    </div>
  );
}
