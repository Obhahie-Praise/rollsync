import { ExternalLink, BookOpen, MessageCircle, Lightbulb } from "lucide-react";
import {
  SettingsSection,
  SettingsDivider,
} from "@/components/settings/SettingsSection";

// ─── Static link card ─────────────────────────────────────────────────────────

interface HelpCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  label: string;
  external?: boolean;
}

function HelpCard({
  icon,
  title,
  description,
  href,
  label,
  external = true,
}: HelpCardProps) {
  return (
    <div className="rounded-2xl bg-white/60 border border-black/8 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-accent/70 flex items-center justify-center text-text-accent">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{title}</p>
          <p className="text-[13px] text-text-accent mt-0.5">{description}</p>
        </div>
      </div>
      <div>
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium bg-accent hover:bg-accent/70 transition-colors"
        >
          {label}
          {external && <ExternalLink size={12} />}
        </a>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function HelpPageContent() {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Documentation"
        description="Learn how to use Roll SYNC and get the most out of your workspace."
      >
        <HelpCard
          icon={<BookOpen size={16} />}
          title="Documentation"
          description="Browse guides, tutorials, and reference documentation for Roll SYNC."
          href="https://rollsync.app/docs"
          label="View documentation"
        />
      </SettingsSection>

      <SettingsDivider />

      <SettingsSection
        title="Contact support"
        description="Get help from the Roll SYNC team."
      >
        <HelpCard
          icon={<MessageCircle size={16} />}
          title="Contact support"
          description="Need help with Roll SYNC? Our team is here for you."
          href="mailto:support@rollsync.app"
          label="Contact support"
          external={false}
        />
      </SettingsSection>

      <SettingsDivider />

      <SettingsSection
        title="Feedback"
        description="Help us make Roll SYNC better."
      >
        <HelpCard
          icon={<Lightbulb size={16} />}
          title="Feedback"
          description="Have an idea, suggestion, or problem? We'd love to hear from you."
          href="mailto:feedback@rollsync.app"
          label="Send feedback"
          external={false}
        />
      </SettingsSection>

      <SettingsDivider />

      {/* About */}
      <div className="px-1">
        <p className="text-[13px] font-medium text-text-accent">
          Roll SYNC
        </p>
        <p className="text-[12px] text-text-accent/60 mt-0.5">Version 0.1.0</p>
      </div>
    </div>
  );
}
