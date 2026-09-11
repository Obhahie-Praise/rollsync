interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A labelled settings section. Provides consistent spacing and
 * optional title/description above the content area.
 */
export function SettingsSection({
  title,
  description,
  children,
  className = "",
}: SettingsSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div className="space-y-0.5">
          {title && (
            <h3 className="text-[24px] font-medium text-foreground">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-[16px] text-text-accent">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

/**
 * A single settings row: label on the left, control on the right.
 * Stacks vertically on mobile.
 */
export function SettingsRow({
  label,
  description,
  children,
  htmlFor,
}: SettingsRowProps) {
  const LabelEl = htmlFor ? "label" : "div";
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
      <LabelEl
        htmlFor={htmlFor}
        className="sm:w-[200px] shrink-0 pt-2"
      >
        <p className="text-[20px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-[16px] text-text-accent mt-1">{description}</p>
        )}
      </LabelEl>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface SettingsDividerProps {
  className?: string;
}

export function SettingsDivider({ className = "" }: SettingsDividerProps) {
  return <hr className={`border-black/6 ${className}`} />;
}
