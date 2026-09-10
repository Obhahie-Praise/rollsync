"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Pencil, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  SettingsSection,
  SettingsRow,
  SettingsDivider,
} from "@/components/settings/SettingsSection";
import { SettingsSaveBar } from "@/components/settings/SettingsSaveBar";
import { updateOrganization } from "@/lib/settings-actions";
import { useUploadThing } from "@/lib/uploadthing-client";

interface OrgFormProps {
  org: {
    id: string;
    name: string;
    slug: string;
    type: string;
    logoUrl: string | null;
    memberCount: number;
  };
  canEdit: boolean;
}

function entityLabel(type: string): string {
  switch (type) {
    case "SCHOOL":
      return "School";
    case "EVENT":
      return "Event";
    default:
      return "Organization";
  }
}

function entityFallbackIcon(type: string): string {
  switch (type) {
    case "SCHOOL":
      return "/school.svg";
    case "EVENT":
      return "/event.svg";
    default:
      return "/org.svg";
  }
}

export function OrgSettingsForm({ org, canEdit }: OrgFormProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(org.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logoUrl);
  const [logoPreview, setLogoPreview] = useState<string | null>(org.logoUrl);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [logoHovered, setLogoHovered] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDirty = name.trim() !== org.name || logoUrl !== org.logoUrl;
  const effectiveLogo = logoPreview ?? entityFallbackIcon(org.type);

  // ── UploadThing ────────────────────────────────────────────────────────
  const { startUpload, isUploading } = useUploadThing("orgLogo", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url ?? null;
      if (url) setLogoUrl(url);
    },
    onUploadError: (err) => {
      setSubmitError(err.message ?? "Logo upload failed.");
    },
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setLogoPreview(preview);
      setLogoUrl(null);
      await startUpload([file]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [startUpload],
  );

  // ── Validation ─────────────────────────────────────────────────────────
  const validateName = (val: string): boolean => {
    const v = val.trim();
    if (!v) {
      setNameError("Name is required.");
      return false;
    }
    if (v.length < 2) {
      setNameError("At least 2 characters.");
      return false;
    }
    if (v.length > 100) {
      setNameError("100 characters or fewer.");
      return false;
    }
    setNameError("");
    return true;
  };

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateName(name)) return;
    if (isUploading) return;
    setSubmitError("");
    setSaving(true);

    const result = await updateOrganization({
      slug: org.slug,
      name: name.trim(),
      logoUrl: logoUrl,
    });

    setSaving(false);

    if (!result.ok) {
      if (result.field === "name") setNameError(result.error);
      else setSubmitError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDiscard = () => {
    setName(org.name);
    setLogoUrl(org.logoUrl);
    setLogoPreview(org.logoUrl);
    setNameError("");
    setSubmitError("");
  };

  const isDisabled = saving || isUploading || !canEdit;

  return (
    <div className="space-y-8">
      {/* ── Org identity header ── matches the screenshot: large logo + name/type/count */}
      <div className="flex items-center gap-6">
        {/* Large org logo — clickable to change */}
        <div className="relative shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isDisabled}
          />
          <button
            type="button"
            onClick={() => canEdit && fileInputRef.current?.click()}
            onMouseEnter={() => canEdit && setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
            disabled={isDisabled}
            className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-accent flex items-center justify-center focus-visible:outline-2 focus-visible:outline-blue/50 disabled:cursor-default"
            aria-label={
              canEdit ? "Change organization logo" : "Organization logo"
            }
          >
            <Image
              src={effectiveLogo}
              alt={org.name}
              fill
              className="object-cover"
              unoptimized={!!logoPreview}
            />
            <AnimatePresence>
              {canEdit && (logoHovered || isUploading) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 rounded-2xl"
                >
                  {isUploading ? (
                    <Loader2 size={22} className="text-white animate-spin" />
                  ) : (
                    <>
                      <RefreshCw size={18} className="text-white" />
                      <span className="text-[11px] font-medium text-white leading-none mt-0.5">
                        Change logo
                      </span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Org identity text */}
        <div className="flex-1 min-w-0">
          <h2 className="text-[26px] font-semibold leading-tight truncate">
            {org.name}
          </h2>
          <p className="text-[15px] text-text-accent mt-1">
            {entityLabel(org.type)}
          </p>
          <p className="text-[15px] text-foreground mt-1">
            {org.memberCount}{" "}
            {org.memberCount === 1 ? "member" : "members"}
          </p>
        </div>

        {/* Edit shortcut — focuses the name field */}
        {canEdit && (
          <button
            type="button"
            onClick={() => document.getElementById("org-name-input")?.focus()}
            className="shrink-0 p-2 rounded-full hover:bg-white/70 transition-colors text-text-accent self-start mt-1"
            aria-label="Edit organization name"
          >
            <Pencil size={18} />
          </button>
        )}
      </div>

      <SettingsDivider />

      {/* ── Workspace URL (prominent, read-only, matches screenshot) ── */}
      <div>
        <p className="text-[15px] font-medium text-text-accent mb-2">
          Your workspace
        </p>
        <div className="w-full bg-accent/60 rounded-full px-5 py-3 text-[15px] text-text-accent border border-black/5 select-all">
          rollsync.vercel.app/{org.slug}
        </div>
      </div>

      <SettingsDivider />

      {/* ── Editable organization details ── */}
      <SettingsSection title="Organization details">
        {/* Name */}
        <SettingsRow label="Name" htmlFor="org-name-input">
          <div className="space-y-1">
            <input
              id="org-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={() => validateName(name)}
              disabled={isDisabled}
              maxLength={100}
              placeholder="Organization name"
              className={[
                "w-full bg-white/60 rounded-xl px-4 py-2.5 text-[15px] font-medium",
                "border border-black/8 outline-none focus:ring-2 focus:ring-blue/30 transition-all",
                "placeholder:text-text-accent/60 disabled:opacity-60",
                nameError ? "ring-2 ring-red-300" : "",
              ].join(" ")}
            />
            <AnimatePresence>
              {nameError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-500 text-[12px] pl-1"
                  role="alert"
                >
                  {nameError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </SettingsRow>

        {/* Workspace URL info row */}
        <SettingsRow
          label="Workspace URL"
          description="The slug cannot be changed after creation."
        >
          <div className="w-full bg-accent/60 rounded-xl px-4 py-2.5 text-[15px] text-text-accent border border-black/5 select-all">
            /{org.slug}
          </div>
        </SettingsRow>
      </SettingsSection>

      {!canEdit && (
        <p className="text-[13px] text-text-accent bg-accent/50 rounded-xl px-4 py-3">
          You need Admin or Owner access to edit organization settings.
        </p>
      )}

      {/* Submit error */}
      <AnimatePresence>
        {submitError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-red-500 text-[13px]"
            role="alert"
          >
            {submitError}
          </motion.p>
        )}
      </AnimatePresence>

      {canEdit && (
        <SettingsSaveBar
          dirty={isDirty}
          saving={saving}
          saved={saved}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}
