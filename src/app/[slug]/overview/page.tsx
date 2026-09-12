import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAdminOverview } from "@/lib/overview-actions";
import { AdminOverview } from "@/components/overview/AdminOverview";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OverviewPage({ params }: PageProps) {
  const { slug } = await params;

  // Server-side guard: teachers are redirected to /teacher/today before any data loads
  await requireAdminAccess(slug);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

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
