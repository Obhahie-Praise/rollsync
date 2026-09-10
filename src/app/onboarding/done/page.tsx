"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { completeOnboarding } from "@/lib/onboarding-actions";
import type { OnboardingData } from "@/lib/onboarding-types";

const STORAGE_KEY = "rollsync_onboarding";

export default function OnboardingDonePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEnter = async () => {
    setLoading(true);
    setError("");

    let data: OnboardingData = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw) as OnboardingData;
    } catch {
      // ignore
    }

    const result = await completeOnboarding(data);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Clear local storage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    router.push(`/${result.slug}/overview`);
  };

  return (
    <div>
      <div className="flex items-center justify-between p-[40px]">
        <h1 className="logo-font text-[40px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-6">
          Roll SYNC
        </h1>
        <p className="text-[24px]">Done</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 pt-20">
        <div className="bg-blue rounded-full p-15">
          <Check size={150} strokeWidth={2} color="#fff" />
        </div>
        <p className="text-[64px] font-medium text-center pt-4">
          All done setting up
        </p>
      </div>

      {error && (
        <p className="text-red-500 text-[16px] text-center mt-6" role="alert">
          {error}
        </p>
      )}

      <div className="">
        <button
          type="button"
          onClick={handleEnter}
          disabled={loading}
          className="flex items-center gap-2 bg-blue rounded-full px-[24px] py-[12px] text-white font-medium text-[18px] w-fit mx-auto mt-[124px] hover:bg-blue/90 transition-colors disabled:opacity-70"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <p>Enter Roll SYNC</p>
          )}
        </button>
      </div>
    </div>
  );
}
