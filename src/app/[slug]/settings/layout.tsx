import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function SettingsLayout({
  children,
  params,
}: SettingsLayoutProps) {
  const { slug } = await params;

  // Server-side guard: teachers are redirected to /teacher/today before any data loads
  await requireAdminAccess(slug);

  return (
    <div className="min-h-screen px-8 sm:px-14 pb-20">
      {/* Mobile: heading + nav stacked above content */}
      <div className="flex flex-col sm:flex-row gap-10 sm:gap-14">
        {/* Left column: heading + nav */}
        <div className="sm:w-[200px] shrink-0">
          <h1 className="text-[40px] font-medium tracking-tight mb-7">
            Settings
          </h1>
          <SettingsSidebar slug={slug} />
        </div>

        {/* Right column: settings content */}
        <main className="flex-1 min-w-0 max-w-[700px] mx-auto pt-16">{children}</main>
      </div>
    </div>
  );
}
