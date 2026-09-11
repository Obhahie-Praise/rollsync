import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OrgSelectClient from "./OrgSelectClient";

export default async function OrgSelectPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  if (memberships.length === 1) {
    redirect(`/${memberships[0].organization.slug}/overview`);
  }

  const orgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    type: m.organization.type as "SCHOOL" | "ORGANIZATION" | "EVENT",
    logoUrl: m.organization.logoUrl,
  }));

  return <OrgSelectClient orgs={orgs} userName={session.user.name ?? "there"} />;
}
