import Image from "next/image";
import React from "react";

const HeroSection = () => {
  const heroDrops = [
    { img: "/time.svg", title: "Real time SYNC" },
    { img: "/cloudoff.svg", title: "Offline-first" },
    { img: "/android.svg", title: "Cross-platform" },
    { img: "/api.svg", title: "API" },
  ];

  return (
    <div className="px-4 sm:px-8 lg:px-10 space-y-8 sm:space-y-12 pt-10 sm:pt-16">
      {/* Headline row */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <p className="text-[48px] sm:text-[64px] lg:text-[80px] xl:text-[96px] leading-[1.1] max-w-[900px] font-medium tracking-tight">
          Attendance infrastructure built for{" "}
          <span className="bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF]">
            schools
          </span>
        </p>
        <p className="text-[18px] sm:text-[20px] lg:text-[22px] max-w-sm lg:max-w-[320px] text-gray-600 lg:self-end">
          We take the friction out of attendance with infrastructure that just works.
        </p>
      </div>

      {/* Hero image + feature list */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-0">
        <div className="w-full lg:flex-1 overflow-hidden rounded-[24px] sm:rounded-[32px] lg:rounded-[40px]">
          <Image
            src="/hero.svg"
            width={1268}
            height={518}
            alt="Roll SYNC dashboard preview"
            className="w-full h-auto object-cover"
            priority
          />
        </div>

        {/* Feature drops */}
        <div className="lg:w-48 xl:w-56 shrink-0 lg:pl-6">
          <div className="space-y-2 lg:space-y-3">
            {heroDrops.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between border-b border-[#BBD5FF] py-3"
              >
                <div className="flex items-center gap-4">
                  <Image
                    src={item.img}
                    width={24}
                    height={24}
                    alt={item.title}
                    className="shrink-0"
                  />
                  <p className="uppercase text-[14px] sm:text-[16px] font-semibold">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
