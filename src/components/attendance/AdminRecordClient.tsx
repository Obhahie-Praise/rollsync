"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Loader2,
  Download,
  ListFilter,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchAdminRecords,
  type AdminRecordItem,
} from "@/lib/attendance-actions";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

const STATUS_COLOURS: Record<string, string> = {
  PRESENT: "bg-green-accent text-green",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-amber-50 text-amber-700",
  EXCUSED: "bg-blue/10 text-blue",
};

const PERSON_TYPE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
  STAFF: "Staff",
  ADMINISTRATOR: "Admin",
  DIRECTOR: "Director",
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium text-text-accent">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-white/60 border border-black/8 rounded-xl px-3 py-2 pr-8 text-[13px] outline-none focus:ring-2 focus:ring-blue/30 transition-all disabled:opacity-60 cursor-pointer"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-accent pointer-events-none"
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ClassOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface AdminRecordClientProps {
  orgSlug: string;
  initialRecords: AdminRecordItem[];
  initialTotal: number;
  classOptions: ClassOption[];
  subjectOptions: SubjectOption[];
}

export function AdminRecordClient({
  orgSlug,
  initialRecords,
  initialTotal,
  classOptions,
  subjectOptions,
}: AdminRecordClientProps) {
  const [records, setRecords] = useState<AdminRecordItem[]>(initialRecords);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(todayKey);
  const [dateTo, setDateTo] = useState(todayKey);
  const [classFilter, setClassFilter] = useState("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const reload = (
    from: string,
    to: string,
    cls: string,
    subj: string,
    stat: string
  ) => {
    setError("");
    startTransition(async () => {
      const result = await fetchAdminRecords({
        slug: orgSlug,
        dateFrom: from || null,
        dateTo: to || null,
        classId: cls,
        subjectId: subj,
        status: stat,
      });
      if (result.ok) {
        setRecords(result.records);
        setTotal(result.total);
      } else {
        setError(result.error);
      }
    });
  };

  const classOpts = [
    { value: "ALL", label: "All classes" },
    ...classOptions.map((c) => ({ value: c.id, label: c.name })),
  ];
  const subjectOpts = [
    { value: "ALL", label: "All subjects" },
    ...subjectOptions.map((s) => ({ value: s.id, label: s.name })),
  ];
  const statusOpts = [
    { value: "ALL", label: "All statuses" },
    { value: "PRESENT", label: "Present" },
    { value: "ABSENT", label: "Absent" },
    { value: "LATE", label: "Late" },
    { value: "EXCUSED", label: "Excused" },
  ];

  const handleExport = () => {
    const rows: string[][] = [
      [
        "Date",
        "Class",
        "Subject",
        "Teacher",
        "Student",
        "Student ID",
        "Type",
        "Status",
        "Recorded At",
      ],
      ...records.map((r) => [
        formatDate(r.sessionDate),
        r.className,
        r.subjectName,
        r.teacherName,
        r.personName,
        r.orgIdentifier ?? "",
        PERSON_TYPE_LABELS[r.personType] ?? r.personType,
        STATUS_LABELS[r.status] ?? r.status,
        formatDate(r.recordedAt),
      ]),
    ];
    downloadCsv(rows, `attendance-records-${orgSlug}.csv`);
  };

  return (
    <div className="px-8 sm:px-14 pb-24">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[40px] font-semibold tracking-tight">
          Attendance Records
        </h1>
        <p className="text-[18px] text-text-accent mt-1">
          Organization-wide attendance records
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-white/40 border border-black/8 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-text-accent">
          <ListFilter size={13} />
          Filters
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-text-accent">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                reload(
                  e.target.value,
                  dateTo,
                  classFilter,
                  subjectFilter,
                  statusFilter
                );
              }}
              disabled={isPending}
              className="bg-white/60 border border-black/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue/30 disabled:opacity-60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-text-accent">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                reload(
                  dateFrom,
                  e.target.value,
                  classFilter,
                  subjectFilter,
                  statusFilter
                );
              }}
              disabled={isPending}
              className="bg-white/60 border border-black/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue/30 disabled:opacity-60"
            />
          </div>
          <FilterSelect
            label="Class"
            value={classFilter}
            options={classOpts}
            onChange={(v) => {
              setClassFilter(v);
              reload(dateFrom, dateTo, v, subjectFilter, statusFilter);
            }}
            disabled={isPending}
          />
          <FilterSelect
            label="Subject"
            value={subjectFilter}
            options={subjectOpts}
            onChange={(v) => {
              setSubjectFilter(v);
              reload(dateFrom, dateTo, classFilter, v, statusFilter);
            }}
            disabled={isPending}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            options={statusOpts}
            onChange={(v) => {
              setStatusFilter(v);
              reload(dateFrom, dateTo, classFilter, subjectFilter, v);
            }}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700"
          >
            <AlertCircle size={13} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[20px] font-semibold tracking-tight">Records</h2>
          <span className="text-[12px] font-medium text-text-accent bg-accent px-2 py-0.5 rounded-full">
            {total > 250 ? `${records.length} of ${total}` : total}
          </span>
          {isPending && (
            <Loader2 size={14} className="animate-spin text-text-accent" />
          )}
        </div>
        {records.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent hover:bg-accent/70 transition-colors"
          >
            <Download size={12} />
            Export CSV
          </button>
        )}
      </div>

      {total > 250 && (
        <p className="text-[12px] text-text-accent mb-3">
          Showing 250 of {total} records. Use filters to narrow results.
        </p>
      )}

      {records.length === 0 ? (
        <div className="py-14 text-center bg-white/40 border border-black/8 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-accent mx-auto mb-3 flex items-center justify-center">
            <ListFilter size={20} className="text-text-accent" />
          </div>
          <p className="text-[15px] font-medium">No records found</p>
          <p className="text-[13px] text-text-accent mt-1">
            Try adjusting the date range or filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/8">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-black/8 bg-accent/40">
                <th className="text-left px-4 py-3 font-medium text-text-accent">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-accent">
                  Class / Subject
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-accent">
                  Teacher
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-accent">
                  Student
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-accent">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={`${r.sessionId}-${r.personName}-${i}`}
                  className={[
                    "border-b border-black/5 last:border-0 transition-colors hover:bg-accent/20",
                    i % 2 === 0 ? "bg-white/30" : "bg-transparent",
                  ].join(" ")}
                >
                  <td className="px-4 py-3 text-text-accent whitespace-nowrap">
                    {formatDate(r.sessionDate)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.subjectName}</p>
                    <p className="text-text-accent text-[11px]">
                      {r.className}
                      {r.classCode && (
                        <span className="ml-1 font-mono bg-accent px-1 py-0.5 rounded">
                          {r.classCode}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-text-accent">
                    {r.teacherName}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.personName}</p>
                    {r.orgIdentifier && (
                      <p className="text-[11px] font-mono text-text-accent">
                        {r.orgIdentifier}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                        STATUS_COLOURS[r.status] ?? "bg-accent text-text-accent",
                      ].join(" ")}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
