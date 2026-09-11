"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Users,
  BookOpen,
  Building2,
  CalendarDays,
  AlertCircle,
  ChevronDown,
  Loader2,
  Download,
  LayoutGrid,
  ListFilter,
} from "lucide-react";
import {
  fetchClassReport,
  fetchPeopleReport,
  fetchScheduleReport,
  type OrgSummary,
  type ClassReportRow,
  type PersonReportRow,
  type ScheduleReportRow,
  type ExceptionSummaryRow,
} from "@/lib/reports-actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERSON_TYPE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
  STAFF: "Staff",
  ADMINISTRATOR: "Administrator",
  DIRECTOR: "Director",
};

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  SUBSTITUTED: "Substituted",
  ROOM_CHANGE: "Room change",
  OTHER: "Other",
};

const DAY_NAMES: Record<string, string> = {
  "0": "Sun",
  "1": "Mon",
  "2": "Tue",
  "3": "Wed",
  "4": "Thu",
  "5": "Fri",
  "6": "Sat",
};

type DatePreset = "today" | "week" | "month" | "all";

interface DateRange {
  preset: DatePreset;
  from: Date | null;
  to: Date | null;
}

function getDateRange(preset: DatePreset): DateRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );

  switch (preset) {
    case "today":
      return { preset, from: todayStart, to: todayEnd };
    case "week": {
      const weekStart = new Date(todayStart);
      weekStart.setDate(todayStart.getDate() - todayStart.getDay());
      return { preset, from: weekStart, to: todayEnd };
    }
    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { preset, from: monthStart, to: todayEnd };
    }
    case "all":
    default:
      return { preset: "all", from: null, to: null };
  }
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
}

function formatDays(daysOfWeek: string): string {
  return daysOfWeek
    .split(",")
    .map((d) => DAY_NAMES[d.trim()] ?? d)
    .join(", ");
}

// ─── CSV export helper ────────────────────────────────────────────────────────

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
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
}

function MetricCard({ label, value, icon, sub }: MetricCardProps) {
  return (
    <div className="bg-white/60 border border-black/8 rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-text-accent">{label}</p>
        <span className="text-text-accent/60">{icon}</span>
      </div>
      <p className="text-[32px] font-semibold tracking-tight leading-none">
        {value}
      </p>
      {sub && <p className="text-[12px] text-text-accent">{sub}</p>}
    </div>
  );
}

interface SectionHeadingProps {
  title: string;
  count?: number;
  action?: React.ReactNode;
}

function SectionHeading({ title, count, action }: SectionHeadingProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
        {count !== undefined && (
          <span className="text-[12px] font-medium text-text-accent bg-accent px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-accent mx-auto mb-3 flex items-center justify-center text-text-accent">
        {icon}
      </div>
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      <p className="text-[13px] text-text-accent mt-1 max-w-xs mx-auto">
        {description}
      </p>
    </div>
  );
}

// ─── Date preset selector ─────────────────────────────────────────────────────

interface DatePresetSelectorProps {
  current: DatePreset;
  onChange: (preset: DatePreset) => void;
  disabled: boolean;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function DatePresetSelector({
  current,
  onChange,
  disabled,
}: DatePresetSelectorProps) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Date range"
    >
      {DATE_PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p.value)}
          className={[
            "px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors",
            current === p.value
              ? "bg-blue text-white"
              : "bg-accent hover:bg-accent/70 text-foreground",
            disabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Filter select ────────────────────────────────────────────────────────────

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
      <label className="text-[12px] font-medium text-text-accent">{label}</label>
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
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-accent pointer-events-none"
        />
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type ReportTab = "overview" | "classes" | "people" | "schedule";

interface TabBarProps {
  current: ReportTab;
  onChange: (tab: ReportTab) => void;
}

const TABS: { value: ReportTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "classes", label: "Classes" },
  { value: "people", label: "People" },
  { value: "schedule", label: "Schedule" },
];

function TabBar({ current, onChange }: TabBarProps) {
  return (
    <div
      className="flex gap-0.5 bg-accent/60 rounded-xl p-1 w-fit"
      role="tablist"
    >
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={current === tab.value}
          onClick={() => onChange(tab.value)}
          className={[
            "px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
            current === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-text-accent hover:text-foreground",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ClassOption {
  id: string;
  name: string;
}

interface ReportsClientProps {
  orgSlug: string;
  summary: OrgSummary;
  initialClasses: ClassReportRow[];
  initialPeople: PersonReportRow[];
  initialPeopleTotal: number;
  initialSchedule: ScheduleReportRow[];
  initialExceptions: ExceptionSummaryRow[];
  classOptions: ClassOption[];
}

export function ReportsClient({
  orgSlug,
  summary,
  initialClasses,
  initialPeople,
  initialPeopleTotal,
  initialSchedule,
  initialExceptions,
  classOptions,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRange("all")
  );

  // Filter state
  const [personTypeFilter, setPersonTypeFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [personStatusFilter, setPersonStatusFilter] = useState("ACTIVE");

  // Data state
  const [classes, setClasses] = useState<ClassReportRow[]>(initialClasses);
  const [people, setPeople] = useState<PersonReportRow[]>(initialPeople);
  const [peopleTotal, setPeopleTotal] = useState(initialPeopleTotal);
  const [schedule, setSchedule] = useState<ScheduleReportRow[]>(initialSchedule);
  const [exceptions, setExceptions] =
    useState<ExceptionSummaryRow[]>(initialExceptions);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Reload when filters/date change
  const reload = useCallback(
    (
      tab: ReportTab,
      range: DateRange,
      pType: string,
      cls: string,
      pStatus: string
    ) => {
      setError(null);
      startTransition(async () => {
        if (tab === "classes") {
          const result = await fetchClassReport(orgSlug);
          if (result.ok) setClasses(result.classes);
          else setError(result.error);
        } else if (tab === "people") {
          const result = await fetchPeopleReport({
            slug: orgSlug,
            personType: pType,
            classId: cls,
            status: pStatus,
          });
          if (result.ok) {
            setPeople(result.people);
            setPeopleTotal(result.total);
          } else {
            setError(result.error);
          }
        } else if (tab === "schedule") {
          const result = await fetchScheduleReport({
            slug: orgSlug,
            from: range.from?.toISOString() ?? null,
            to: range.to?.toISOString() ?? null,
            classId: cls,
          });
          if (result.ok) {
            setSchedule(result.entries);
            setExceptions(result.exceptions);
          } else {
            setError(result.error);
          }
        }
      });
    },
    [orgSlug]
  );

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    reload(tab, dateRange, personTypeFilter, classFilter, personStatusFilter);
  };

  const handleDateChange = (preset: DatePreset) => {
    const range = getDateRange(preset);
    setDateRange(range);
    reload(activeTab, range, personTypeFilter, classFilter, personStatusFilter);
  };

  const handlePersonTypeChange = (v: string) => {
    setPersonTypeFilter(v);
    reload(activeTab, dateRange, v, classFilter, personStatusFilter);
  };

  const handleClassFilterChange = (v: string) => {
    setClassFilter(v);
    reload(activeTab, dateRange, personTypeFilter, v, personStatusFilter);
  };

  const handlePersonStatusChange = (v: string) => {
    setPersonStatusFilter(v);
    reload(activeTab, dateRange, personTypeFilter, classFilter, v);
  };

  // ── Export CSV handlers ──────────────────────────────────────────────────

  const exportClasses = () => {
    const rows: string[][] = [
      ["Class", "Code", "Status", "Active Members", "Total Members", "Timetable Slots"],
      ...classes.map((c) => [
        c.name,
        c.code ?? "",
        c.status,
        String(c.activeMemberCount),
        String(c.memberCount),
        String(c.timetableEntryCount),
      ]),
    ];
    downloadCsv(rows, `classes-${orgSlug}.csv`);
  };

  const exportPeople = () => {
    const rows: string[][] = [
      ["Name", "Type", "Status", "ID", "Classes", "Added"],
      ...people.map((p) => [
        p.name,
        PERSON_TYPE_LABELS[p.personType] ?? p.personType,
        p.status,
        p.orgIdentifier ?? "",
        p.classNames.join("; "),
        formatDate(p.createdAt),
      ]),
    ];
    downloadCsv(rows, `people-${orgSlug}.csv`);
  };

  const exportSchedule = () => {
    const rows: string[][] = [
      [
        "Class",
        "Subject",
        "Teacher",
        "Room",
        "Days",
        "Start",
        "End",
        "Period",
        "Effective From",
        "Effective To",
        "Status",
        "Total Exceptions",
        "Cancelled",
        "Rescheduled",
        "Substituted",
      ],
      ...schedule.map((e) => [
        e.className,
        e.subjectName,
        e.teacherName,
        e.roomName ?? "",
        formatDays(e.daysOfWeek),
        e.startTime,
        e.endTime,
        e.periodLabel ?? "",
        formatDate(e.effectiveFrom),
        formatDate(e.effectiveTo),
        e.status,
        String(e.exceptionCount),
        String(e.cancelledCount),
        String(e.rescheduledCount),
        String(e.substitutedCount),
      ]),
    ];
    downloadCsv(rows, `schedule-${orgSlug}.csv`);
  };

  // ── Derived counts ────────────────────────────────────────────────────────

  const totalMembers = summary.activePeople;
  const classOptions_ = [
    { value: "ALL", label: "All classes" },
    ...classOptions.map((c) => ({ value: c.id, label: c.name })),
  ];

  const personTypeOptions = [
    { value: "ALL", label: "All types" },
    ...Object.entries(PERSON_TYPE_LABELS).map(([v, l]) => ({
      value: v,
      label: l,
    })),
  ];

  const statusOptions = [
    { value: "ALL", label: "All statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
  ];

  // ── Org is effectively empty if no people/classes/entries exist ───────────
  const isEmpty =
    summary.totalPeople === 0 &&
    summary.totalClasses === 0 &&
    summary.totalTimetableEntries === 0;

  return (
    <div className="px-8 sm:px-14 pb-20">
      {/* ── Page heading ── */}
      <div className="mb-8">
        <h1 className="text-[40px] font-semibold tracking-tight">Reports</h1>
        <p className="text-[18px] text-text-accent mt-1">
          Understand attendance, classes, and participation across your
          organization.
        </p>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex flex-col gap-4 mb-8 p-4 bg-white/40 border border-black/8 rounded-2xl">
        <div className="flex items-center gap-2 text-[13px] font-medium text-text-accent">
          <ListFilter size={14} />
          Filters
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-accent">
              Date range
            </span>
            <DatePresetSelector
              current={dateRange.preset}
              onChange={handleDateChange}
              disabled={isPending}
            />
          </div>

          {(activeTab === "people" || activeTab === "overview") && (
            <FilterSelect
              label="Person type"
              value={personTypeFilter}
              options={personTypeOptions}
              onChange={handlePersonTypeChange}
              disabled={isPending}
            />
          )}

          {(activeTab === "people" ||
            activeTab === "schedule" ||
            activeTab === "classes") && (
            <FilterSelect
              label="Class"
              value={classFilter}
              options={classOptions_}
              onChange={handleClassFilterChange}
              disabled={isPending}
            />
          )}

          {activeTab === "people" && (
            <FilterSelect
              label="Status"
              value={personStatusFilter}
              options={statusOptions}
              onChange={handlePersonStatusChange}
              disabled={isPending}
            />
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <TabBar current={activeTab} onChange={handleTabChange} />
        {isPending && (
          <Loader2 size={16} className="animate-spin text-text-accent" />
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-6 flex items-center gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-10">
          {isEmpty ? (
            <EmptyState
              icon={<LayoutGrid size={22} />}
              title="No data yet"
              description="Reports will appear here once your organization has people, classes, and a timetable set up."
            />
          ) : (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricCard
                  label="Active people"
                  value={totalMembers}
                  icon={<Users size={16} />}
                  sub={
                    summary.inactivePeople > 0
                      ? `${summary.inactivePeople} inactive`
                      : undefined
                  }
                />
                <MetricCard
                  label="Active classes"
                  value={summary.totalClasses}
                  icon={<BookOpen size={16} />}
                />
                <MetricCard
                  label="Timetable slots"
                  value={summary.totalTimetableEntries}
                  icon={<CalendarDays size={16} />}
                  sub={
                    summary.totalExceptions > 0
                      ? `${summary.totalExceptions} exception${summary.totalExceptions !== 1 ? "s" : ""}`
                      : "No exceptions"
                  }
                />
                <MetricCard
                  label="Subjects"
                  value={summary.totalSubjects}
                  icon={<Building2 size={16} />}
                  sub={
                    summary.totalRooms > 0
                      ? `${summary.totalRooms} room${summary.totalRooms !== 1 ? "s" : ""}`
                      : undefined
                  }
                />
              </div>

              {/* People by type breakdown */}
              {summary.peopleByType.length > 0 && (
                <div>
                  <SectionHeading
                    title="People by type"
                    count={summary.activePeople}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {summary.peopleByType
                      .sort((a, b) => b.count - a.count)
                      .map((item) => (
                        <div
                          key={item.type}
                          className="bg-white/40 border border-black/8 rounded-xl p-4 flex items-center justify-between"
                        >
                          <p className="text-[14px] font-medium">
                            {PERSON_TYPE_LABELS[item.type] ?? item.type}
                          </p>
                          <span className="text-[20px] font-semibold">
                            {item.count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Attendance notice */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[13px] text-amber-800 font-medium mb-0.5">
                  Attendance records not yet available
                </p>
                <p className="text-[13px] text-amber-700">
                  Attendance rate, sessions held, present/absent counts, and
                  individual attendance history will appear here once the
                  attendance recording feature is live.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CLASSES TAB                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "classes" && (
        <div>
          <SectionHeading
            title="Class roster"
            count={classes.length}
            action={
              classes.length > 0 ? (
                <button
                  type="button"
                  onClick={exportClasses}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent hover:bg-accent/70 transition-colors"
                >
                  <Download size={12} />
                  Export CSV
                </button>
              ) : undefined
            }
          />

          {classes.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={22} />}
              title="No classes yet"
              description="Set up classes in the Timetable section to see class roster data here."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/8">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-black/8 bg-accent/40">
                    <th className="text-left px-4 py-3 font-medium text-text-accent">
                      Class
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-accent">
                      Members
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-accent">
                      Active
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-accent">
                      Timetable slots
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-accent">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c, i) => (
                    <tr
                      key={c.id}
                      className={[
                        "border-b border-black/5 last:border-0 transition-colors hover:bg-accent/20",
                        i % 2 === 0 ? "bg-white/30" : "bg-transparent",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {c.code && (
                            <span className="text-[11px] text-text-accent font-normal bg-accent px-1.5 py-0.5 rounded">
                              {c.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {c.memberCount}
                      </td>
                      <td className="px-4 py-3 text-right text-text-accent">
                        {c.activeMemberCount}
                      </td>
                      <td className="px-4 py-3 text-right text-text-accent">
                        {c.timetableEntryCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                            c.status === "ACTIVE"
                              ? "bg-green-accent text-green"
                              : "bg-black/6 text-text-accent",
                          ].join(" ")}
                        >
                          {c.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PEOPLE TAB                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "people" && (
        <div>
          <SectionHeading
            title="People"
            count={peopleTotal}
            action={
              people.length > 0 ? (
                <button
                  type="button"
                  onClick={exportPeople}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent hover:bg-accent/70 transition-colors"
                >
                  <Download size={12} />
                  Export CSV
                </button>
              ) : undefined
            }
          />

          {peopleTotal > 200 && (
            <p className="text-[12px] text-text-accent mb-3">
              Showing 200 of {peopleTotal} people. Use filters to narrow results.
            </p>
          )}

          {people.length === 0 ? (
            <EmptyState
              icon={<Users size={22} />}
              title="No people found"
              description="Add people in the People section, or adjust your filters to see results."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/8">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-black/8 bg-accent/40">
                    <th className="text-left px-4 py-3 font-medium text-text-accent">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-accent">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-accent">
                      Classes
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-accent">
                      ID
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-accent">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-accent">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p, i) => (
                    <tr
                      key={p.id}
                      className={[
                        "border-b border-black/5 last:border-0 transition-colors hover:bg-accent/20",
                        i % 2 === 0 ? "bg-white/30" : "bg-transparent",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-text-accent">
                        {PERSON_TYPE_LABELS[p.personType] ?? p.personType}
                      </td>
                      <td className="px-4 py-3 text-text-accent">
                        {p.classNames.length > 0
                          ? p.classNames.join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-text-accent">
                        {p.orgIdentifier ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                            p.status === "ACTIVE"
                              ? "bg-green-accent text-green"
                              : "bg-black/6 text-text-accent",
                          ].join(" ")}
                        >
                          {p.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-accent">
                        {formatDate(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCHEDULE TAB                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "schedule" && (
        <div className="space-y-10">
          {/* ── Timetable entries ── */}
          <div>
            <SectionHeading
              title="Recurring schedule"
              count={schedule.length}
              action={
                schedule.length > 0 ? (
                  <button
                    type="button"
                    onClick={exportSchedule}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent hover:bg-accent/70 transition-colors"
                  >
                    <Download size={12} />
                    Export CSV
                  </button>
                ) : undefined
              }
            />

            {schedule.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={22} />}
                title="No timetable entries"
                description="Set up your timetable in the Timetable section to see schedule data here."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-black/8">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-black/8 bg-accent/40">
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Class
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Subject
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Teacher
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Days
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Time
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-text-accent">
                        Exceptions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((e, i) => (
                      <tr
                        key={e.id}
                        className={[
                          "border-b border-black/5 last:border-0 transition-colors hover:bg-accent/20",
                          i % 2 === 0 ? "bg-white/30" : "bg-transparent",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            {e.className}
                            {e.classCode && (
                              <span className="text-[11px] text-text-accent font-normal bg-accent px-1.5 py-0.5 rounded">
                                {e.classCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-accent">
                          {e.subjectName}
                        </td>
                        <td className="px-4 py-3 text-text-accent">
                          {e.teacherName}
                        </td>
                        <td className="px-4 py-3 text-text-accent">
                          {formatDays(e.daysOfWeek)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-text-accent">
                          {e.startTime}–{e.endTime}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {e.exceptionCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                              {e.exceptionCount}
                            </span>
                          ) : (
                            <span className="text-text-accent">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Exceptions list ── */}
          {exceptions.length > 0 && (
            <div>
              <SectionHeading
                title="Schedule exceptions"
                count={exceptions.length}
              />
              <div className="overflow-x-auto rounded-2xl border border-black/8">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-black/8 bg-accent/40">
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Type
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Class
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Subject
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Teacher
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-accent">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.map((ex, i) => (
                      <tr
                        key={ex.id}
                        className={[
                          "border-b border-black/5 last:border-0 hover:bg-accent/20 transition-colors",
                          i % 2 === 0 ? "bg-white/30" : "bg-transparent",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3 font-medium">
                          {formatDate(ex.exceptionDate)}
                        </td>
                        <td className="px-4 py-3">
                          <ExceptionTypeBadge type={ex.exceptionType} />
                        </td>
                        <td className="px-4 py-3 text-text-accent">
                          {ex.className}
                        </td>
                        <td className="px-4 py-3 text-text-accent">
                          {ex.subjectName}
                        </td>
                        <td className="px-4 py-3 text-text-accent">
                          {ex.substitutePersonName
                            ? `${ex.teacherName} → ${ex.substitutePersonName}`
                            : ex.teacherName}
                        </td>
                        <td className="px-4 py-3 text-text-accent">
                          {ex.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance notice for schedule tab */}
          <div className="p-4 rounded-xl bg-accent/40 border border-black/8">
            <p className="text-[13px] text-text-accent">
              <strong className="text-foreground">
                Session-level attendance data
              </strong>{" "}
              — whether each scheduled session was actually held — will appear
              here once attendance recording is active.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Exception type badge ─────────────────────────────────────────────────────

function ExceptionTypeBadge({ type }: { type: string }) {
  const colours: Record<string, string> = {
    CANCELLED: "bg-red-50 text-red-700",
    RESCHEDULED: "bg-blue/10 text-blue",
    SUBSTITUTED: "bg-amber-50 text-amber-700",
    ROOM_CHANGE: "bg-purple-50 text-purple-700",
    OTHER: "bg-black/6 text-text-accent",
  };

  return (
    <span
      className={[
        "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
        colours[type] ?? "bg-black/6 text-text-accent",
      ].join(" ")}
    >
      {EXCEPTION_TYPE_LABELS[type] ?? type}
    </span>
  );
}
