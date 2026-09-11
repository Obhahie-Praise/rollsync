"use client";

import { usePathname } from "next/navigation";
import { Command, Menu, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { getBreadcrumb } from "@/lib/nav-config";

interface HeaderProps {
  onSearchOpen: () => void;
  onSidebarOpen: () => void;
  userImage?: string | null;
}

export default function Header({ onSearchOpen, onSidebarOpen, userImage }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 w-full flex items-center justify-between px-4 sm:px-8 lg:px-10 py-3 sm:py-4 bg-background/80 backdrop-blur-sm gap-3">
      {/* Logo */}
      <Link
        href="/"
        className="logo-font text-[26px] sm:text-[30px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] hover:opacity-80 active:opacity-60 transition-opacity focus-visible:outline-2 focus-visible:outline-blue/50 rounded-sm shrink-0"
      >
        Roll SYNC
      </Link>

      {/* Search button — hidden on very small screens, shown from sm up */}
      <button
        type="button"
        onClick={onSearchOpen}
        className="hidden sm:flex items-center justify-between flex-1 max-w-[300px] px-4 py-3 bg-accent rounded-full shadow-[0px_3px_20px_0_#D3D3D3] hover:bg-accent/80 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-blue/50"
        aria-label="Open search"
      >
        <div className="flex items-center gap-2">
          <Search size={15} />
          <p className="text-[14px] font-medium text-placeholder">Search</p>
        </div>
        <div className="text-text-accent font-medium text-[12px] flex items-center gap-0.5">
          <Command size={12} className="inline" /> K
        </div>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Search icon (mobile only) */}
        <button
          type="button"
          onClick={onSearchOpen}
          className="sm:hidden p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Open search"
        >
          <Search size={20} />
        </button>

        {/* Breadcrumb — hidden on small screens */}
        <p className="hidden md:block font-medium text-[18px] truncate max-w-[200px]">
          {breadcrumb}
        </p>

        {/* Sidebar trigger */}
        <button
          type="button"
          onClick={onSidebarOpen}
          className="flex items-center gap-1.5 bg-white rounded-full border border-border pl-2 sm:pl-3 shadow-[0px_3px_20px_0_#D3D3D3] hover:bg-gray-50 active:scale-[0.97] transition-all focus-visible:outline-2 focus-visible:outline-blue/50"
          aria-label="Open sidebar"
          aria-haspopup="true"
        >
          <Menu size={22} />
          <div className="bg-dark-accent p-2.5 rounded-full text-white overflow-hidden w-[44px] h-[44px] flex items-center justify-center">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt="User avatar"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <UserRound size={22} />
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
