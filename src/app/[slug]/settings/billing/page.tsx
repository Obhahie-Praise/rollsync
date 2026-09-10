import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBillingInfo } from "@/lib/billing-actions";
import { BillingPage } from "@/components/settings/BillingPage";
import { SettingsSection } from "@/components/settings/SettingsSection";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BillingSettingsPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  // Verify membership
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: org.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    redirect("/");
  }

  const billingInfo = await getBillingInfo(slug);

  if (!billingInfo.ok) {
    return (
      <SettingsSection
        title="Billing"
        description="Manage your organization's plan and billing."
      >
        <div className="p-5 rounded-2xl bg-white/60 border border-black/8 text-[14px] text-text-accent">
          {billingInfo.error}
        </div>
      </SettingsSection>
    );
  }

  return (
    <BillingPage
      slug={slug}
      subscription={billingInfo.subscription}
      canManage={billingInfo.canManage}
    />
  );
}
