"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { saveOnboardingProgress } from "@/lib/onboarding-actions";
import { getTerminology } from "@/lib/onboarding-types";
import type { AttendanceMethod, EntityType, OnboardingData } from "@/lib/onboarding-types";

const STORAGE_KEY = "rollsync_onboarding";

const METHODS: { value: AttendanceMethod; label: string }[] = [
  { value: "MOBILE", label: "Mobile" },
  { value: "WEB", label: "Web" },
  { value: "QR_CODE", label: "QR code" },
  { value: "API", label: "API" },
];

function readStored(): OnboardingData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingData) : {};
  } catch {
    return {};
  }
}

export default function OnboardingThreePage() {
  const router = useRouter();

  const [entityType] = useState<EntityType | undefined>(() => readStored().entityType);
  const [selected, setSelected] = useState<Set<AttendanceMethod>>(
    () => new Set(readStored().attendanceMethods ?? [])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const terms = getTerminology(entityType);

  const toggle = (method: AttendanceMethod) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(method)) {
        next.delete(method);
      } else {
        next.add(method);
      }
      return next;
    });
    setError("");
  };

  const handleNext = async () => {
    if (selected.size === 0) {
      setError("Please select at least one attendance method.");
      return;
    }
    setError("");
    setSaving(true);

    const methods = Array.from(selected);

    // Build the full data snapshot for server persistence
    let fullData: OnboardingData = { attendanceMethods: methods };
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      fullData = { ...existing, attendanceMethods: methods };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullData));
    } catch {
      // ignore
    }

    const result = await saveOnboardingProgress(3, fullData);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/onboarding/done");
  };

  const handlePrev = () => {
    router.push("/onboarding/two");
  };

  return (
    <div className="">
      {/* Header: responsive padding (mobile: px-5 py-5, md: px-10 py-10) */}
      <div className="flex items-center justify-between px-5 py-5 md:px-10 md:py-10">
        <h1 className="logo-font text-[32px] md:text-[40px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-6">
          Roll SYNC
        </h1>
        <p className="text-[18px] md:text-[24px]">
          Step 3 <span className="font-medium text-text-accent">of 3</span>
        </p>
      </div>

      {/* Main: reduced top padding on mobile */}
      <div className="w-full pt-12 md:pt-24 lg:pt-40 flex items-center justify-center px-5">
        <div className="space-y-[48px] w-full max-w-[600px]">
          {/* Heading: responsive size */}
          <h2 className="text-[36px] sm:text-[48px] md:text-[56px] lg:text-[64px] font-medium text-center">
            {terms.methodsHeading}
          </h2>

          {/* Methods list: text size stays at 24px but has proper padding */}
          <div className="flex flex-col w-fit mx-auto gap-[24px] text-[20px] sm:text-[24px] font-medium">
            {METHODS.map((method) => {
              const checked = selected.has(method.value);
              return (
                <label
                  key={method.value}
                  className="flex items-center gap-3 cursor-pointer select-none group"
                >
                  <div
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                    onClick={() => toggle(method.value)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") toggle(method.value);
                    }}
                    className={[
                      "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-100 outline-none",
                      "focus-visible:ring-2 focus-visible:ring-blue/60",
                      checked
                        ? "bg-blue border-blue"
                        : "border-gray-400 group-hover:border-blue/60",
                    ].join(" ")}
                  >
                    {checked && (
                      <svg
                        className="w-4 h-4 text-white"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="2 8 6 12 14 4" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={checked ? "text-foreground" : "text-text-accent"}
                    onClick={() => toggle(method.value)}
                  >
                    {method.label}
                  </span>
                </label>
              );
            })}
          </div>

          {error && (
            <p className="text-red-500 text-[16px] text-center" role="alert">
              {error}
            </p>
          )}

          <div className="w-full flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={saving}
              className="flex items-center gap-2 bg-accent rounded-full px-[24px] py-[12px] text-foreground font-medium text-[18px] hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={16} strokeWidth={1.7} />
              <p>Prev</p>
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 bg-blue rounded-full px-[24px] py-[12px] text-white font-medium text-[18px] hover:bg-blue/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <p>Next</p>
                  <ChevronRight size={16} strokeWidth={1.7} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
