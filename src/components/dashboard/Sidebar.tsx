import {
  Building,
  Calendar,
  ChevronsUpDown,
  ClipboardPen,
  Cog,
  FaceSlightlySmiling,
  Folder,
  Headset,
  Layout,
  LogOut,
  UserRound,
  Webhook,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Sidebar = () => {
  const toplinks = [
    {
      icon: Layout,
      label: "Overview",
      href: "[slug]/overview",
    },
    {
      icon: Calendar,
      label: "Attendance",
      droplinks: [
        {
          label: "Session",
          href: "/[slug]/attendance/session",
        },
        {
          label: "Record",
          href: "/[slug]/attendance/record",
        },
      ],
    },
    {
      icon: FaceSlightlySmiling,
      label: "People",
      href: "[slug]/people",
    },
    {
      icon: Folder,
      label: "Organization",
      href: "[slug]/organization",
    },
    {
      icon: ClipboardPen,
      label: "Report",
      href: "[slug]/report",
    },
    {
      icon: Webhook,
      label: "Developer",
      href: "[slug]/developer",
    },
    {
      icon: Cog,
      label: "Settings",
      href: "[slug]/settings",
    },
  ];

  return (
    <aside className="h-[95vh] w-[350px] absolute top-1/2 right-10 bg-background rounded-[30px] p-[20px] shadow-[0px_3px_30px_0_#D3D3D3] flex flex-col justify-between">
      <div className="space-y-[24px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[12px] mb-[10px]">
            <div className="bg-dark-accent p-3 rounded-full text-white">
              <UserRound size={26} />
            </div>
            <p className="font-medium text-[24px]">John Doe</p>
          </div>
          <div className="p-2.5 text-text-accent rounded-full shadow-[0px_3px_30px_0_#D3D3D3]">
            <X size={28} />
          </div>
        </div>
        <button className="flex items-center gap-[12px] px-[24px] py-[12px]">
          <Image src={"/school.svg"} alt="school" width={25} height={25} />
          <p className="text-[16px] font-medium">John Doe Group of Schools</p>
          <ChevronsUpDown size={20} className="text-text-accent" />
        </button>
        <div className="">
          {/* Side bar links */}
          {toplinks.map((link) => {
            return (
              <Link
                href={"/"}
                className="flex items-center gap-[12px] px-[24px] py-[12px]"
                key={link.label}
              >
                <link.icon size={28} strokeWidth={1.4} />
                <p className="text-[24px] font-medium">{link.label}</p>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="">
        <Link
          href={"/"}
          className="flex items-center gap-[12px] px-[24px] py-[12px]"
        >
          <Headset size={28} strokeWidth={1.4} />
          <p className="text-[24px] font-medium">Help center</p>
        </Link>
        <button className="flex items-center gap-[12px] px-[24px] py-[12px]">
          <LogOut size={28} strokeWidth={1.4} className="text-red-500" />
          <p className="text-[24px] font-medium">Logout</p>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
