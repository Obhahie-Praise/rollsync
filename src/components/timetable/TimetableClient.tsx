"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  UserRound,
  Users,
  Pencil,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Clock,
  MapPin,
  BookOpen,
} from "lucide-react";
import {
  listTimetableEntries,
  createTimetableEntry,
  updateTimetableEntry,
  setTimetableEntryStatus,
  type TimetableEntryItem,
  type TimetableStatus,
} from "@/lib/timetable-actions";
import type { ClassItem, SubjectItem, RoomItem } from "@/lib/timetable-actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_OPTIONS = [1, 2, 3, 4, 5].map((d) => ({
  value: d,
  label: DAY_NAMES[d],
}));

type ViewMode = "weekly" | "daily" | "teacher" | "class";

interface TeacherOption {
  id: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDays(daysOfWeek: string): number[] {
  return daysOfWeek
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d));
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour < 12 ? "am" : "pm";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m}${ampm}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + 1); // shift to Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isEntryActiveOn(entry: TimetableEntryItem, date: Date): boolean {
  const from = new Date(entry.effectiveFrom);
  from.setHours(0, 0, 0, 0);
  if (date < from) return false;
  if (entry.effectiveTo) {
    const to = new Date(entry.effectiveTo);
    to.setHours(23, 59, 59, 999);
    if (date > to) return false;
  }
  return true;
}

function entriesForDay(
  entries: TimetableEntryItem[],
  dayOfWeek: number,
  date: Date
): TimetableEntryItem[] {
  return entries
    .filter(
      (e) =>
        parseDays(e.daysOfWeek).includes(dayOfWeek) &&
        isEntryActiveOn(e, date)
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ─── Timetable cell ───────────────────────────────────────────────────────────

const CELL_COLORS = [
  "bg-blue/10 border-blue/20 text-blue",
  "bg-green-50 border-green-200 text-green-700",
  "bg-purple-50 border-purple-200 text-purple-700",
  "bg-orange-50 border-orange-200 text-orange-700",
  "bg-pink-50 border-pink-200 text-pink-700",
  "bg-teal-50 border-teal-200 text-teal-700",
];

function TimetableCell({
  entry,
  compact = false,
  onEdit,
  canManage,
}: {
  entry: TimetableEntryItem;
  compact?: boolean;
  onEdit?: () => void;
  canManage: boolean;
}) {
  const colorIdx =
    entry.subjectId
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0) % CELL_COLORS.length;
  const color = CELL_COLORS[colorIdx];

  return (
    <div
      className={[
        "rounded-xl border px-3 py-2 text-[12px] group relative",
        color,
        compact ? "min-h-[52px]" : "min-h-[72px]",
      ].join(" ")}
    >
      <div className="font-semibold truncate text-[13px]">
        {entry.subjectName}
      </div>
      <div className="flex items-center gap-1 mt-0.5 opacity-80 truncate">
        <Clock size={10} />
        {formatTime(entry.startTime)}–{formatTime(entry.endTime)}
      </div>
      {!compact && (
        <>
          <div className="flex items-center gap-1 mt-0.5 opacity-80 truncate">
            <Users size={10} />
            {entry.classCode ?? entry.className}
          </div>
          <div className="flex items-center gap-1 mt-0.5 opacity-80 truncate">
            <UserRound size={10} />
            {entry.teacherName}
          </div>
          {entry.roomName && (
            <div className="flex items-center gap-1 mt-0.5 opacity-80 truncate">
              <MapPin size={10} />
              {entry.roomName}
            </div>
          )}
        </>
      )}
      {canManage && onEdit && (
        <button
          onClick={onEdit}
          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/70 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Edit entry"
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
}

// ─── Entry form inner (key-based remount for clean state) ─────────────────────

interface EntryFormInnerProps {
  editing: TimetableEntryItem | null;
  slug: string;
  teachers: TeacherOption[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  rooms: RoomItem[];
  onClose: () => void;
  onSaved: (entry: TimetableEntryItem) => void;
  onUpdated: () => void;
}

function EntryFormInner({
  editing,
  slug,
  teachers,
  classes,
  subjects,
  rooms,
  onClose,
  onSaved,
  onUpdated,
}: EntryFormInnerProps) {
  const [teacherPersonId, setTeacherPersonId] = useState(
    editing?.teacherPersonId ?? ""
  );
  const [classId, setClassId] = useState(editing?.classId ?? "");
  const [subjectId, setSubjectId] = useState(editing?.subjectId ?? "");
  const [roomId, setRoomId] = useState(editing?.roomId ?? "");
  const [startTime, setStartTime] = useState(editing?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(editing?.endTime ?? "08:40");
  const [selectedDays, setSelectedDays] = useState<number[]>(
    editing ? parseDays(editing.daysOfWeek) : [1, 2, 3, 4, 5]
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    editing
      ? new Date(editing.effectiveFrom).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [effectiveTo, setEffectiveTo] = useState(
    editing?.effectiveTo
      ? new Date(editing.effectiveTo).toISOString().split("T")[0]
      : ""
  );
  const [periodLabel, setPeriodLabel] = useState(editing?.periodLabel ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (!selectedDays.length) {
      setError("Select at least one day.");
      return;
    }

    const payload = {
      slug,
      teacherPersonId,
      classId,
      subjectId,
      roomId: roomId || null,
      startTime,
      endTime,
      daysOfWeek: [...selectedDays].sort().join(","),
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      periodLabel: periodLabel.trim() || null,
    };

    startTransition(async () => {
      if (editing) {
        const result = await updateTimetableEntry({
          ...payload,
          entryId: editing.id,
        });
        if (!result.ok) {
          setError(result.error);
          setFieldError(result.field ?? null);
          return;
        }
        onUpdated();
        onClose();
      } else {
        const result = await createTimetableEntry(payload);
        if (!result.ok) {
          setError(result.error);
          setFieldError(result.field ?? null);
          return;
        }
        onSaved(result.entry);
        onClose();
      }
    });
  };

  const fieldCls = (field: string) =>
    [
      "w-full px-[24px] py-[12px] rounded-full border bg-input text-[20px] outline-none transition-colors",
      fieldError === field
        ? "border-red-400"
        : "border-transparent focus:border-blue/50",
    ].join(" ");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Teacher */}
      <div>
        <label className="block text-[16px] font-medium text-text-accent mb-1.5">
          Teacher <span className="text-red-500">*</span>
        </label>
        <select
          value={teacherPersonId}
          onChange={(e) => setTeacherPersonId(e.target.value)}
          required
          className={fieldCls("teacherPersonId")}
        >
          <option value="">Select teacher…</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {teachers.length === 0 && (
          <p className="text-[12px] text-text-accent mt-1">
            No teachers found. Add people with type Teacher first.
          </p>
        )}
      </div>

      {/* Class */}
      <div>
        <label className="block text-[16px] font-medium text-text-accent mb-1.5">
          Class <span className="text-red-500">*</span>
        </label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          required
          className={fieldCls("classId")}
        >
          <option value="">Select class…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.code ? ` (${c.code})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-[16px] font-medium text-text-accent mb-1.5">
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
          className={fieldCls("subjectId")}
        >
          <option value="">Select subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Room */}
      <div>
        <label className="block text-[16px] font-medium text-text-accent mb-1.5">
          Room{" "}
          <span className="text-text-accent/60 font-normal">(optional)</span>
        </label>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className={fieldCls("roomId")}
        >
          <option value="">No room</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[16px] font-medium text-text-accent mb-1.5">
            Start time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className={fieldCls("startTime")}
          />
        </div>
        <div>
          <label className="block text-[16px] font-medium text-text-accent mb-1.5">
            End time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className={fieldCls("endTime")}
          />
        </div>
      </div>

      {/* Days of week */}
      <div>
        <label className="block text-[16px] font-medium text-text-accent mb-2">
          Days of week <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {DAY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              className={[
                "w-10 h-10 rounded-xl text-[13px] font-medium transition-colors",
                selectedDays.includes(value)
                  ? "bg-blue text-white"
                  : "bg-input hover:bg-accent",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Effective dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[16px] font-medium text-text-accent mb-1.5">
            Effective from <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            required
            className={fieldCls("effectiveFrom")}
          />
        </div>
        <div>
          <label className="block text-[16px] font-medium text-text-accent mb-1.5">
            Effective to{" "}
            <span className="text-text-accent/60 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
            className={fieldCls("effectiveTo")}
          />
        </div>
      </div>

      {/* Period label */}
      <div>
        <label className="block text-[16px] font-medium text-text-accent mb-1.5">
          Period label{" "}
          <span className="text-text-accent/60 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={periodLabel}
          onChange={(e) => setPeriodLabel(e.target.value)}
          placeholder="e.g. Period 1"
          maxLength={50}
          className={fieldCls("periodLabel")}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-500 text-[13px]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

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
          disabled={
            isPending ||
            !teacherPersonId ||
            !classId ||
            !subjectId ||
            !startTime ||
            !endTime ||
            !selectedDays.length
          }
          className="flex-1 px-4 py-2.5 rounded-xl bg-blue text-white text-[15px] font-medium hover:bg-blue/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={15} className="animate-spin" />}
          {editing ? "Save changes" : "Add entry"}
        </button>
      </div>
    </form>
  );
}

// ─── Entry form modal wrapper ─────────────────────────────────────────────────

interface EntryFormModalProps {
  isOpen: boolean;
  editing: TimetableEntryItem | null;
  slug: string;
  teachers: TeacherOption[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  rooms: RoomItem[];
  onClose: () => void;
  onSaved: (entry: TimetableEntryItem) => void;
  onUpdated: () => void;
}

function EntryFormModal({
  isOpen,
  editing,
  slug,
  teachers,
  classes,
  subjects,
  rooms,
  onClose,
  onSaved,
  onUpdated,
}: EntryFormModalProps) {
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
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background rounded-[24px] shadow-[0px_8px_40px_0_rgba(0,0,0,0.12)] p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-medium">
                {editing ? "Edit entry" : "Add timetable entry"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            {/* key forces remount with fresh state on each open/editing change */}
            <EntryFormInner
              key={editing?.id ?? "new"}
              editing={editing}
              slug={slug}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              rooms={rooms}
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

// ─── Weekly view ──────────────────────────────────────────────────────────────

function WeeklyView({
  entries,
  weekStart,
  onEdit,
  canManage,
}: {
  entries: TimetableEntryItem[];
  weekStart: Date;
  onEdit: (e: TimetableEntryItem) => void;
  canManage: boolean;
}) {
  const days = [1, 2, 3, 4, 5];

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-5 gap-3 min-w-[640px]">
        {days.map((dayNum) => {
          const date = addDays(weekStart, dayNum - 1);
          const isToday = isSameDay(date, new Date());
          const dayEntries = entriesForDay(entries, dayNum, date);

          return (
            <div key={dayNum}>
              <div
                className={[
                  "text-center text-[13px] font-medium mb-2 py-1 rounded-lg",
                  isToday ? "bg-blue text-white" : "text-text-accent",
                ].join(" ")}
              >
                <div>{DAY_NAMES[dayNum]}</div>
                <div
                  className={
                    isToday ? "text-white/80" : "text-text-accent/60"
                  }
                >
                  {date.getDate()}/{date.getMonth() + 1}
                </div>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {dayEntries.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-8">
                    <span className="text-[12px] text-text-accent/40">—</span>
                  </div>
                ) : (
                  dayEntries.map((e) => (
                    <TimetableCell
                      key={e.id}
                      entry={e}
                      compact
                      onEdit={() => onEdit(e)}
                      canManage={canManage}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Daily view ───────────────────────────────────────────────────────────────

function DailyView({
  entries,
  date,
  onEdit,
  canManage,
}: {
  entries: TimetableEntryItem[];
  date: Date;
  onEdit: (e: TimetableEntryItem) => void;
  canManage: boolean;
}) {
  const dayOfWeek = date.getDay();
  const dayEntries = entriesForDay(entries, dayOfWeek, date);

  return (
    <div className="max-w-lg">
      {dayEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar
            size={32}
            strokeWidth={1.4}
            className="text-text-accent mb-3"
          />
          <p className="text-text-accent text-[15px]">
            No classes scheduled for {DAY_NAMES_FULL[dayOfWeek]}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEntries.map((e) => (
            <TimetableCell
              key={e.id}
              entry={e}
              onEdit={() => onEdit(e)}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Teacher view ─────────────────────────────────────────────────────────────

function TeacherView({
  entries,
  teachers,
  selectedTeacherId,
  onSelectTeacher,
  weekStart,
  onEdit,
  canManage,
}: {
  entries: TimetableEntryItem[];
  teachers: TeacherOption[];
  selectedTeacherId: string;
  onSelectTeacher: (id: string) => void;
  weekStart: Date;
  onEdit: (e: TimetableEntryItem) => void;
  canManage: boolean;
}) {
  const teacherEntries = entries.filter(
    (e) => e.teacherPersonId === selectedTeacherId
  );
  const days = [1, 2, 3, 4, 5];

  return (
    <div>
      <div className="mb-6">
        <label className="block text-[13px] font-medium text-text-accent mb-2">
          Select teacher
        </label>
        <select
          value={selectedTeacherId}
          onChange={(e) => onSelectTeacher(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-input border border-transparent text-[14px] outline-none focus:border-blue/50 transition-colors"
        >
          <option value="">Choose a teacher…</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedTeacherId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserRound
            size={32}
            strokeWidth={1.4}
            className="text-text-accent mb-3"
          />
          <p className="text-text-accent text-[15px]">
            Select a teacher to view their schedule.
          </p>
        </div>
      ) : teacherEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-accent text-[15px]">
            No active timetable entries for this teacher.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-5 gap-3 min-w-[640px]">
            {days.map((dayNum) => {
              const date = addDays(weekStart, dayNum - 1);
              const isToday = isSameDay(date, new Date());
              const dayEntries = entriesForDay(teacherEntries, dayNum, date);
              return (
                <div key={dayNum}>
                  <div
                    className={[
                      "text-center text-[13px] font-medium mb-2 py-1 rounded-lg",
                      isToday ? "bg-blue text-white" : "text-text-accent",
                    ].join(" ")}
                  >
                    <div>{DAY_NAMES[dayNum]}</div>
                    <div
                      className={
                        isToday ? "text-white/80" : "text-text-accent/60"
                      }
                    >
                      {date.getDate()}/{date.getMonth() + 1}
                    </div>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {dayEntries.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-6">
                        <span className="text-[12px] text-text-accent/40">—</span>
                      </div>
                    ) : (
                      dayEntries.map((e) => (
                        <TimetableCell
                          key={e.id}
                          entry={e}
                          compact
                          onEdit={() => onEdit(e)}
                          canManage={canManage}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Class view ───────────────────────────────────────────────────────────────

function ClassView({
  entries,
  classes,
  selectedClassId,
  onSelectClass,
  weekStart,
  onEdit,
  canManage,
}: {
  entries: TimetableEntryItem[];
  classes: ClassItem[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  weekStart: Date;
  onEdit: (e: TimetableEntryItem) => void;
  canManage: boolean;
}) {
  const classEntries = entries.filter((e) => e.classId === selectedClassId);
  const days = [1, 2, 3, 4, 5];

  return (
    <div>
      <div className="mb-6">
        <label className="block text-[13px] font-medium text-text-accent mb-2">
          Select class
        </label>
        <select
          value={selectedClassId}
          onChange={(e) => onSelectClass(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-input border border-transparent text-[14px] outline-none focus:border-blue/50 transition-colors"
        >
          <option value="">Choose a class…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.code ? ` (${c.code})` : ""}
            </option>
          ))}
        </select>
      </div>

      {!selectedClassId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users
            size={32}
            strokeWidth={1.4}
            className="text-text-accent mb-3"
          />
          <p className="text-text-accent text-[15px]">
            Select a class to view its timetable.
          </p>
        </div>
      ) : classEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-accent text-[15px]">
            No active timetable entries for this class.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-5 gap-3 min-w-[640px]">
            {days.map((dayNum) => {
              const date = addDays(weekStart, dayNum - 1);
              const isToday = isSameDay(date, new Date());
              const dayEntries = entriesForDay(classEntries, dayNum, date);
              return (
                <div key={dayNum}>
                  <div
                    className={[
                      "text-center text-[13px] font-medium mb-2 py-1 rounded-lg",
                      isToday ? "bg-blue text-white" : "text-text-accent",
                    ].join(" ")}
                  >
                    <div>{DAY_NAMES[dayNum]}</div>
                    <div
                      className={
                        isToday ? "text-white/80" : "text-text-accent/60"
                      }
                    >
                      {date.getDate()}/{date.getMonth() + 1}
                    </div>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {dayEntries.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-6">
                        <span className="text-[12px] text-text-accent/40">—</span>
                      </div>
                    ) : (
                      dayEntries.map((e) => (
                        <TimetableCell
                          key={e.id}
                          entry={e}
                          compact
                          onEdit={() => onEdit(e)}
                          canManage={canManage}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Entry list row ───────────────────────────────────────────────────────────

function EntryListRow({
  entry,
  onEdit,
  onToggle,
  isToggling,
  canManage,
}: {
  entry: TimetableEntryItem;
  onEdit: () => void;
  onToggle: () => void;
  isToggling: boolean;
  canManage: boolean;
}) {
  const days = parseDays(entry.daysOfWeek)
    .map((d) => DAY_NAMES[d])
    .join(", ");

  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-background border border-neutral-100 rounded-2xl hover:border-neutral-200 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-medium">{entry.subjectName}</span>
            <span className="text-[12px] text-text-accent bg-accent px-2 py-0.5 rounded-full">
              {entry.classCode ?? entry.className}
            </span>
            {entry.status === "INACTIVE" && (
              <span className="text-[12px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                Inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[12px] text-text-accent flex-wrap">
            <span className="flex items-center gap-1">
              <UserRound size={11} />
              {entry.teacherName}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatTime(entry.startTime)}–{formatTime(entry.endTime)}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {days}
            </span>
            {entry.roomName && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {entry.roomName}
              </span>
            )}
            {entry.periodLabel && (
              <span className="flex items-center gap-1">
                <BookOpen size={11} />
                {entry.periodLabel}
              </span>
            )}
          </div>
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-text-accent hover:text-black"
            aria-label="Edit entry"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onToggle}
            disabled={isToggling}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-text-accent hover:text-black disabled:opacity-50"
            aria-label={
              entry.status === "ACTIVE" ? "Deactivate entry" : "Activate entry"
            }
            title={entry.status === "ACTIVE" ? "Deactivate" : "Activate"}
          >
            {isToggling ? (
              <Loader2 size={15} className="animate-spin" />
            ) : entry.status === "ACTIVE" ? (
              <ToggleRight size={17} className="text-green-600" />
            ) : (
              <ToggleLeft size={17} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TimetableClientProps {
  slug: string;
  initialEntries: TimetableEntryItem[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  rooms: RoomItem[];
  teachers: TeacherOption[];
  canManage: boolean;
}

export function TimetableClient({
  slug,
  initialEntries,
  classes,
  subjects,
  rooms,
  teachers,
  canManage,
}: TimetableClientProps) {
  const [entries, setEntries] = useState<TimetableEntryItem[]>(initialEntries);
  const [view, setView] = useState<ViewMode>("weekly");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [dailyDate, setDailyDate] = useState(() => new Date());
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableEntryItem | null>(null);
  const [, startTransition] = useTransition();

  // Reload when showAll changes
  useEffect(() => {
    startTransition(async () => {
      const result = await listTimetableEntries({
        slug,
        status: showAll ? undefined : "ACTIVE",
      });
      if (result.ok) setEntries(result.entries);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  const refreshEntries = () => {
    startTransition(async () => {
      const result = await listTimetableEntries({
        slug,
        status: showAll ? undefined : "ACTIVE",
      });
      if (result.ok) setEntries(result.entries);
    });
  };

  const activeEntries = entries.filter((e) => e.status === "ACTIVE");

  const handleToggleStatus = async (entry: TimetableEntryItem) => {
    if (!canManage) return;
    setTogglingId(entry.id);
    const newStatus: TimetableStatus =
      entry.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await setTimetableEntryStatus(slug, entry.id, newStatus);
    if (result.ok) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: newStatus } : e))
      );
    }
    setTogglingId(null);
  };

  const viewTabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: "weekly", label: "Weekly", icon: <CalendarDays size={15} /> },
    { key: "daily", label: "Daily", icon: <Calendar size={15} /> },
    { key: "teacher", label: "Teacher", icon: <UserRound size={15} /> },
    { key: "class", label: "Class", icon: <Users size={15} /> },
  ];

  const goBack = () => {
    if (view === "weekly") setWeekStart((w) => addDays(w, -7));
    else setDailyDate((d) => addDays(d, -1));
  };

  const goForward = () => {
    if (view === "weekly") setWeekStart((w) => addDays(w, 7));
    else setDailyDate((d) => addDays(d, 1));
  };

  const goToday = () => {
    setWeekStart(getWeekStart(new Date()));
    setDailyDate(new Date());
  };

  const weekEnd = addDays(weekStart, 4);
  const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1} – ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
  const dailyLabel = `${DAY_NAMES_FULL[dailyDate.getDay()]}, ${dailyDate.getDate()}/${dailyDate.getMonth() + 1}/${dailyDate.getFullYear()}`;
  const showNav = view === "weekly" || view === "daily";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[36px] font-medium tracking-tight">Schedule</h1>
          <p className="text-text-accent text-[15px] mt-1">
            View and manage the recurring timetable for your organisation.
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
            Add entry
          </button>
        )}
      </div>

      {/* View tabs + navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center bg-input rounded-xl p-1 gap-1">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={[
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[14px] font-medium transition-colors",
                view === tab.key
                  ? "bg-background text-black shadow-sm"
                  : "text-text-accent hover:text-black",
              ].join(" ")}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {showNav && (
          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              className="p-2 rounded-xl hover:bg-accent transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-[14px] font-medium text-text-accent min-w-[130px] text-center">
              {view === "weekly" ? weekLabel : dailyLabel}
            </span>
            <button
              onClick={goForward}
              className="p-2 rounded-xl hover:bg-accent transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-xl bg-input text-[13px] font-medium hover:bg-accent transition-colors"
            >
              Today
            </button>
          </div>
        )}
      </div>

      {/* View content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {view === "weekly" && (
            <WeeklyView
              entries={activeEntries}
              weekStart={weekStart}
              onEdit={(e) => {
                setEditing(e);
                setModalOpen(true);
              }}
              canManage={canManage}
            />
          )}
          {view === "daily" && (
            <DailyView
              entries={activeEntries}
              date={dailyDate}
              onEdit={(e) => {
                setEditing(e);
                setModalOpen(true);
              }}
              canManage={canManage}
            />
          )}
          {view === "teacher" && (
            <TeacherView
              entries={activeEntries}
              teachers={teachers}
              selectedTeacherId={selectedTeacherId}
              onSelectTeacher={setSelectedTeacherId}
              weekStart={weekStart}
              onEdit={(e) => {
                setEditing(e);
                setModalOpen(true);
              }}
              canManage={canManage}
            />
          )}
          {view === "class" && (
            <ClassView
              entries={activeEntries}
              classes={classes}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              weekStart={weekStart}
              onEdit={(e) => {
                setEditing(e);
                setModalOpen(true);
              }}
              canManage={canManage}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* All entries list */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-medium">All entries</h2>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-[13px] text-blue hover:underline"
          >
            {showAll ? "Show active only" : "Show inactive too"}
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-neutral-100 rounded-2xl">
            <CalendarDays
              size={32}
              strokeWidth={1.4}
              className="text-text-accent mb-3"
            />
            <p className="text-text-accent text-[15px] mb-2">
              No timetable entries yet.
            </p>
            {canManage && (
              <button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-full text-[14px] font-medium hover:bg-blue/90 transition-colors"
              >
                <Plus size={14} />
                Add first entry
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <EntryListRow
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  setEditing(entry);
                  setModalOpen(true);
                }}
                onToggle={() => handleToggleStatus(entry)}
                isToggling={togglingId === entry.id}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </div>

      <EntryFormModal
        isOpen={modalOpen}
        editing={editing}
        slug={slug}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        rooms={rooms}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={(entry) => setEntries((prev) => [entry, ...prev])}
        onUpdated={refreshEntries}
      />
    </div>
  );
}
