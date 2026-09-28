"use client";

import { useState } from "react";
import { Reveal } from "@/components/landing/reveal";
import { ArrowRight } from "lucide-react";
import { AuthModal, type AuthMode } from "@/components/auth/auth-modal";

export default function CtaSection() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-up");

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <section className="section-light py-24 sm:py-32 px-5 sm:px-8 lg:px-10">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="relative rounded-[32px] overflow-hidden bg-[#08090d] px-8 sm:px-14 py-16 sm:py-20 text-center flex flex-col items-center gap-8">
              {/* Background glow */}
              <div
                aria-hidden
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at top, rgba(13,52,219,0.30) 0%, transparent 70%)",
                }}
              />
              {/* Top edge highlight */}
              <div
                aria-hidden
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(120,152,255,0.4), transparent)",
                }}
              />

              <div className="relative flex flex-col items-center gap-6 z-10">
                <p className="eyebrow text-[#7898ff]/70">Get started today</p>
                <h2 className="display-font text-[40px] sm:text-[52px] lg:text-[60px] font-semibold text-white leading-[1.05] tracking-tight">
                  Keep everyone
                  <br />
                  <span className="text-blue-gradient">in sync.</span>
                </h2>
                <p className="text-[16px] sm:text-[17px] text-white/50 leading-relaxed max-w-md">
                  Set up your organization in minutes. Your people, classes,
                  timetable, and attendance — all in one place.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <button
                    onClick={() => openAuth("sign-up")}
                    className="group flex items-center gap-2 bg-[#0d34db] hover:bg-[#1a43e8] text-white px-7 py-3.5 rounded-full text-[15px] font-semibold transition-all duration-200 hover:shadow-[0_0_28px_rgba(13,52,219,0.5)]"
                  >
                    Get started free
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </button>
                  <button
                    onClick={() => openAuth("sign-in")}
                    className="text-[15px] font-medium text-white/40 hover:text-white/80 transition-colors px-4 py-3.5"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
