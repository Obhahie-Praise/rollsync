"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ImagePlus, RefreshCw, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createOrganization } from "@/lib/org-actions";
import { useUploadThing } from "@/lib/uploadthing-client";
import { slugify } from "@/lib/slug-client";
import { getTerminology } from "@/lib/onboarding-types";
import type { EntityType } from "@/lib/onboarding-types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: "SCHOOL", label: "School" },
  { value: "ORGANIZATION", label: "Organization" },
  { value: "EVENT", label: "Event" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewOrgPage() {
  const router = useRouter();

  // Form state
  const [entityType, setEntityType] = useState<EntityType>("SCHOOL");
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [logoHovered, setLogoHovered] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const terms = getTerminology(entityType);
  const slug = slugify(name);

  // ── UploadThing hook ────────────────────────────────────────────────────────
  const { startUpload, isUploading } = useUploadThing("orgLogo", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url ?? null;
      if (url) {
        setLogoUrl(url);
        setLogoError("");
      }
    },
    onUploadError: (err) => {
      setLogoError(err.message ?? "Upload failed. Please try again.");
    },
  });

  // ── Logo file selection ─────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
      setLogoUrl(null); // clear old URL until upload finishes
      setLogoError("");

      await startUpload([file]);

      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [startUpload],
  );

  const openFilePicker = () => fileInputRef.current?.click();

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateName = (val: string): boolean => {
    const v = val.trim();
    if (!v) {
      setNameError(`${terms.nameLabel} is required.`);
      return false;
    }
    if (v.length < 2) {
      setNameError("Name must be at least 2 characters.");
      return false;
    }
    if (v.length > 100) {
      setNameError("Name must be 100 characters or fewer.");
      return false;
    }
    if (!slugify(v)) {
      setNameError("Name must contain at least one letter or number.");
      return false;
    }
    setNameError("");
    return true;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateName(name)) return;
    if (isUploading) return; // logo still uploading
    setSubmitError("");
    setSubmitting(true);

    const result = await createOrganization({
      name: name.trim(),
      type: entityType,
      logoUrl: logoUrl ?? null,
    });

    setSubmitting(false);

    if (!result.ok) {
      if (result.field === "name") {
        setNameError(result.error);
      } else {
        setSubmitError(result.error);
      }
      return;
    }

    router.push(`/${result.slug}/overview`);
  };

  // ── Cancel: go back or to root ──────────────────────────────────────────────
  const handleCancel = () => {
    router.back();
  };

  const isDisabled = submitting || isUploading;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#eef4ff] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-10 py-8">
        <Link
          href="/"
          className="logo-font text-[28px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] hover:opacity-80 transition-opacity"
        >
          Roll SYNC
        </Link>
        <span className="text-[24px] font-medium">New</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-[700px] space-y-8">
          {/* Heading */}
          <h1 className="text-[64px] font-medium text-center tracking-tight text-nowrap">
            Create new organization
          </h1>

          {/* Form */}
          <div className="space-y-6 w-full">
            {/* ── Logo upload ────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isDisabled}
              />

              {logoPreview ? (
                /* Preview with hover overlay */
                <button
                  type="button"
                  onClick={openFilePicker}
                  onMouseEnter={() => setLogoHovered(true)}
                  onMouseLeave={() => setLogoHovered(false)}
                  disabled={isDisabled}
                  className="relative w-[80px] h-[80px] rounded-2xl overflow-hidden focus-visible:outline-2 focus-visible:outline-blue/50 disabled:opacity-60"
                  aria-label="Change logo"
                >
                  <Image
                    src={logoPreview}
                    alt="Organization logo preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <AnimatePresence>
                    {(logoHovered || isUploading) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-black/45 flex items-center justify-center"
                      >
                        {isUploading ? (
                          <Loader2
                            size={20}
                            className="text-white animate-spin"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <RefreshCw size={18} className="text-white" />
                            <span className="text-white text-[11px] font-medium">
                              Change
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              ) : (
                /* Empty state */
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={isDisabled}
                  className="w-[80px] h-[80px] rounded-2xl bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-blue/40 hover:bg-blue/5 transition-colors focus-visible:outline-2 focus-visible:outline-blue/50 disabled:opacity-60 group"
                  aria-label="Add organization logo"
                >
                  {isUploading ? (
                    <Loader2 size={20} className="text-gray-400 animate-spin" />
                  ) : (
                    <ImagePlus
                      size={22}
                      className="text-gray-400 group-hover:text-blue/60 transition-colors"
                    />
                  )}
                </button>
              )}

              <p className="text-[12px] text-gray-400">
                {isUploading ? "Uploading…" : "Logo · Optional"}
              </p>

              <AnimatePresence>
                {logoError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-red-500 text-[12px] text-center"
                    role="alert"
                  >
                    {logoError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Type selector ──────────────────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-[24px] font-medium text-foreground/80 pb-1">
                What are you creating?
              </p>
              <div className="flex gap-2">
                {ENTITY_TYPES.map((t) => {
                  const active = entityType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setEntityType(t.value)}
                      disabled={isDisabled}
                      className={[
                        "px-[24px] py-[12px] rounded-full text-[20px] font-medium transition-all duration-150 outline-none",
                        "focus-visible:ring-2 focus-visible:ring-blue/50",
                        active
                          ? "bg-[#0d34db] text-white shadow-sm"
                          : "bg-accent text-foreground hover:bg-gray-100 active:scale-[0.97]",
                      ].join(" ")}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Name ───────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <label
                htmlFor="org-name"
                className="text-[24px] font-medium text-foreground/80"
              >
                {terms.nameLabel}
              </label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) validateName(e.target.value);
                }}
                onBlur={() => validateName(name)}
                disabled={isDisabled}
                placeholder={terms.namePlaceholder}
                maxLength={100}
                className={[
                  "w-full bg-input rounded-full px-5 py-3 text-[20px] font-medium mt-2",
                  "outline-none focus:ring-2 focus:ring-[#0d34db]/30 transition-all",
                  "placeholder:text-gray-400 disabled:opacity-60",
                  nameError ? "ring-2 ring-red-300" : "",
                ].join(" ")}
              />
              <AnimatePresence>
                {nameError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-red-500 text-[13px] pl-2"
                    role="alert"
                  >
                    {nameError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Workspace URL preview ───────────────────────────────────── */}
            <div className="space-y-1">
              <label className="text-[24px] font-medium text-foreground/80">
                Your workspace
              </label>
              <div className="w-full bg-input rounded-full px-[24px] py-[12px] text-[20px] text-gray-400 mt-2">
                {slug
                  ? `rollsync.vercel.app/${slug}`
                  : "rollsync.vercel.app/your-workspace"}
              </div>
            </div>

            {/* ── Submit error ────────────────────────────────────────────── */}
            <AnimatePresence>
              {submitError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-red-500 text-[13px] text-center"
                  role="alert"
                >
                  {submitError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* ── Actions ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isDisabled}
                className="px-5 py-3 rounded-full bg-gray-200 text-foreground text-[14px] font-medium hover:bg-gray-300 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isDisabled}
                className="flex items-center gap-1.5 px-5 py-3 rounded-full bg-[#0d34db] text-white text-[14px] font-medium hover:bg-[#0b2bb5] active:scale-[0.97] transition-all disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    Create organization
                    <ChevronRight size={15} strokeWidth={2} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
