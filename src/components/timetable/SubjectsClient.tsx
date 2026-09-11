"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  X,
  Loader2,
  Pencil,
  Trash2,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  type SubjectItem,
} from "@/lib/timetable-actions";

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
        <BookOpen size={28} strokeWidth={1.4} className="text-text-accent" />
      </div>
      <h3 className="text-[22px] font-medium mb-2">No subjects yet</h3>
      <p className="text-text-accent text-[15px] mb-6 max-w-xs">
        Add subjects to use in timetable assignments.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue text-white rounded-full text-[15px] font-medium hover:bg-blue/90 transition-colors"
      >
        <Plus size={16} />
        Add subject
      </button>
    </div>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

interface DeleteModalProps {
  isOpen: boolean;
  subject: SubjectItem | null;
  slug: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteModalInner({
  subject,
  slug,
  onClose,
  onDeleted,
}: Omit<DeleteModalProps, "isOpen">) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!subject) return;
    startTransition(async () => {
      const result = await deleteSubject(slug, subject.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted(subject.id);
      onClose();
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-red-500" />
        </div>
        <h2 className="text-[20px] font-medium">Delete subject?</h2>
      </div>
      <p className="text-text-accent text-[15px] mb-5">
        <strong className="text-black font-medium">{subject?.name}</strong>{" "}
        will be permanently deleted. This cannot be undone.
      </p>
      {error && <p className="text-red-500 text-[13px] mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-[15px] font-medium hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-[15px] font-medium hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          Delete
        </button>
      </div>
    </>
  );
}

function DeleteModal({ isOpen, subject, slug, onClose, onDeleted }: DeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && subject && (
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
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-background rounded-[24px] shadow-[0px_8px_40px_0_rgba(0,0,0,0.12)] p-7"
          >
            <DeleteModalInner
              key={subject.id}
              subject={subject}
              slug={slug}
              onClose={onClose}
              onDeleted={onDeleted}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Subject form inner (mounts fresh via key) ────────────────────────────────

interface SubjectFormInnerProps {
  editing: SubjectItem | null;
  slug: string;
  onClose: () => void;
  onSaved: (subject: SubjectItem) => void;
  onUpdated: () => void;
}

function SubjectFormInner({
  editing,
  slug,
  onClose,
  onSaved,
  onUpdated,
}: SubjectFormInnerProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [code, setCode] = useState(editing?.code ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<"name" | "code" | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

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
        const result = await updateSubject({
          slug,
          subjectId: editing.id,
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
        const result = await createSubject({
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
        onSaved(result.subject);
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-text-accent mb-1.5">
          Subject name <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mathematics, Physics, English"
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
          placeholder="e.g. MATH, PHY, ENG"
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
          placeholder="Optional notes"
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
          {editing ? "Save changes" : "Add subject"}
        </button>
      </div>
    </form>
  );
}

// ─── Subject form modal wrapper ───────────────────────────────────────────────

interface SubjectFormModalProps {
  isOpen: boolean;
  editing: SubjectItem | null;
  slug: string;
  onClose: () => void;
  onSaved: (subject: SubjectItem) => void;
  onUpdated: () => void;
}

function SubjectFormModal({
  isOpen,
  editing,
  slug,
  onClose,
  onSaved,
  onUpdated,
}: SubjectFormModalProps) {
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
                {editing ? "Edit subject" : "Add subject"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <SubjectFormInner
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

interface SubjectsClientProps {
  slug: string;
  initialSubjects: SubjectItem[];
  canManage: boolean;
}

export function SubjectsClient({
  slug,
  initialSubjects,
  canManage,
}: SubjectsClientProps) {
  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectItem | null>(null);
  const [deleting, setDeleting] = useState<SubjectItem | null>(null);
  const [, startTransition] = useTransition();

  const refreshSubjects = () => {
    startTransition(async () => {
      const result = await listSubjects(slug);
      if (result.ok) setSubjects(result.subjects);
    });
  };

  const filtered = subjects.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[36px] font-medium tracking-tight">Subjects</h1>
          <p className="text-text-accent text-[15px] mt-1">
            Manage teaching subjects used in timetable assignments.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue text-white rounded-full text-[15px] font-medium hover:bg-blue/90 transition-colors shrink-0"
          >
            <Plus size={16} />
            Add subject
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-accent pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects…"
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
      </div>

      {/* Content */}
      {subjects.length === 0 ? (
        <EmptyState
          onAdd={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-accent text-[16px]">
            No subjects match your search.
          </p>
          <button
            onClick={() => setSearch("")}
            className="mt-3 text-blue text-[14px] hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((subject) => (
            <motion.div
              key={subject.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-5 py-4 bg-background border border-neutral-100 rounded-2xl hover:border-neutral-200 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <BookOpen
                    size={18}
                    strokeWidth={1.5}
                    className="text-text-accent"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-medium truncate">
                      {subject.name}
                    </span>
                    {subject.code && (
                      <span className="text-[12px] text-text-accent bg-accent px-2 py-0.5 rounded-full shrink-0">
                        {subject.code}
                      </span>
                    )}
                  </div>
                  {subject.description && (
                    <p className="text-[13px] text-text-accent mt-0.5 truncate max-w-xs">
                      {subject.description}
                    </p>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => {
                      setEditing(subject);
                      setModalOpen(true);
                    }}
                    className="p-2 rounded-lg hover:bg-accent transition-colors text-text-accent hover:text-black"
                    aria-label="Edit subject"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleting(subject)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors text-text-accent hover:text-red-500"
                    aria-label="Delete subject"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <SubjectFormModal
        isOpen={modalOpen}
        editing={editing}
        slug={slug}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={(subject) => setSubjects((prev) => [...prev, subject])}
        onUpdated={refreshSubjects}
      />

      <DeleteModal
        isOpen={!!deleting}
        subject={deleting}
        slug={slug}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          setSubjects((prev) => prev.filter((s) => s.id !== id));
          setDeleting(null);
        }}
      />
    </div>
  );
}
