import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-sm border border-gray-100 p-10 text-center flex flex-col items-center">
        <h1 className="logo-font text-[40px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-6">
          Roll SYNC
        </h1>
        
        <h2 className="text-[24px] font-medium text-gray-900 tracking-tight mb-2">
          Welcome to Roll SYNC
        </h2>
        
        <p className="text-gray-500 mb-10 text-[15px]">
          Let&apos;s get your workspace set up.
        </p>
        
        <Link href="/onboarding/one" className="w-full bg-[#0d34db] hover:bg-[#0b2bb5] text-white rounded-full py-[14px] px-6 font-medium text-[16px] transition-colors">
          Continue
        </Link>
      </div>
    </div>
  );
}
