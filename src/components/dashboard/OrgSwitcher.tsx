"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronsUpDown, Plus, Check } from "lucide-react";
import Image from "next/image";

export interface OrgItem {
  id: string;
  name: string;
  slug: string;
  type: "SCHOOL" | "ORGANIZATION" | "EVENT";
  image?: string | null;
}

interface OrgSwitcherProps {
  currentOrg: OrgItem;
  memberships: OrgItem[];
}

function entityIcon(type: OrgItem["type"]): string {
  switch (type) {
    case "SCHOOL":       return "/school.svg";
    case "EVENT":        return "/event.svg";
    default:             return "/org.svg";
  }
}

const PAGE_SIZE = 10;

export default function OrgSwitcher({ currentOrg, memberships }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleSwitch = (org: OrgItem) => {
    setOpen(false);
    if (org.slug === currentOrg.slug) return;

    // Preserve the current sub-path when switching orgs
    const segments = pathname.split("/").filter(Boolean);
    // segments[0] is the current slug; rest is the sub-path
    const subPath = segments.slice(1).join("/");
    const safeSubPath = subPath || "overview";
    router.push(`/${org.slug}/${safeSubPath}`);
  };

  const handleCreateOrg = () => {
    setOpen(false);
    router.push("/onboarding");
  };

  const visible = showAll ? memberships : memberships.slice(0, PAGE_SIZE);
  const hasMore = !showAll && memberships.length > PAGE_SIZE;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[12px] px-[24px] py-[12px] hover:bg-accent rounded-2xl transition-colors w-full"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Image
          src={currentOrg.image ?? entityIcon(currentOrg.type)}
          alt={currentOrg.name}
          width={25}
          height={25}
          className="shrink-0"
        />
        <p className="text-[16px] font-medium truncate flex-1 text-left">
          {currentOrg.name}
        </p>
        <ChevronsUpDown size={20} className="text-text-accent shrink-0" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 w-full min-w-[260px] bg-background rounded-2xl shadow-[0px_4px_24px_0_rgba(0,0,0,0.12)] border border-accent z-50 overflow-hidden"
            role="listbox"
            aria-label="Switch organization"
          >
            <div className="py-2 max-h-[300px] overflow-y-auto">
              {visible.map((org) => {
                const isCurrent = org.slug === currentOrg.slug;
                return (
                  <button
                    key={org.id}
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => handleSwitch(org)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors"
                  >
                    <Image
                      src={org.image ?? entityIcon(org.type)}
                      alt={org.name}
                      width={22}
                      height={22}
                      className="shrink-0"
                    />
                    <span className="flex-1 text-[14px] font-medium truncate text-left">
                      {org.name}
                    </span>
                    {isCurrent && (
                      <Check size={14} className="text-blue shrink-0" />
                    )}
                  </button>
                );
              })}

              {hasMore && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-text-accent hover:bg-accent transition-colors"
                >
                  Show more ({memberships.length - PAGE_SIZE} more)
                </button>
              )}
            </div>

            {/* Divider + Create */}
            <div className="border-t border-accent">
              <button
                onClick={handleCreateOrg}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] font-medium hover:bg-accent transition-colors"
              >
                <Plus size={16} />
                Create organization
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
