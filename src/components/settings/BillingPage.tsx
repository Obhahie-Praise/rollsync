"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Loader2, AlertTriangle, CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import {
  SettingsSection,
  SettingsDivider,
} from "@/components/settings/SettingsSection";
import { createManagePortalSession } from "@/lib/billing-actions";
import type { BillingSubscription } from "@/lib/billing-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function intervalLabel(interval: string): string {
  switch (interval) {
    case "month":
      return "/ month";
    case "year":
      return "/ year";
    case "week":
      return "/ week";
    default:
      return `/ ${interval}`;
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ subscription }: { subscription: BillingSubscription }) {
  const { status, cancelAtPeriodEnd } = subscription;

  if (status === "trialing") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-blue/10 text-blue">
        <Clock size={11} />
        Trial
      </span>
    );
  }

  if (status === "past_due") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-red-100 text-red-600">
        <AlertTriangle size={11} />
        Past due
      </span>
    );
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-accent text-text-accent">
        <XCircle size={11} />
        Cancelled
      </span>
    );
  }

  if (cancelAtPeriodEnd) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-orange-50 text-orange-600">
        <Clock size={11} />
        Cancelling
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-green-accent text-green">
        <CheckCircle size={11} />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-accent text-text-accent capitalize">
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Manage plan button ───────────────────────────────────────────────────────

function ManagePlanButton({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleManage = () => {
    if (!canManage) return;
    setError("");
    startTransition(async () => {
      const result = await createManagePortalSession(slug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.url;
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleManage}
        disabled={isPending || !canManage}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Opening portal…
          </>
        ) : (
          <>
            <ExternalLink size={14} />
            Manage plan
          </>
        )}
      </button>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-500 text-[12px]"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BillingPageProps {
  slug: string;
  subscription: BillingSubscription | null;
  canManage: boolean;
}

export function BillingPage({ slug, subscription, canManage }: BillingPageProps) {
  if (!subscription) {
    return (
      <div className="space-y-8">
        <SettingsSection
          title="Plan"
          description="Your organization is currently on the Free plan."
        >
          {/* Free plan card */}
          <div className="rounded-2xl bg-white/60 border border-black/8 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[20px] font-semibold text-foreground">Free</p>
                <p className="text-[16px] text-text-accent mt-0.5">
                  Basic attendance for getting started
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[16px] font-medium bg-accent text-text-accent shrink-0">
                Current plan
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                "Basic attendance",
                "QR & roll call",
                "Basic participants",
                "Limited reporting",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-[13px] text-text-accent"
                >
                  <CheckCircle size={13} className="text-green shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </SettingsSection>

        <SettingsDivider />

        {/* Upgrade section */}
        <SettingsSection
          title="Upgrade"
          description="Unlock offline sync, advanced analytics, API access, and more."
        >
          <div className="grid sm:grid-cols-3 gap-3">
            {(
              [
                {
                  name: "Plus",
                  description: "For growing organizations",
                  features: ["Offline sync", "Full mobile", "Advanced admin", "Higher limits"],
                },
                {
                  name: "Pro",
                  description: "For larger organizations",
                  features: ["Everything in Plus", "API access", "SDK access", "Priority support"],
                },
                {
                  name: "Ultra",
                  description: "For high-scale needs",
                  features: ["Everything in Pro", "Custom integrations", "Automation", "Analytics"],
                },
              ] as const
            ).map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl bg-white/60 border border-black/8 p-4 space-y-3"
              >
                <div>
                  <p className="text-[20px] font-semibold">{plan.name}</p>
                  <p className="text-[16px] text-text-accent mt-0.5">
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-1.5 text-[16px] text-text-accent"
                    >
                      <CheckCircle size={15} className="text-green shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {canManage && (
            <div className="pt-2">
              <a
                href="https://rollsync.app/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-[24px] py-[12px] rounded-full text-[14px] font-medium bg-blue text-white hover:bg-blue/90 active:scale-[0.97] transition-all"
              >
                <ExternalLink size={14} />
                View plans
              </a>
            </div>
          )}

          {!canManage && (
            <p className="text-[13px] text-text-accent bg-accent/50 rounded-xl px-4 py-3">
              Contact your organization owner to upgrade.
            </p>
          )}
        </SettingsSection>
      </div>
    );
  }

  // Has a subscription
  const isPastDue = subscription.status === "past_due";
  const isCancelled =
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired";

  return (
    <div className="space-y-8">
      {/* Past due warning */}
      <AnimatePresence>
        {isPastDue && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700"
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="text-[13px]">
              Your payment is past due. Please update your billing information to avoid service interruption.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current plan */}
      <SettingsSection title="Plan">
        <div className="rounded-2xl bg-white/60 border border-black/8 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[20px] font-semibold text-foreground">
                {subscription.productName}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[17px] font-semibold">
                  {formatAmount(subscription.amount, subscription.currency)}
                </span>
                <span className="text-[14px] text-text-accent">
                  {intervalLabel(subscription.recurringInterval)}
                </span>
              </div>
            </div>
            <StatusBadge subscription={subscription} />
          </div>

          <SettingsDivider />

          <div className="space-y-2">
            {/* Trial period */}
            {subscription.status === "trialing" && subscription.trialEnd && (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text-accent">Trial ends</span>
                <span className="font-medium">
                  {formatDate(subscription.trialEnd)}
                </span>
              </div>
            )}

            {/* Cancellation notice */}
            {subscription.cancelAtPeriodEnd && !isCancelled && (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text-accent">Subscription ends</span>
                <span className="font-medium text-orange-600">
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            )}

            {/* Normal renewal */}
            {!subscription.cancelAtPeriodEnd &&
              !isCancelled &&
              subscription.status !== "trialing" && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text-accent">Next renewal</span>
                  <span className="font-medium">
                    {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
              )}
          </div>

          {/* Cancelling notice */}
          {subscription.cancelAtPeriodEnd && !isCancelled && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-700 text-[12px]">
              <Clock size={13} className="shrink-0 mt-0.5" />
              Your subscription will remain active until{" "}
              {formatDate(subscription.currentPeriodEnd)}, then cancel automatically.
            </div>
          )}

          {/* Cancelled notice */}
          {isCancelled && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-accent text-text-accent text-[12px]">
              <XCircle size={13} className="shrink-0 mt-0.5" />
              This subscription has been cancelled.
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Manage */}
      <SettingsSection
        title="Manage subscription"
        description="Update payment method, download invoices, or cancel your plan."
      >
        {canManage ? (
          <ManagePlanButton slug={slug} canManage={canManage} />
        ) : (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-accent/50 border border-black/5">
            <CreditCard size={16} className="shrink-0 text-text-accent mt-0.5" />
            <p className="text-[13px] text-text-accent">
              Contact your organization owner to manage the subscription.
            </p>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
