"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserRound, LogOut, Loader2, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { navLinks, bottomLinks } from "@/lib/nav-config";
import OrgSwitcher, { type OrgItem } from "./OrgSwitcher";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  user: {
    name: string;
    image?: string | null;
  };
  currentOrg: OrgItem;
  memberships: OrgItem[];
}

/** Truncate display name: if over 14 chars, show first name only */
function displayName(name: string): string {
  if (name.length <= 14) return name;
  return name.split(" ")[0] ?? name;
}

export default function Sidebar({
  isOpen,
  onClose,
  slug,
  user,
  currentOrg,
  memberships,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // ── Dropdown state ───────────────────────────────────────────────────────
  const [manualOpenGroups, setManualOpenGroups] = useState<Record<string, boolean>>({});

  function isGroupOpen(label: string, matchSegments: string[]): boolean {
    const onRoute = matchSegments.some((seg) =>
      pathname.split("/").filter(Boolean).includes(seg)
    );
    return onRoute || !!manualOpenGroups[label];
  }

  function toggleGroup(label: string) {
    setManualOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Trap body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.push("/");
    } catch {
      setLoggingOut(false);
    }
  };

  /** Is a given segment active based on the current pathname? */
  const isActive = (segment: string) => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.includes(segment);
  };

  // ── Reduced motion check (client-only) ──────────────────────────────────
  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar panel — full-height drawer from the right */}
          <motion.aside
            ref={sidebarRef}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: "100%" }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, x: "100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[320px] sm:max-w-[360px] bg-background shadow-[-4px_0_40px_rgba(0,0,0,0.08)] flex flex-col overflow-y-auto"
            role="navigation"
            aria-label="Workspace sidebar"
          >
            {/* Top section */}
            <div className="flex flex-col gap-5 p-5 flex-1">
              {/* User row + close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-dark-accent rounded-full text-white shrink-0 overflow-hidden w-[46px] h-[46px] flex items-center justify-center">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={46}
                        height={46}
                        className="rounded-full object-cover w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <UserRound size={22} />
                    )}
                  </div>
                  <p className="font-semibold text-[18px] sm:text-[20px]">
                    {displayName(user.name)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-text-accent rounded-full hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-blue/50"
                  aria-label="Close sidebar"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Org switcher */}
              <OrgSwitcher currentOrg={currentOrg} memberships={memberships} />

              {/* Nav links */}
              <nav className="space-y-2" aria-label="Main navigation">
                {navLinks.map((link) => {
                  if (link.children) {
                    const childSegments = link.children.map((c) => c.matchSegment);
                    const anyChildActive = childSegments.some((seg) => isActive(seg));
                    const groupOpen = isGroupOpen(link.label, childSegments);

                    return (
                      <div key={link.label}>
                        {/* Parent toggle button */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(link.label)}
                          className={[
                            "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-colors",
                            anyChildActive
                              ? "bg-blue text-white"
                              : "hover:bg-accent",
                          ].join(" ")}
                          aria-expanded={groupOpen}
                        >
                          <div className="flex items-center gap-3">
                            <link.icon size={22} strokeWidth={1.5} />
                            <p className="text-[17px] font-medium">{link.label}</p>
                          </div>
                          <motion.div
                            animate={{ rotate: groupOpen ? 180 : 0 }}
                            transition={
                              prefersReduced
                                ? { duration: 0 }
                                : { duration: 0.2, ease: "easeInOut" }
                            }
                          >
                            <ChevronDown
                              size={17}
                              strokeWidth={2}
                              className={anyChildActive ? "text-white" : "text-text-accent"}
                            />
                          </motion.div>
                        </button>

                        {/* Animated children */}
                        <AnimatePresence initial={false}>
                          {groupOpen && (
                            <motion.div
                              key={`${link.label}-children`}
                              initial={
                                prefersReduced
                                  ? { opacity: 1, height: "auto" }
                                  : { opacity: 0, height: 0 }
                              }
                              animate={{ opacity: 1, height: "auto" }}
                              exit={
                                prefersReduced
                                  ? { opacity: 1, height: "auto" }
                                  : { opacity: 0, height: 0 }
                              }
                              transition={{ duration: 0.18, ease: "easeInOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              <div className="ml-[46px] space-y-0.5 pt-1 pb-1">
                                {link.children.map((child) => {
                                  const active = isActive(child.matchSegment);
                                  return (
                                    <Link
                                      key={child.matchSegment}
                                      href={child.href(slug)}
                                      onClick={onClose}
                                      className={[
                                        "block px-4 py-2 rounded-lg text-[15px] font-medium transition-colors",
                                        active
                                          ? "bg-accent text-foreground"
                                          : "hover:bg-input",
                                      ].join(" ")}
                                    >
                                      {child.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // Regular link
                  const active = isActive(link.matchSegment!);
                  return (
                    <Link
                      key={link.label}
                      href={link.href!(slug)}
                      onClick={onClose}
                      className={[
                        "flex items-center gap-3 px-[24px] py-3 rounded-full transition-colors",
                        active ? "bg-blue text-white" : "hover:bg-accent",
                      ].join(" ")}
                    >
                      <link.icon size={22} strokeWidth={1.5} />
                      <p className="text-[17px] font-medium">{link.label}</p>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom section — pinned to bottom */}
            <div className="p-5 border-t border-black/5 space-y-1">
              {bottomLinks.map((link) => {
                const active = isActive(link.matchSegment);
                return (
                  <Link
                    key={link.label}
                    href={link.href(slug)}
                    onClick={onClose}
                    className={[
                      "flex items-center gap-3 px-[24px] py-3 rounded-full transition-colors",
                      active ? "bg-blue text-white" : "hover:bg-accent",
                    ].join(" ")}
                  >
                    <link.icon size={22} strokeWidth={1.5} />
                    <p className="text-[17px] font-medium">{link.label}</p>
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-[24px] py-3 rounded-full hover:bg-accent transition-colors disabled:opacity-60"
              >
                {loggingOut ? (
                  <Loader2 size={22} className="text-red-500 animate-spin" />
                ) : (
                  <LogOut size={22} strokeWidth={1.5} className="text-red-500" />
                )}
                <p className="text-[17px] font-medium">
                  {loggingOut ? "Logging out…" : "Logout"}
                </p>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
