"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsSection, SettingsDivider } from "@/components/settings/SettingsSection";
import {
  updateNotificationPref,
  type NotificationPrefs,
} from "@/lib/notification-actions";

// ─── Toggle component ─────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  saving: boolean;
  saved: boolean;
  error: string;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  saving,
  saved,
  error,
}: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-[13px] text-text-accent mt-0.5">{description}</p>
        )}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-500 text-[12px] mt-1"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        {/* Status indicator */}
        <AnimatePresence mode="wait">
          {saving && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Loader2 size={13} className="text-text-accent animate-spin" />
            </motion.div>
          )}
          {saved && !saving && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Check size={13} className="text-blue" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          disabled={saving}
          className={[
            "relative w-[42px] h-[24px] rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-blue/50 disabled:opacity-60",
            checked ? "bg-blue" : "bg-black/15",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200",
              checked ? "translate-x-[21px]" : "translate-x-[3px]",
            ].join(" ")}
          />
          <span className="sr-only">{checked ? "Enabled" : "Disabled"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface NotificationsFormProps {
  initialPrefs: NotificationPrefs;
}

type FieldKey = keyof NotificationPrefs;

interface FieldState {
  saving: boolean;
  saved: boolean;
  error: string;
}

export function NotificationsForm({ initialPrefs }: NotificationsFormProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [fieldStates, setFieldStates] = useState<Record<FieldKey, FieldState>>(
    () => {
      const init: Partial<Record<FieldKey, FieldState>> = {};
      for (const k of Object.keys(initialPrefs) as FieldKey[]) {
        init[k] = { saving: false, saved: false, error: "" };
      }
      return init as Record<FieldKey, FieldState>;
    }
  );
  const [, startTransition] = useTransition();

  const handleToggle = (field: FieldKey, value: boolean) => {
    // Optimistic update
    setPrefs((prev) => ({ ...prev, [field]: value }));
    setFieldStates((prev) => ({
      ...prev,
      [field]: { saving: true, saved: false, error: "" },
    }));

    startTransition(async () => {
      const result = await updateNotificationPref(field, value);

      if (!result.ok) {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [field]: !value }));
        setFieldStates((prev) => ({
          ...prev,
          [field]: { saving: false, saved: false, error: result.error },
        }));
        return;
      }

      setFieldStates((prev) => ({
        ...prev,
        [field]: { saving: false, saved: true, error: "" },
      }));

      // Clear "saved" check after 2.5s
      setTimeout(() => {
        setFieldStates((prev) => ({
          ...prev,
          [field]: { ...prev[field], saved: false },
        }));
      }, 2500);
    });
  };

  const EMAIL_PREFS: Array<{
    field: FieldKey;
    label: string;
    description: string;
  }> = [
    {
      field: "emailAttendanceSummary",
      label: "Attendance summaries",
      description:
        "Receive periodic email summaries of attendance activity in your organizations.",
    },
    {
      field: "emailOrgInvitations",
      label: "Organization invitations",
      description:
        "Get notified by email when you're invited to join an organization.",
    },
    {
      field: "emailSecurityAlerts",
      label: "Security alerts",
      description:
        "Important emails about new sign-ins, password changes, and suspicious activity.",
    },
    {
      field: "emailAccountUpdates",
      label: "Account updates",
      description:
        "Notifications about changes to your Roll SYNC account.",
    },
    {
      field: "emailProductUpdates",
      label: "Product updates",
      description:
        "Occasional emails about new Roll SYNC features and improvements.",
    },
  ];

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Email notifications"
        description="Control which emails Roll SYNC sends to your account address."
      >
        <div className="divide-y divide-black/6">
          {EMAIL_PREFS.map(({ field, label, description }) => (
            <ToggleRow
              key={field}
              label={label}
              description={description}
              checked={prefs[field]}
              onChange={(val) => handleToggle(field, val)}
              saving={fieldStates[field].saving}
              saved={fieldStates[field].saved}
              error={fieldStates[field].error}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsDivider />

      <SettingsSection
        title="In-app notifications"
        description="In-app notification preferences will be available in a future update."
      >
        <div className="p-4 rounded-xl bg-white/40 border border-black/8">
          <p className="text-[14px] text-text-accent">
            In-app notifications are coming soon. You&apos;ll be able to control
            which events appear in your notification feed.
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}
