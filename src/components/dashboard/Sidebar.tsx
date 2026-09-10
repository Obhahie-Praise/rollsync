"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserRound, LogOut, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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

/** Truncate display name: if over 10 chars, show first name only */
function displayName(name: string): string {
  if (name.length <= 10) return name;
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
    return () => { document.body.style.overflow = ""; };
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
    // parts[0] = slug, rest = path segments
    return parts.includes(segment);
  };

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

          {/* Sidebar panel */}
          <motion.aside
            ref={sidebarRef}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed top-1/2 -translate-y-1/2 right-10 z-50 h-[95vh] w-[350px] bg-background rounded-[30px] p-[20px] shadow-[0px_3px_30px_0_#D3D3D3] flex flex-col justify-between"
            role="navigation"
            aria-label="Workspace sidebar"
          >
            {/* Top section */}
            <div className="space-y-[24px]">
              {/* User row + close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[12px] mb-[10px]">
                  <div className="bg-dark-accent p-3 rounded-full text-white shrink-0 overflow-hidden w-[52px] h-[52px] flex items-center justify-center">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={52}
                        height={52}
                        className="rounded-full object-cover w-full h-full"
                        onError={(e) => {
                          // fallback to icon on broken image
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <UserRound size={26} />
                    )}
                  </div>
                  <p className="font-medium text-[24px]">{displayName(user.name)}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 text-text-accent rounded-full shadow-[0px_3px_30px_0_#D3D3D3] hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-blue/50"
                  aria-label="Close sidebar"
                >
                  <X size={28} />
                </button>
              </div>

              {/* Org switcher */}
              <OrgSwitcher currentOrg={currentOrg} memberships={memberships} />

              {/* Nav links */}
              <nav className="space-y-[4px]">
                {navLinks.map((link) => {
                  if (link.children) {
                    // Attendance group
                    const anyChildActive = link.children.some((c) =>
                      isActive(c.matchSegment)
                    );
                    return (
                      <div key={link.label}>
                        <div
                          className={[
                            "flex items-center gap-[12px] px-[24px] py-[12px] rounded-full cursor-pointer",
                            anyChildActive ? "bg-blue text-white rounded-full" : "",
                          ].join(" ")}
                        >
                          <link.icon size={28} strokeWidth={1.4} />
                          <p className="text-[24px] font-medium">{link.label}</p>
                        </div>
                        <div className="ml-[52px] space-y-[2px] pt-[8px]">
                          {link.children.map((child) => {
                            const active = isActive(child.matchSegment);
                            return (
                              <Link
                                key={child.matchSegment}
                                href={child.href(slug)}
                                onClick={onClose}
                                className={[
                                  "block px-[16px] py-[8px] rounded-full text-[18px] font-medium transition-colors",
                                  active
                                    ? "bg-accent text-black"
                                    : "hover:bg-input",
                                ].join(" ")}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
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
                        "flex items-center gap-[12px] px-[24px] py-[12px] rounded-2xl transition-colors",
                        active ? "bg-blue text-white" : "hover:bg-accent",
                      ].join(" ")}
                    >
                      <link.icon size={28} strokeWidth={1.4} />
                      <p className="text-[24px] font-medium">{link.label}</p>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom section */}
            <div>
              {bottomLinks.map((link) => {
                const active = isActive(link.matchSegment);
                return (
                  <Link
                    key={link.label}
                    href={link.href(slug)}
                    onClick={onClose}
                    className={[
                      "flex items-center gap-[12px] px-[24px] py-[12px] rounded-2xl transition-colors",
                      active ? "bg-blue text-white" : "hover:bg-accent",
                    ].join(" ")}
                  >
                    <link.icon size={28} strokeWidth={1.4} />
                    <p className="text-[24px] font-medium">{link.label}</p>
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-[12px] px-[24px] py-[12px] rounded-2xl hover:bg-accent transition-colors disabled:opacity-60"
              >
                {loggingOut ? (
                  <Loader2 size={28} className="text-red-500 animate-spin" />
                ) : (
                  <LogOut size={28} strokeWidth={1.4} className="text-red-500" />
                )}
                <p className="text-[24px] font-medium">
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
