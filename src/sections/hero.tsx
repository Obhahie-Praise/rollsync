"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AuthModal, type AuthMode } from "@/components/auth/auth-modal";

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

function FadeUp({ children, delay = 0, className }: FadeUpProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-up");

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <section className="hero-section min-h-screen flex flex-col pt-[80px]">
        {/* Content */}
        <div className="flex-1 flex flex-col justify-center px-5 sm:px-8 lg:px-10 pt-12 pb-0">

          {/* Headline */}
          <FadeUp delay={0.1}>
            <h1 className="display-font text-[52px] sm:text-[68px] lg:text-[80px] xl:text-[96px] font- text-white leading-[1.0] tracking-tight max-w-4xl">
              Attendance Infrastructure{" "}
              <br />
              built for schools
            </h1>
          </FadeUp>

          {/* Supporting text + CTAs row */}
          <div className="mt-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 max-w-5xl">
            <FadeUp delay={0.2} className="max-w-md">
              <p className="text-[17px] sm:text-[19px] text-white/55 font-normal leading-relaxed">
                Roll SYNC connects your people, classes, timetable, and attendance
                into one synchronized system. Built for schools, organizations, and
                events.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => openAuth("sign-up")}
                  className="group flex items-center gap-2 bg-[#0d34db] hover:bg-[#1a43e8] text-white px-6 py-3.5 rounded-full text-[15px] font-semibold transition-all duration-200 hover:shadow-[0_0_24px_rgba(13,52,219,0.45)]"
                >
                  Get started free
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </button>
                <button
                  onClick={() => openAuth("sign-in")}
                  className="text-[15px] font-medium text-white/50 hover:text-white/90 transition-colors px-2 py-3.5"
                >
                  Sign in
                </button>
              </div>
            </FadeUp>
          </div>
        </div>

        {/* Bottom fade-out so hero blends into the next section */}
        <div
          aria-hidden
          className="h-50 bg-linear-to-b from-transparent to-white pointer-events-none"
        />
      </section>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
