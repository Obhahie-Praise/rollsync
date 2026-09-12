import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listApiKeys } from "@/lib/api-key-actions";
import { DevelopersPage } from "@/components/settings/DevelopersPage";
import { requireAdminAccess } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DevelopersRoutePage({ params }: PageProps) {
  const { slug } = await params;

  // Server-side guard: teachers and non-admins are redirected before any sensitive data loads
  const { role } = await requireAdminAccess(slug);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  // Only OWNER and ADMIN can manage developer resources (requireAdminAccess guarantees this)
  const canManage = role === "OWNER" || role === "ADMIN";

  const keysResult = await listApiKeys(slug);
  const initialKeys = keysResult.ok ? keysResult.keys : [];

  return (
    <div className="px-8 sm:px-14 pb-20">
      {/* Page heading */}
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight">
          Developers
        </h1>
        <p className="text-[18px] text-text-accent mt-1">
          Build integrations with Roll SYNC&apos;s API.
        </p>
      </div>

      {/* Main content — reuses the fully-built DevelopersPage component */}
      <div className="max-w-[700px]">
        <DevelopersPage
          orgSlug={slug}
          initialKeys={initialKeys}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
