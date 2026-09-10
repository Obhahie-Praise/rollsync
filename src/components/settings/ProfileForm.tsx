"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { UserRound, Loader2, RefreshCw, ImagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { SettingsSection, SettingsRow } from "@/components/settings/SettingsSection";
import { SettingsSaveBar } from "@/components/settings/SettingsSaveBar";
import { updateProfile } from "@/lib/settings-actions";
import { useUploadThing } from "@/lib/uploadthing-client";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [avatarHovered, setAvatarHovered] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dirty tracking
  const isDirty =
    name.trim() !== user.name ||
    avatarUrl !== user.image;

  // ── UploadThing for avatar ──────────────────────────────────────────────
  const { startUpload, isUploading } = useUploadThing("orgLogo", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url ?? null;
      if (url) setAvatarUrl(url);
    },
    onUploadError: (err) => {
      setSubmitError(err.message ?? "Avatar upload failed.");
    },
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
      setAvatarUrl(null);
      await startUpload([file]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [startUpload],
  );

  // ── Validation ──────────────────────────────────────────────────────────
  const validateName = (val: string): boolean => {
    const v = val.trim();
    if (!v) { setNameError("Name is required."); return false; }
    if (v.length < 2) { setNameError("At least 2 characters."); return false; }
    if (v.length > 100) { setNameError("100 characters or fewer."); return false; }
    setNameError("");
    return true;
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateName(name)) return;
    if (isUploading) return;
    setSubmitError("");
    setSaving(true);

    const result = await updateProfile({
      name: name.trim(),
      image: avatarUrl,
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
    setName(user.name);
    setAvatarUrl(user.image);
    setAvatarPreview(user.image);
    setNameError("");
    setSubmitError("");
  };

  const isDisabled = saving || isUploading;

  return (
    <div className="space-y-8">
      <SettingsSection title="Profile">
        {/* Avatar row */}
        <SettingsRow label="Photo" description="JPG or PNG, 2 MB max.">
          <div className="flex items-center gap-4">
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
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={() => setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
              disabled={isDisabled}
              className="relative w-[72px] h-[72px] rounded-full overflow-hidden bg-dark-accent text-white flex items-center justify-center focus-visible:outline-2 focus-visible:outline-blue/50 disabled:opacity-60 shrink-0"
              aria-label="Change avatar"
            >
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <UserRound size={30} />
              )}
              <AnimatePresence>
                {(avatarHovered || isUploading) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1"
                  >
                    {isUploading ? (
                      <Loader2 size={18} className="text-white animate-spin" />
                    ) : (
                      <>
                        <RefreshCw size={16} className="text-white" />
                        <span className="text-[10px] font-medium text-white">Change</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {!avatarPreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDisabled}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-black/10 text-[13px] font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                <ImagePlus size={14} />
                Upload photo
              </button>
            )}
          </div>
        </SettingsRow>

        {/* Name row */}
        <SettingsRow label="Full name" htmlFor="profile-name">
          <div className="space-y-1">
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={() => validateName(name)}
              disabled={isDisabled}
              maxLength={100}
              placeholder="Your full name"
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

        {/* Email row (read-only) */}
        <SettingsRow
          label="Email"
          description="Contact support to change your email."
        >
          <div className="w-full bg-accent/50 rounded-xl px-4 py-2.5 text-[15px] text-text-accent border border-black/5">
            {user.email}
          </div>
        </SettingsRow>
      </SettingsSection>

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

      <SettingsSaveBar
        dirty={isDirty}
        saving={saving}
        saved={saved}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
