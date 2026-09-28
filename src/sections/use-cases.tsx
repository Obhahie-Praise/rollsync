import { Reveal } from "@/components/landing/reveal";
import Image from "next/image";

const USE_CASES = [
  {
    label: "Schools",
    headline: "Built for the classroom.",
    body: "Teachers run sessions, students check in by QR. Timetables drive the schedule. Every class, every day, every teacher — tracked automatically.",
    stat: "Daily attendance",
    statDetail: "per class, per teacher",
    img: "/school.svg",
    bg: "#eef4ff",
    accent: "#0d34db",
  },
  {
    label: "Organizations",
    headline: "Meetings, shifts, and beyond.",
    body: "Know who showed up to every session. Roll SYNC works for training programs, workplaces, clubs, and any environment where presence matters.",
    stat: "Session records",
    statDetail: "searchable and exportable",
    img: "/org.svg",
    bg: "#f0f9ee",
    accent: "#288721",
  },
  {
    label: "Events",
    headline: "Check-in at scale.",
    body: "Run a single attendance session for an event, conference, or community gathering. Fast check-in, instant records, no spreadsheets.",
    stat: "Fast check-in",
    statDetail: "QR or manual",
    img: "/event.svg",
    bg: "#fff8ee",
    accent: "#c97010",
  },
];

export default function UseCasesSection() {
  return (
    <section
      id="use-cases"
      className="section-light py-24 sm:py-32 px-5 sm:px-8 lg:px-10"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 sm:mb-20">
          <Reveal>
            <p className="eyebrow mb-4">Built for</p>
            <h2 className="display-font text-[38px] sm:text-[48px] lg:text-[56px] font-semibold text-gray-900 leading-[1.1] tracking-tight">
              One system.
              <br />
              <span className="text-blue-gradient">Many environments.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="max-w-sm">
            <p className="text-[16px] text-gray-500 leading-relaxed">
              The core is always the same: people, schedules, and attendance.
              Roll SYNC adapts to how your organization works — not the other
              way around.
            </p>
          </Reveal>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {USE_CASES.map((uc, i) => (
            <Reveal key={uc.label} delay={i * 0.08}>
              <div
                className="group rounded-[24px] overflow-hidden flex flex-col h-full border border-transparent hover:border-gray-100 transition-all duration-300 hover:shadow-[0_4px_32px_rgba(0,0,0,0.06)]"
                style={{ background: uc.bg }}
              >
                {/* Icon area */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-center">
                  <Image
                    src={uc.img}
                    alt={uc.label}
                    width={120}
                    height={80}
                    className="w-24 h-auto object-contain"
                  />
                </div>

                {/* Text */}
                <div className="px-8 pb-8 flex flex-col gap-3 flex-1">
                  <span
                    className="text-[11px] font-semibold tracking-widest uppercase"
                    style={{ color: uc.accent }}
                  >
                    {uc.label}
                  </span>
                  <h3 className="display-font text-[20px] font-semibold text-gray-900 leading-snug">
                    {uc.headline}
                  </h3>
                  <p className="text-[14px] text-gray-500 leading-relaxed flex-1">
                    {uc.body}
                  </p>

                  {/* Stat */}
                  <div
                    className="mt-4 pt-4 border-t flex items-baseline gap-2"
                    style={{ borderColor: `${uc.accent}18` }}
                  >
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: uc.accent }}
                    >
                      {uc.stat}
                    </span>
                    <span className="text-[12px] text-gray-400">
                      {uc.statDetail}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
