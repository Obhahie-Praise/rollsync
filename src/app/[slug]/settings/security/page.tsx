import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSessions } from "@/lib/settings-actions";
import { SecurityPageContent } from "@/components/settings/SecurityForm";

export default async function SecuritySettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  const sessions = await getSessions();

  return <SecurityPageContent sessions={sessions} />;
}
