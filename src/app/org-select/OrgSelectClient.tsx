"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  type: "SCHOOL" | "ORGANIZATION" | "EVENT";
  logoUrl: string | null;
}

function entityIcon(type: OrgItem["type"]): string {
  switch (type) {
    case "SCHOOL":      return "/school.svg";
    case "EVENT":       return "/event.svg";
    default:            return "/org.svg";
  }
}

function entityLabel(type: OrgItem["type"]): string {
  switch (type) {
    case "SCHOOL":      return "School";
    case "EVENT":       return "Event";
    default:            return "Organization";
  }
}

interface OrgSelectClientProps {
  orgs: OrgItem[];
  userName: string;
}

export default function OrgSelectClient({ orgs, userName }: OrgSelectClientProps) {
  const router = useRouter();
  const firstName = userName.split(" ")[0];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="logo-font text-[36px] sm:text-[40px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-4">
            Roll SYNC
          </h1>
          <p className="text-[22px] sm:text-[24px] font-medium tracking-tight">
            Welcome back, {firstName}
          </p>
          <p className="text-[18px] text-gray-500 mt-1">
            Choose an organization to continue.
          </p>
        </div>

        {/* Org list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[30px] shadow-[0px_3px_30px_0_#D3D3D3] border border-border overflow-hidden"
        >
          {orgs.map((org, index) => (
            <button
              key={org.id}
              type="button"
              onClick={() => router.push(`/${org.slug}/overview`)}
              className={[
                "w-full flex items-center gap-4 px-[24px] py-[14px] hover:bg-gray-50 transition-colors text-left group",
                index < orgs.length - 1 ? "border-b border-gray-100" : "",
              ].join(" ")}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                <Image
                  src={org.logoUrl ?? entityIcon(org.type)}
                  alt={org.name}
                  width={40}
                  height={40}
                  unoptimized={!!org.logoUrl}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold truncate">{org.name}</p>
                <p className="text-[13px] text-gray-500">{entityLabel(org.type)}</p>
              </div>
              <ChevronRight
                size={18}
                className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0"
              />
            </button>
          ))}
        </motion.div>

        {/* Create new org */}
        <div className="mt-4 text-center">
          <Link
            href="/new-org"
            className="inline-flex items-center gap-2 text-[14px] text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Plus size={15} />
            Create a new organization
          </Link>
        </div>
      </div>
    </div>
  );
}
