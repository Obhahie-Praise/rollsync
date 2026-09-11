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
  DoorOpen,
  AlertTriangle,
} from "lucide-react";
import {
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  type RoomItem,
} from "@/lib/timetable-actions";

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
        <DoorOpen size={28} strokeWidth={1.4} className="text-text-accent" />
      </div>
      <h3 className="text-[22px] font-medium mb-2">No rooms yet</h3>
      <p className="text-text-accent text-[15px] mb-6 max-w-xs">
        Add rooms and venues used in timetable assignments.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue text-white rounded-full text-[15px] font-medium hover:bg-blue/90 transition-colors"
      >
        <Plus size={16} />
        Add room
      </button>
    </div>
  );
}

// ─── Delete confirmation inner ────────────────────────────────────────────────

interface DeleteInnerProps {
  room: RoomItem;
  slug: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteModalInner({ room, slug, onClose, onDeleted }: DeleteInnerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteRoom(slug, room.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted(room.id);
      onClose();
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-red-500" />
        </div>
        <h2 className="text-[20px] font-medium">Delete room?</h2>
      </div>
      <p className="text-text-accent text-[15px] mb-5">
        <strong className="text-black font-medium">{room.name}</strong>{" "}
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

interface DeleteModalProps {
  isOpen: boolean;
  room: RoomItem | null;
  slug: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteModal({ isOpen, room, slug, onClose, onDeleted }: DeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && room && (
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
              key={room.id}
              room={room}
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

// ─── Room form inner (mounts fresh via key) ───────────────────────────────────

interface RoomFormInnerProps {
  editing: RoomItem | null;
  slug: string;
  onClose: () => void;
  onSaved: (room: RoomItem) => void;
  onUpdated: () => void;
}

function RoomFormInner({
  editing,
  slug,
  onClose,
  onSaved,
  onUpdated,
}: RoomFormInnerProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [code, setCode] = useState(editing?.code ?? "");
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
        const result = await updateRoom({
          slug,
          roomId: editing.id,
          name: name.trim(),
          code: code.trim() || null,
        });
        if (!result.ok) {
          setError(result.error);
          setFieldError((result.field as "name" | "code") ?? null);
          return;
        }
        onUpdated();
        onClose();
      } else {
        const result = await createRoom({
          slug,
          name: name.trim(),
          code: code.trim() || null,
        });
        if (!result.ok) {
          setError(result.error);
          setFieldError((result.field as "name" | "code") ?? null);
          return;
        }
        onSaved(result.room);
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-text-accent mb-1.5">
          Room name <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Room 12, Science Lab, Computer Lab"
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
          placeholder="e.g. R12, SCI, COMP"
          maxLength={20}
          className={[
            "w-full px-4 py-2.5 rounded-xl border bg-input text-[15px] outline-none transition-colors",
            fieldError === "code"
              ? "border-red-400 focus:border-red-500"
              : "border-transparent focus:border-blue/50",
          ].join(" ")}
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
          {editing ? "Save changes" : "Add room"}
        </button>
      </div>
    </form>
  );
}

// ─── Room form modal wrapper ──────────────────────────────────────────────────

interface RoomFormModalProps {
  isOpen: boolean;
  editing: RoomItem | null;
  slug: string;
  onClose: () => void;
  onSaved: (room: RoomItem) => void;
  onUpdated: () => void;
}

function RoomFormModal({
  isOpen,
  editing,
  slug,
  onClose,
  onSaved,
  onUpdated,
}: RoomFormModalProps) {
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
                {editing ? "Edit room" : "Add room"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <RoomFormInner
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

interface RoomsClientProps {
  slug: string;
  initialRooms: RoomItem[];
  canManage: boolean;
}

export function RoomsClient({ slug, initialRooms, canManage }: RoomsClientProps) {
  const [rooms, setRooms] = useState<RoomItem[]>(initialRooms);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoomItem | null>(null);
  const [deleting, setDeleting] = useState<RoomItem | null>(null);
  const [, startTransition] = useTransition();

  const refreshRooms = () => {
    startTransition(async () => {
      const result = await listRooms(slug);
      if (result.ok) setRooms(result.rooms);
    });
  };

  const filtered = rooms.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.code?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[36px] font-medium tracking-tight">Rooms</h1>
          <p className="text-text-accent text-[15px] mt-1">
            Manage rooms and venues used in timetable entries.
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
            Add room
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
            placeholder="Search rooms…"
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
      {rooms.length === 0 ? (
        <EmptyState
          onAdd={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-accent text-[16px]">
            No rooms match your search.
          </p>
          <button
            onClick={() => setSearch("")}
            className="mt-3 text-blue text-[14px] hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((room) => (
            <motion.div
              key={room.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-4 py-3.5 bg-background border border-neutral-100 rounded-2xl hover:border-neutral-200 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <DoorOpen
                    size={16}
                    strokeWidth={1.5}
                    className="text-text-accent"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[15px] font-medium truncate block">
                    {room.name}
                  </span>
                  {room.code && (
                    <span className="text-[12px] text-text-accent">
                      {room.code}
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      setEditing(room);
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-text-accent hover:text-black"
                    aria-label="Edit room"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(room)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-text-accent hover:text-red-500"
                    aria-label="Delete room"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <RoomFormModal
        isOpen={modalOpen}
        editing={editing}
        slug={slug}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={(room) => setRooms((prev) => [...prev, room])}
        onUpdated={refreshRooms}
      />

      <DeleteModal
        isOpen={!!deleting}
        room={deleting}
        slug={slug}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          setRooms((prev) => prev.filter((r) => r.id !== id));
          setDeleting(null);
        }}
      />
    </div>
  );
}
