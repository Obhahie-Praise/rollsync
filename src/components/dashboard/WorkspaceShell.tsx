"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SearchModal from "./SearchModal";
import type { OrgItem } from "./OrgSwitcher";

interface WorkspaceShellProps {
  children: React.ReactNode;
  slug: string;
  user: {
    name: string;
    image?: string | null;
  };
  currentOrg: OrgItem;
  memberships: OrgItem[];
  /** True when the current user is linked as a TEACHER in this org (and is not an admin/owner) */
  isTeacher?: boolean;
}

export default function WorkspaceShell({
  children,
  slug,
  user,
  currentOrg,
  memberships,
  isTeacher = false,
}: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Don't fire while the user is typing in any input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (
        !searchOpen && // allow shortcuts inside search modal (handled there)
        (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable)
      ) {
        return;
      }

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }

      if (mod && e.key.toLowerCase() === "b") {
        // Only fire when search is NOT open (search modal handles its own B shortcut)
        if (!searchOpen) {
          e.preventDefault();
          toggleSidebar();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch, toggleSidebar, searchOpen]);

  return (
    <>
      <Header
        onSearchOpen={openSearch}
        onSidebarOpen={openSidebar}
        userImage={user.image}
      />

      {/* Offset content below fixed header — matches the header's py-3+logo height on mobile */}
      <div className="pt-[72px] sm:pt-[80px]">
        {children}
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        slug={slug}
        user={user}
        currentOrg={currentOrg}
        memberships={memberships}
        isTeacher={isTeacher}
      />

      <SearchModal
        isOpen={searchOpen}
        onClose={closeSearch}
        slug={slug}
      />
    </>
  );
}
