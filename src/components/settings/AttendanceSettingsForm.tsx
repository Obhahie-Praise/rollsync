"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { SettingsSection, SettingsDivider } from "@/components/settings/SettingsSection";
import { SettingsSaveBar } from "@/components/settings/SettingsSaveBar";
import { updateAttendanceSettings } from "@/lib/settings-actions";

interface AttendanceFormProps {
  orgSlug: string;
  initialMethods: string[];
  canEdit: boolean;
}

const METHOD_OPTIONS = [
  {
    value: "qr",
    label: "QR Code",
    description: "Attendees scan a QR code to mark themselves present.",
  },
  {
    value: "roll-call",
    label: "Roll Call",
    description: "Organizer calls names or marks attendees manually.",
  },
  {
    value: "id-scan",
    label: "ID Scan",
    description: "Attendees scan their ID card or badge.",
  },
  {
    value: "mobile",
    label: "Mobile Check-in",
    description: "Attendees check in via the Roll SYNC mobile app.",
  },
  {
    value: "api",
    label: "API / Integration",
    description: "Attendance submitted through the Roll SYNC API or SDK.",
  },
];

function MethodToggle({
  method,
  checked,
  onChange,
  disabled,
}: {
  method: { value: string; label: string; description: string };
  checked: boolean;
  onChange: (val: string, on: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label
      className={[
        "flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer",
        checked
          ? "border-blue/30 bg-blue/5"
          : "border-black/8 bg-white/40 hover:bg-white/60",
        disabled ? "opacity-60 cursor-default" : "",
      ].join(" ")}
    >
      <div className="pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(method.value, e.target.checked)}
          className="w-4 h-4 rounded accent-blue"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium">{method.label}</p>
        <p className="text-[13px] text-text-accent mt-0.5">{method.description}</p>
      </div>
    </label>
  );
}

export function AttendanceSettingsForm({
  orgSlug,
  initialMethods,
  canEdit,
}: AttendanceFormProps) {
  const router = useRouter();
  const [methods, setMethods] = useState<string[]>(initialMethods);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isDirty =
    JSON.stringify([...methods].sort()) !==
    JSON.stringify([...initialMethods].sort());

  const toggleMethod = (val: string, on: boolean) => {
    setMethods((prev) =>
      on ? [...prev, val] : prev.filter((m) => m !== val)
    );
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSubmitError("");
    setSaving(true);

    const result = await updateAttendanceSettings({
      slug: orgSlug,
      attendanceMethods: methods,
    });

    setSaving(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDiscard = () => {
    setMethods(initialMethods);
    setSubmitError("");
  };

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Attendance methods"
        description="Choose which methods your organization uses to collect attendance. You can enable multiple methods."
      >
        <div className="space-y-2">
          {METHOD_OPTIONS.map((m) => (
            <MethodToggle
              key={m.value}
              method={m}
              checked={methods.includes(m.value)}
              onChange={toggleMethod}
              disabled={!canEdit || saving}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsDivider />

      <SettingsSection
        title="Mobile & offline"
        description="The Roll SYNC mobile app allows attendees to check in even without an internet connection. Check-ins sync automatically when connectivity is restored."
      >
        <div className="p-4 rounded-xl bg-white/40 border border-black/8">
          <p className="text-[14px] font-medium">Offline check-in</p>
          <p className="text-[13px] text-text-accent mt-1">
            When the mobile method is enabled above, attendees can check in
            offline. Their attendance is stored locally and synced when
            connectivity returns.
          </p>
          <p className="text-[12px] text-blue mt-2 font-medium">
            {methods.includes("mobile")
              ? "✓ Enabled via Mobile Check-in"
              : "Enable Mobile Check-in above to allow offline attendance."}
          </p>
        </div>
      </SettingsSection>

      {!canEdit && (
        <p className="text-[13px] text-text-accent bg-accent/50 rounded-xl px-4 py-3">
          You need Admin or Owner access to edit attendance settings.
        </p>
      )}

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
