import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOnboardingRedirect } from "@/lib/onboarding-actions";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth guard: unauthenticated users go back to landing page
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  // If the user has already finished onboarding, send them to their dashboard.
  // getOnboardingRedirect returns null for a fresh user (let them proceed),
  // or a path string for completed / in-progress users.
  // We only redirect here for the completed case — step-level redirects are
  // handled per-page in the client components.
  const destination = await getOnboardingRedirect();
  if (destination && destination.includes("/overview")) {
    // Already completed onboarding — go straight to dashboard
    redirect(destination);
  }

  return <>{children}</>;
}
