import { Reveal } from "@/components/landing/reveal";
import { Users, BookOpen, CalendarDays, CheckSquare } from "lucide-react";

const PILLARS = [
  {
    icon: Users,
    label: "People",
    headline: "Know who belongs.",
    body: "Students, teachers, staff — everyone in your organization has a place. Roles, classes, and permissions stay organized automatically.",
    accent: "#2f5eff",
  },
  {
    icon: BookOpen,
    label: "Classes",
    headline: "Know who belongs together.",
    body: "Create classes, assign subjects, add teachers. Roll SYNC understands the structure of your organization, not just a list of names.",
    accent: "#0d34db",
  },
  {
    icon: CalendarDays,
    label: "Timetable",
    headline: "Know what should happen.",
    body: "Build your timetable once. Roll SYNC uses it to know when sessions are expected and when teachers should be checking in.",
    accent: "#1040d0",
  },
  {
    icon: CheckSquare,
    label: "Attendance",
    headline: "Know what actually happened.",
    body: "Compare expectation against reality. QR check-in, roll call, or teacher-led sessions — every session is recorded and organized.",
    accent: "#0926cf",
  },
];

export default function ProductSection() {
  return (
    <section
      id="product"
      className="section-light py-24 sm:py-32 px-5 sm:px-8 lg:px-10"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 sm:mb-20">
          <Reveal>
            <p className="eyebrow mb-4">The product</p>
            <h2 className="display-font text-[38px] sm:text-[48px] lg:text-[56px] font-semibold text-gray-900 leading-[1.1] tracking-tight max-w-lg">
              Four ideas. <br />
              One{" "}
              <span className="text-blue-gradient">system.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.1} className="max-w-md">
            <p className="text-[16px] sm:text-[17px] text-gray-500 leading-relaxed">
              Most attendance tools are built around a form or a scanner.
              Roll SYNC is built around understanding your organization — 
              who&apos;s in it, how it&apos;s structured, and what&apos;s supposed to happen.
            </p>
          </Reveal>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.label} delay={i * 0.07}>
                <div className="group relative bg-[#f7f9ff] hover:bg-white border border-gray-100 hover:border-blue-100 rounded-[20px] p-7 flex flex-col gap-5 transition-all duration-300 hover:shadow-[0_4px_32px_rgba(13,52,219,0.08)] h-full">
                  {/* Step number */}
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-300">
                    0{i + 1}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${pillar.accent}14` }}
                  >
                    <Icon size={20} style={{ color: pillar.accent }} />
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-2">
                    <h3 className="display-font text-[18px] font-semibold text-gray-900">
                      {pillar.label}
                    </h3>
                    <p className="text-[13px] font-semibold text-gray-400 leading-snug">
                      {pillar.headline}
                    </p>
                    <p className="text-[14px] text-gray-500 leading-relaxed mt-1">
                      {pillar.body}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div
                    className="mt-auto h-[2px] w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: pillar.accent }}
                  />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
