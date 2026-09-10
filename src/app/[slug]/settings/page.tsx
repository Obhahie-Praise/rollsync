import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({ where: { slug }, select: { name: true } });
  if (!org) notFound();

  return (
    <div className="min-h-screen p-10">
      <h1 className="logo-font text-[32px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-2">Roll SYNC</h1>
      <p className="text-text-accent text-[16px] mb-8">{org.name}</p>
      <h2 className="text-[40px] font-medium">Settings</h2>
      <p className="text-text-accent mt-2 text-[18px]">Settings coming soon.</p>
    </div>
  );
}
