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
    <header className="fixed top-0 left-0 right-0 z-30 w-full flex items-center justify-between p-[40px] bg-background/80 backdrop-blur-sm">
      {/* Logo */}
      <Link
        href="/"
        className="logo-font text-[32px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-2 hover:opacity-80 active:opacity-60 transition-opacity focus-visible:outline-2 focus-visible:outline-blue/50 rounded-sm"
      >
        Roll SYNC
      </Link>

      {/* Search button */}
      <button
        type="button"
        onClick={onSearchOpen}
        className="flex items-center justify-between w-[300px] px-[20px] py-[16px] bg-accent rounded-full shadow-[0px_3px_30px_0_#D3D3D3] hover:bg-accent/80 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-blue/50"
        aria-label="Open search"
      >
        <div className="flex items-center gap-[10px]">
          <Search size={16} />
          <p className="text-[16px] font-medium text-placeholder">Search</p>
        </div>
        <div className="text-text-accent font-medium text-[14px]">
          <Command size={14} className="inline" /> + K
        </div>
      </button>

      <div className="flex items-center gap-[24px]">
        {/* Dynamic breadcrumb */}
        <p className="font-medium text-[20px]">{breadcrumb}</p>

        {/* Sidebar trigger */}
        <button
          type="button"
          onClick={onSidebarOpen}
          className="flex items-center gap-[6px] bg-white rounded-full border border-border pl-3 shadow-[0px_3px_30px_0_#D3D3D3] hover:bg-gray-50 active:scale-[0.97] transition-all focus-visible:outline-2 focus-visible:outline-blue/50"
          aria-label="Open sidebar"
          aria-haspopup="true"
        >
          <Menu size={26} />
          <div className="bg-dark-accent p-3 rounded-full text-white overflow-hidden w-[52px] h-[52px] flex items-center justify-center">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt="User avatar"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <UserRound size={26} />
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
