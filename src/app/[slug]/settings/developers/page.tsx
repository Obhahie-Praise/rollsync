import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listApiKeys } from "@/lib/api-key-actions";
import { DevelopersPage } from "@/components/settings/DevelopersPage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DevelopersSettingsPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  // Resolve org + membership
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

  // Only OWNER and ADMIN can manage developer resources
  const canManage =
    membership.role === "OWNER" || membership.role === "ADMIN";

  // Load API keys (listApiKeys already does its own auth check, but we pass
  // canManage to the component so it can render a friendly message for MEMBERs).
  const keysResult = canManage ? await listApiKeys(slug) : { ok: true as const, keys: [] };
  const initialKeys = keysResult.ok ? keysResult.keys : [];

  return (
    <DevelopersPage
      orgSlug={slug}
      initialKeys={initialKeys}
      canManage={canManage}
    />
  );
}
