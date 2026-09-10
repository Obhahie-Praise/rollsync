"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
}

interface Shortcut {
  key: string;
  display: string;
  label: string;
  action: () => void;
}

export default function SearchModal({ isOpen, onClose, slug }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Slight delay so animation doesn't fight with focus
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const shortcuts: Shortcut[] = [
    {
      key: "b",
      display: "B",
      label: "Toggle sidebar",
      action: () => { /* sidebar toggled by the global handler in WorkspaceShell */ onClose(); },
    },
    {
      key: "l",
      display: "L",
      label: "Attendance record",
      action: () => { router.push(`/${slug}/attendance/record`); onClose(); },
    },
    {
      key: "j",
      display: "J",
      label: "Attendance session",
      action: () => { router.push(`/${slug}/attendance/session`); onClose(); },
    },
    {
      key: "y",
      display: "Y",
      label: "Add people",
      action: () => { router.push(`/${slug}/people`); onClose(); },
    },
  ];

  // Keyboard: Escape closes; shortcut keys navigate
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Don't fire shortcuts while user is typing in input
      if (document.activeElement === inputRef.current) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const match = shortcuts.find((s) => s.key === e.key.toLowerCase());
      if (match) {
        e.preventDefault();
        match.action();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, slug]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-[520px] bg-background rounded-[24px] shadow-[0px_8px_40px_0_rgba(0,0,0,0.15)] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            {/* Search input row */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-accent">
              <Search size={18} className="text-text-accent shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search…"
                className="flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:text-placeholder"
              />
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-text-accent hover:bg-accent transition-colors"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick links */}
            <div className="px-5 py-4">
              <p className="text-[12px] font-semibold text-text-accent uppercase tracking-wider mb-3">
                Quick links
              </p>
              <div className="space-y-1">
                {shortcuts.map((s) => (
                  <button
                    key={s.key}
                    onClick={s.action}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-accent transition-colors group"
                  >
                    <span className="text-[15px] font-medium">{s.label}</span>
                    <kbd className="flex items-center gap-1 text-[12px] font-medium text-text-accent bg-accent group-hover:bg-background px-2 py-0.5 rounded-md transition-colors">
                      <span className="text-[11px]">⌘</span>
                      {s.display}
                    </kbd>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
