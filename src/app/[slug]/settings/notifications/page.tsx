import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getNotificationPrefs } from "@/lib/notification-actions";
import { NotificationsForm } from "@/components/settings/NotificationsForm";

export default async function NotificationsSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  const result = await getNotificationPrefs();

  // If we can't load prefs (shouldn't happen for an authenticated user),
  // fall back to defaults rather than crashing the page.
  const prefs = result.ok
    ? result.prefs
    : {
        emailAttendanceSummary: true,
        emailOrgInvitations: true,
        emailSecurityAlerts: true,
        emailAccountUpdates: true,
        emailProductUpdates: false,
      };

  return <NotificationsForm initialPrefs={prefs} />;
}
