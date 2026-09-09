"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthModal, AuthMode } from "@/components/auth/auth-modal";

const Navbar = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-up");

  const openAuthModal = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <nav
        className="flex items-center justify-between px-[40px] py-[20px]"
      >
        <div className="flex items-center" style={{ gap: "32px" }}>
          <h1 className="logo-font text-[40px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF]">
            Roll SYNC
          </h1>
          <div className="flex items-center" style={{ gap: "24px" }}>
            <Link
              href={"/"}
              className="flex items-center"
              style={{ gap: "8px" }}
            >
              <p style={{ fontSize: "18px", fontWeight: 500 }}>Product</p>
              <ChevronDown size={15} />
            </Link>
            <Link
              href={"/"}
              className="flex items-center"
              style={{ gap: "8px" }}
            >
              <p style={{ fontSize: "18px", fontWeight: 500 }}>Solution</p>
              <ChevronDown size={15} />
            </Link>
            <Link
              href={"/"}
              className="flex items-center"
              style={{ gap: "8px" }}
            >
              <p style={{ fontSize: "18px", fontWeight: 500 }}>Pricing</p>
            </Link>
            <Link
              href={"/"}
              className="flex items-center"
              style={{ gap: "8px" }}
            >
              <p style={{ fontSize: "18px", fontWeight: 500 }}>Developers</p>
              <ChevronDown size={15} />
            </Link>
          </div>
        </div>

        <div className="flex items-center" style={{ gap: "10px" }}>
          <div className="flex items-center">
            <button
              onClick={() => openAuthModal("sign-in")}
              style={{
                padding: "10px 15px",
                borderRadius: "9999px",
                fontSize: "16px",
                fontWeight: 500,
              }}
              className="hover:bg-gray-100 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => openAuthModal("sign-up")}
              className="bg-[#0d34db] hover:bg-[#0b2bb5] transition-colors font-medium ml-2"
              style={{
                padding: "10px 15px",
                borderRadius: "9999px",
                fontSize: "16px",
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode} 
      />
    </>
  );
};

export default Navbar;
