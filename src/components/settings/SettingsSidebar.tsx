"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SettingsNavItem {
  label: string;
  href: string;
  segment: string;
}

interface SettingsSidebarProps {
  slug: string;
}

function buildNavItems(slug: string): SettingsNavItem[] {
  return [
    { label: "Profile", href: `/${slug}/settings/profile`, segment: "profile" },
    {
      label: "Organization",
      href: `/${slug}/settings/organization`,
      segment: "organization",
    },
    {
      label: "Attendance",
      href: `/${slug}/settings/attendance`,
      segment: "attendance",
    },
    {
      label: "Notifications",
      href: `/${slug}/settings/notifications`,
      segment: "notifications",
    },
    {
      label: "Security",
      href: `/${slug}/settings/security`,
      segment: "security",
    },
    {
      label: "Developers",
      href: `/${slug}/settings/developers`,
      segment: "developers",
    },
    { label: "Billing", href: `/${slug}/settings/billing`, segment: "billing" },
    {
      label: "Help & support",
      href: `/${slug}/settings/help`,
      segment: "help",
    },
  ];
}

export function SettingsSidebar({ slug }: SettingsSidebarProps) {
  const pathname = usePathname();
  const navItems = buildNavItems(slug);

  // Determine active segment from pathname
  // e.g. /acme/settings/profile → "profile"
  const segments = pathname.split("/").filter(Boolean);
  const settingsIndex = segments.indexOf("settings");
  const activeSegment =
    settingsIndex !== -1 ? (segments[settingsIndex + 1] ?? "") : "";

  return (
    <nav className="space-y-[4px]" aria-label="Settings navigation">
      {navItems.map((item) => {
        const isActive = activeSegment === item.segment;
        return (
          <Link
            key={item.segment}
            href={item.href}
            className={[
              "block px-4 py-2.5 rounded-full text-[20px] transition-colors font-medium",
              isActive
                ? "bg-accent text-foreground font-medium shadow-[0px_3px_30px_0_#D3D3D3]"
                : "text-foreground/75 hover:bg-white/50 hover:text-foreground font-normal",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
