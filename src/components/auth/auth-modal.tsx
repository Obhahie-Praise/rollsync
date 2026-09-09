"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthForm } from "./auth-form";
import { X } from "lucide-react";

export type AuthMode = "sign-up" | "sign-in";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export function AuthModal({ isOpen, onClose, initialMode = "sign-up" }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, initialMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-[460px] bg-[#f4f7fc] rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={onClose}
              className="absolute right-5 top-5 p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-200/50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="px-8 sm:px-10 py-10 flex flex-col">
              <div className="mb-8">
                <h2 className="logo-font text-[36px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-3 leading-none">
                  Roll SYNC
                </h2>
                <h3 className="text-[22px] font-medium text-gray-900 tracking-tight">
                  {mode === "sign-up" ? "Attendance without friction" : "Welcome back"}
                </h3>
              </div>

              <AuthForm mode={mode} setMode={setMode} />
              
              <div className="mt-8 text-center">
                <p className="text-[13px] text-gray-500 font-medium">
                  By using Roll SYNC, you agree to our{" "}
                  <a href="#" className="text-gray-900 underline hover:no-underline">Terms of Service</a> &{" "}
                  <a href="#" className="text-gray-900 underline hover:no-underline">Privacy</a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
