"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { saveOnboardingProgress } from "@/lib/onboarding-actions";
import { getTerminology } from "@/lib/onboarding-types";
import type { EntityType, OnboardingData } from "@/lib/onboarding-types";

const STORAGE_KEY = "rollsync_onboarding";

function readStored(): OnboardingData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingData) : {};
  } catch {
    return {};
  }
}

export default function OnboardingTwoPage() {
  const router = useRouter();

  const [entityType] = useState<EntityType | undefined>(() => readStored().entityType);
  const [name, setName] = useState<string>(() => readStored().name ?? "");
  const [subtype, setSubtype] = useState<string>(() => readStored().subtype ?? "");
  const [sizeRange, setSizeRange] = useState<string>(() => readStored().sizeRange ?? "");
  const [location, setLocation] = useState<string>(() => readStored().location ?? "");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const terms = getTerminology(entityType);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = `${terms.nameLabel} is required.`;
    } else if (name.trim().length < 2) {
      errs.name = "Name must be at least 2 characters.";
    } else if (name.trim().length > 100) {
      errs.name = "Name must be 100 characters or fewer.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setSaving(true);

    const data: OnboardingData = {
      entityType,
      name: name.trim(),
      subtype: subtype || undefined,
      sizeRange: sizeRange || undefined,
      location: location.trim() || undefined,
    };

    // Persist locally
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...data }));
    } catch {
      // ignore
    }

    const result = await saveOnboardingProgress(2, data);
    setSaving(false);

    if (!result.ok) {
      setErrors({ server: result.error });
      return;
    }

    router.push("/onboarding/three");
  };

  const handlePrev = () => {
    router.push("/onboarding/one");
  };

  const inputClass =
    "bg-input px-[18px] py-[12px] rounded-full text-[18px] font-medium outline-transparent focus:outline transition-all focus:outline-blue";

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <h1 className="logo-font text-[28px] sm:text-[36px] lg:text-[40px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF]">
          Roll SYNC
        </h1>
        <p className="text-base sm:text-[20px] lg:text-[24px]">
          Step 2 <span className="font-medium text-text-accent">of 3</span>
        </p>
      </div>

      {/* Main content */}
      <div className="w-full pt-10 sm:pt-20 lg:pt-32 flex items-center justify-center px-4 sm:px-6">
        <div className="space-y-8 sm:space-y-10 lg:space-y-[48px] w-full max-w-[605px]">
          <h2 className="text-[36px] sm:text-[48px] lg:text-[64px] font-medium text-center">
            {terms.aboutHeading}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-[24px]">
            {/* Name */}
            <label
              htmlFor="entity-name"
              className="text-base sm:text-[20px] lg:text-[24px] font-medium sm:text-end my-auto"
            >
              {terms.nameLabel}:
            </label>
            <div className="flex flex-col gap-1">
              <input
                id="entity-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                }}
                className={[inputClass, errors.name ? "outline-red-400" : ""].join(" ")}
                placeholder={terms.namePlaceholder}
                maxLength={100}
              />
              {errors.name && (
                <p className="text-red-500 text-[13px] pl-2" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Type / subtype */}
            <label
              htmlFor="entity-type"
              className="text-base sm:text-[20px] lg:text-[24px] font-medium sm:text-end my-auto"
            >
              {terms.typeLabel}:
            </label>
            <select
              id="entity-type"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              className={inputClass}
            >
              <option value="">Select type</option>
              {terms.typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Size */}
            <label
              htmlFor="entity-size"
              className="text-base sm:text-[20px] lg:text-[24px] font-medium sm:text-end my-auto"
            >
              {terms.sizeLabel}:
            </label>
            <select
              id="entity-size"
              value={sizeRange}
              onChange={(e) => setSizeRange(e.target.value)}
              className={inputClass}
            >
              <option value="">Select range</option>
              {terms.sizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Location */}
            <label
              htmlFor="location"
              className="text-base sm:text-[20px] lg:text-[24px] font-medium sm:text-end my-auto"
            >
              Location:
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
              placeholder="e.g. Lagos, Nigeria"
              maxLength={100}
            />

            {errors.server && (
              <p className="text-red-500 text-[14px] col-span-full text-right" role="alert">
                {errors.server}
              </p>
            )}
          </div>

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
