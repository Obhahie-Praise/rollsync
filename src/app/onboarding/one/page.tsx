"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { saveOnboardingProgress } from "@/lib/onboarding-actions";
import type { EntityType } from "@/lib/onboarding-types";

const STORAGE_KEY = "rollsync_onboarding";

const purpose: {
  icon: string;
  title: string;
  value: EntityType;
  description: string;
}[] = [
  {
    icon: "/school.svg",
    title: "School",
    value: "SCHOOL",
    description: "Manage students and staff attendance across your school",
  },
  {
    icon: "/org.svg",
    title: "Organization",
    value: "ORGANIZATION",
    description: "Manage people, teams and workplace attendance",
  },
  {
    icon: "/event.svg",
    title: "Event",
    value: "EVENT",
    description: "Manage attendees and event check-ins",
  },
];

function readStoredEntityType(): EntityType | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { entityType?: EntityType };
    return parsed.entityType ?? null;
  } catch {
    return null;
  }
}

export default function OnboardingOnePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<EntityType | null>(readStoredEntityType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleNext = async () => {
    if (!selected) {
      setError("Please select what you are using Roll SYNC for.");
      return;
    }
    setError("");
    setSaving(true);

    // Persist locally
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...existing, entityType: selected })
      );
    } catch {
      // ignore localStorage failures
    }

    // Persist to server
    const result = await saveOnboardingProgress(1, { entityType: selected });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/onboarding/two");
  };

  const handlePrev = () => {
    router.push("/onboarding");
  };

  return (
    <div className="">
      {/* Header — reduced padding on mobile */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-[40px]">
        <h1 className="logo-font text-[40px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-6">
          Roll SYNC
        </h1>
        <p className="text-[18px] sm:text-[24px]">
          Step 1 <span className="font-medium text-text-accent">of 3</span>
        </p>
      </div>

      {/* Main content — reduced top padding on mobile */}
      <div className="w-full pt-10 sm:pt-24 lg:pt-40 flex items-center justify-center px-4 sm:px-8">
        <div className="space-y-[48px] w-full max-w-[1200px]">
          {/* Heading — scales up from mobile to desktop */}
          <h2 className="text-[36px] sm:text-[48px] lg:text-[64px] font-medium text-center">
            What are you using Roll SYNC for?
          </h2>

          {/* Cards — stack vertically on mobile, row on sm+ */}
          <div className="flex flex-col sm:flex-row gap-[16px] sm:gap-[24px]">
            {purpose.map((item) => {
              const isSelected = selected === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setSelected(item.value);
                    setError("");
                  }}
                  className={[
                    "p-5 sm:p-[24px] lg:p-[32px] rounded-[30px] text-left transition-all duration-150 outline-none w-full",
                    "focus-visible:ring-2 focus-visible:ring-blue/60",
                    isSelected
                      ? "bg-[#43A5F5] text-white shadow-md scale-[1.02]"
                      : "bg-accent hover:bg-accent/80 active:scale-[0.98]",
                  ].join(" ")}
                >
                  <div className="space-y-[16px] sm:space-y-[24px]">
                    <div className="flex items-center justify-between">
                      {/* Card title — scales up from mobile to desktop */}
                      <p className="text-[22px] sm:text-[28px] lg:text-[32px] font-medium">
                        {item.title}
                      </p>
                      <Image
                        src={item.icon}
                        alt={item.title}
                        width={30}
                        height={30}
                        className={isSelected ? "brightness-0 invert" : ""}
                      />
                    </div>
                    {/* Description — scales up from mobile to desktop */}
                    <p
                      className={[
                        "text-[15px] sm:text-[18px] lg:text-[24px] font-medium",
                        isSelected ? "text-white/80" : "text-text-accent",
                      ].join(" ")}
                    >
                      {item.description}
                    </p>
                  </div>
                </button>
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
              disabled={saving || !selected}
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
