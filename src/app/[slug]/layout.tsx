import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/dashboard/Header";

interface SlugLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function SlugLayout({
  children,
  params,
}: SlugLayoutProps) {
  const { slug } = await params;

  // 1. Auth check — unauthenticated users go to landing
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  // 2. Resolve the organization by slug
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, type: true },
  });

  if (!organization) {
    notFound();
  }

  // 3. Membership check — user must belong to this organization
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: organization.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    // Authenticated but not a member — redirect to their own onboarding/dashboard
    redirect("/onboarding");
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}
