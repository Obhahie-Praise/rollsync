import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchTeacherOverview, fetchAdminOverview } from "@/lib/overview-actions";
import { TeacherOverview } from "@/components/overview/TeacherOverview";
import { AdminOverview } from "@/components/overview/AdminOverview";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OverviewPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

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
  if (!membership) redirect("/");

  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";

  // ── Admin path ──────────────────────────────────────────────────────────
  if (isAdmin) {
    const result = await fetchAdminOverview(slug);
    if (!result.ok) {
      return (
        <div className="px-8 sm:px-14 pb-24 pt-4">
          <p className="text-red-600 text-[14px]">{result.error}</p>
        </div>
      );
    }
    return <AdminOverview data={result.data} />;
  }

  // ── Teacher / Member path ───────────────────────────────────────────────
  const result = await fetchTeacherOverview(slug);
  if (!result.ok) {
    // No linked teacher person — show a generic member view
    if (result.code === "NO_TEACHER_PROFILE" || result.error.includes("teacher")) {
      const greeting = getGreeting();
      const orgData = await prisma.organization.findUnique({
        where: { slug },
        select: { name: true },
      });
      return (
        <div className="px-8 sm:px-14 pb-24">
          <div className="mb-8">
            <h1 className="text-[38px] font-semibold tracking-tight">
              {greeting}, {session.user.name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="text-[16px] text-text-accent mt-1">
              {orgData?.name ?? slug}
            </p>
          </div>
          <div className="max-w-md p-6 bg-white/60 border border-black/8 rounded-2xl">
            <p className="text-[15px] font-medium mb-1">Limited access</p>
            <p className="text-[13px] text-text-accent">
              Your account does not have a linked teacher or admin profile in this
              organization. Contact your administrator for access.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-8 sm:px-14 pb-24 pt-4">
        <p className="text-red-600 text-[14px]">{result.error}</p>
      </div>
    );
  }

  return <TeacherOverview data={result.data} />;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
