import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OverviewPage({ params }: PageProps) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { name: true, type: true },
  });

  if (!org) notFound();

  return (
    <div className="p-10">
      <h2 className="text-[40px] font-medium">Overview</h2>
      <p className="text-text-accent mt-2 text-[18px]">
        Welcome to {org.name}. Attendance features coming soon.
      </p>
    </div>
  );
}
