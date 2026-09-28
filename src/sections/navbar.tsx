"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AuthModal, type AuthMode } from "@/components/auth/auth-modal";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Use cases", href: "#use-cases" },
];

const Navbar = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-up");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const openAuthModal = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Navbar bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-[#08090d]/80 backdrop-blur-md border-b border-white/5"
            : "bg-transparent"
        }`}
      >
        <nav className="flex items-center justify-between px-5 sm:px-8 lg:px-10 py-4">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <span className="logo-font text-[26px] sm:text-[30px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0d34db]">
              Roll SYNC
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[14px] font-medium text-white/60 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => openAuthModal("sign-in")}
              className="px-4 py-2 rounded-full text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/8 transition-all"
            >
              Sign in
            </button>
            <button
              onClick={() => openAuthModal("sign-up")}
              className="bg-[#0d34db] hover:bg-[#1a43e8] transition-colors text-white px-5 py-2 rounded-full text-[14px] font-semibold"
            >
              Get started
            </button>
          </div>

          {/* Mobile: get started + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => openAuthModal("sign-up")}
              className="bg-[#0d34db] hover:bg-[#1a43e8] transition-colors text-white px-4 py-2 rounded-full text-[13px] font-semibold"
            >
              Get started
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 text-white/70 hover:text-white transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden bg-[#0a0b10]/95 backdrop-blur-md border-t border-white/5 md:hidden"
            >
              <div className="px-5 py-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-[15px] font-medium text-white/70 hover:text-white py-3 border-b border-white/5 transition-colors last:border-0"
                  >
                    {link.label}
                  </a>
                ))}
                <button
                  onClick={() => openAuthModal("sign-in")}
                  className="text-left text-[15px] font-medium text-white/70 hover:text-white py-3 transition-colors"
                >
                  Sign in
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
};

export default Navbar;
