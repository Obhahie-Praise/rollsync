/**
 * Centralized workspace navigation configuration.
 * All sidebar links and breadcrumb labels are derived from this file.
 */

import {
  Layout,
  Calendar,
  FaceSlightlySmiling,
  Folder,
  ClipboardPen,
  Webhook,
  Cog,
  Headset,
  TableProperties,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  href: (slug: string) => string;
  icon: LucideIcon;
  /** pathname pattern used for active detection */
  matchSegment: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  /** If set, this is a direct link. */
  href?: (slug: string) => string;
  matchSegment?: string;
  /** If set, this item has children (dropdown). */
  children?: { label: string; href: (slug: string) => string; matchSegment: string }[];
}

export const navLinks: NavGroup[] = [
  {
    label: "Overview",
    icon: Layout,
    href: (slug) => `/${slug}/overview`,
    matchSegment: "overview",
  },
  {
    label: "Attendance",
    icon: Calendar,
    children: [
      {
        label: "Session",
        href: (slug) => `/${slug}/attendance/session`,
        matchSegment: "session",
      },
      {
        label: "Record",
        href: (slug) => `/${slug}/attendance/record`,
        matchSegment: "record",
      },
    ],
  },
  {
    label: "Timetable",
    icon: TableProperties,
    children: [
      {
        label: "Schedule",
        href: (slug) => `/${slug}/timetable`,
        matchSegment: "timetable",
      },
      {
        label: "Classes",
        href: (slug) => `/${slug}/timetable/classes`,
        matchSegment: "classes",
      },
      {
        label: "Subjects",
        href: (slug) => `/${slug}/timetable/subjects`,
        matchSegment: "subjects",
      },
      {
        label: "Rooms",
        href: (slug) => `/${slug}/timetable/rooms`,
        matchSegment: "rooms",
      },
    ],
  },
  {
    label: "People",
    icon: FaceSlightlySmiling,
    href: (slug) => `/${slug}/people`,
    matchSegment: "people",
  },
  {
    label: "Organization",
    icon: Folder,
    href: (slug) => `/${slug}/organization`,
    matchSegment: "organization",
  },
  {
    label: "Reports",
    icon: ClipboardPen,
    href: (slug) => `/${slug}/reports`,
    matchSegment: "reports",
  },
  {
    label: "Developers",
    icon: Webhook,
    href: (slug) => `/${slug}/developers`,
    matchSegment: "developers",
  },
  {
    label: "Settings",
    icon: Cog,
    href: (slug) => `/${slug}/settings`,
    matchSegment: "settings",
  },
];

export const bottomLinks = [
  {
    label: "Help center",
    icon: Headset,
    href: (slug: string) => `/${slug}/help`,
    matchSegment: "help",
  },
];

// ─── Teacher navigation ────────────────────────────────────────────────────────

export const teacherNavLinks: NavGroup[] = [
  {
    label: "Today",
    icon: CalendarDays,
    href: (slug) => `/${slug}/teacher/today`,
    matchSegment: "today",
  },
  {
    label: "My Classes",
    icon: BookOpen,
    href: (slug) => `/${slug}/teacher/classes`,
    matchSegment: "classes",
  },
  {
    label: "Timetable",
    icon: TableProperties,
    href: (slug) => `/${slug}/teacher/timetable`,
    matchSegment: "timetable",
  },
];

export const teacherBottomLinks = [
  {
    label: "Help center",
    icon: Headset,
    href: (slug: string) => `/${slug}/help`,
    matchSegment: "help",
  },
];

// ─── Settings sub-route labels ─────────────────────────────────────────────────

const settingsSegmentLabels: Record<string, string> = {
  profile: "Profile",
  organization: "Organization",
  attendance: "Attendance",
  notifications: "Notifications",
  security: "Security",
  developers: "Developers",
  billing: "Billing",
  help: "Help & support",
};

/**
 * Given a pathname, return the human-readable breadcrumb label.
 * e.g. "/acme-school/attendance/session" → "Attendance / Session"
 * e.g. "/acme-school/settings/profile"  → "Settings / Profile"
 */
export function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] = slug, segments[1..] = route

  if (segments.length < 2) return "Overview";

  const rest = segments.slice(1); // drop slug

  if (rest[0] === "attendance" && rest[1]) {
    const child = rest[1].charAt(0).toUpperCase() + rest[1].slice(1);
    return `Attendance / ${child}`;
  }

  if (rest[0] === "settings" && rest[1]) {
    const sub = settingsSegmentLabels[rest[1]] ?? (rest[1].charAt(0).toUpperCase() + rest[1].slice(1));
    return `Settings / ${sub}`;
  }

  const label = rest[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
}
