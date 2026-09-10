"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";

interface SettingsSaveBarProps {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}

/**
 * Sticky save bar that appears when the form has unsaved changes.
 * Matches the light-blue Roll SYNC design language.
 */
export function SettingsSaveBar({
  dirty,
  saving,
  saved,
  onSave,
  onDiscard,
}: SettingsSaveBarProps) {
  const visible = dirty || saving || saved;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex items-center justify-between gap-4 mt-6 px-5 py-3 bg-white rounded-2xl shadow-[0px_2px_20px_0_rgba(0,0,0,0.10)] border border-black/5"
        >
          <p className="text-[14px] font-medium text-text-accent">
            {saved ? "Changes saved" : "You have unsaved changes"}
          </p>
          <div className="flex items-center gap-2">
            {!saved && onDiscard && (
              <button
                type="button"
                onClick={onDiscard}
                disabled={saving}
                className="px-4 py-2 rounded-full text-[13px] font-medium bg-accent hover:bg-accent/70 transition-colors disabled:opacity-50"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saved}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <Check size={14} />
                  Saved
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
