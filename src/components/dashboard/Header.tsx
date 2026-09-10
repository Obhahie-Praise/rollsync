import { Command, Menu, Search, User, UserRound } from "lucide-react";
import React from "react";
import Sidebar from "./Sidebar";

const Header = () => {
  return (
    <header className="w-full flex items-center justify-between p-[40px] relative">
      <h1 className="logo-font text-[32px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-2">
        Roll SYNC
      </h1>
      {/* search action button */}
      <button className="flex items-center justify-between w-[300px] px-[20px] py-[16px] bg-accent rounded-full  shadow-[0px_3px_30px_0_#D3D3D3]">
        <div className="flex items-center gap-[10px]">
          <Search size={16} />
          <p className="text-[16px] font-medium text-placeholder">Search</p>
        </div>
        <div className="text-text-accent font-medium text-[14px]">
          <Command size={14} className="inline" /> + K
        </div>
      </button>
      <div className="flex items-center gap-[24px]">
        <p className="font-medium text-[20px]">Overview</p>
        {/* Side bar trigger */}
        <button className="flex items-center gap-[6px] bg-white rounded-full border border-border pl-3  shadow-[0px_3px_30px_0_#D3D3D3]">
          <Menu size={26} />
          <div className="bg-dark-accent p-3 rounded-full text-white">
            <UserRound size={26} />
          </div>
        </button>
      </div>

        <Sidebar />
    </header>
  );
};

export default Header;
