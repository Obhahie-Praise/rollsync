"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthModal, AuthMode } from "@/components/auth/auth-modal";

const Navbar = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-up");

  const openAuthModal = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <nav className="flex items-center justify-between px-4 sm:px-8 lg:px-10 py-4 sm:py-5">
        {/* Logo */}
        <h1 className="logo-font text-[30px] sm:text-[36px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] shrink-0">
          Roll SYNC
        </h1>

        {/* Nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-[16px] font-medium hover:text-gray-600 transition-colors">
            Product
          </Link>
          <Link href="/" className="text-[16px] font-medium hover:text-gray-600 transition-colors">
            Solution
          </Link>
          <Link href="/" className="text-[16px] font-medium hover:text-gray-600 transition-colors">
            Pricing
          </Link>
          <Link href="/" className="text-[16px] font-medium hover:text-gray-600 transition-colors">
            Developers
          </Link>
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAuthModal("sign-in")}
            className="px-3 sm:px-4 py-2 rounded-full text-[14px] sm:text-[15px] font-medium hover:bg-gray-100 transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={() => openAuthModal("sign-up")}
            className="bg-[#0d34db] hover:bg-[#0b2bb5] transition-colors text-white px-3 sm:px-4 py-2 rounded-full text-[14px] sm:text-[15px] font-semibold"
          >
            Get started
          </button>
        </div>
      </nav>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
};

export default Navbar;
