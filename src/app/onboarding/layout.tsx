import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Check if the user already has memberships — if they completed onboarding,
  // route them appropriately instead of letting them go through onboarding again.
  const [progress, memberships] = await Promise.all([
    prisma.onboardingProgress.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.membership.findMany({
      where: { userId: session.user.id },
      select: { organization: { select: { slug: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (memberships.length > 0 && progress?.completed) {
    // Completed onboarding already — route to the right place
    if (memberships.length === 1) {
      redirect(`/${memberships[0].organization.slug}/overview`);
    }
    redirect("/org-select");
  }

  return <>{children}</>;
}
