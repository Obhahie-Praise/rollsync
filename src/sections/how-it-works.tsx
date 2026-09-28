import { Reveal } from "@/components/landing/reveal";
import { Building2, LayoutGrid, ScanLine, BarChart3 } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Building2,
    title: "Set up your organization",
    body: "Create your workspace, invite your team, and define how your organization is structured — school, company, or event.",
  },
  {
    number: "02",
    icon: LayoutGrid,
    title: "Build classes and timetable",
    body: "Add your classes, assign subjects, assign teachers, and map out your schedule. Roll SYNC learns your structure.",
  },
  {
    number: "03",
    icon: ScanLine,
    title: "Run attendance sessions",
    body: "Teachers open a session. Students scan a QR code, or a teacher runs roll call. Every check-in is recorded instantly.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "See what's happening",
    body: "Live session data, attendance history, per-person records. Your organization's attendance is organized, searchable, and exportable.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 sm:py-32 px-5 sm:px-8 lg:px-10"
      style={{ background: "#f7f9ff" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16 sm:mb-20">
          <Reveal>
            <p className="eyebrow mb-4">How it works</p>
            <h2 className="display-font text-[38px] sm:text-[48px] lg:text-[56px] font-semibold text-gray-900 leading-[1.1] tracking-tight max-w-xl">
              From setup to sync{" "}
              <span className="text-blue-gradient">in minutes.</span>
            </h2>
          </Reveal>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-[36px] left-[calc(12.5%_+_20px)] right-[calc(12.5%_+_20px)] h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.number} delay={i * 0.08}>
                  <div className="relative flex flex-col gap-5">
                    {/* Icon circle */}
                    <div className="relative z-10 w-[52px] h-[52px] rounded-full bg-white border border-blue-100 shadow-[0_2px_12px_rgba(13,52,219,0.1)] flex items-center justify-center shrink-0">
                      <Icon size={22} className="text-[#0d34db]" />
                    </div>

                    {/* Text */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-300">
                        {step.number}
                      </span>
                      <h3 className="display-font text-[18px] font-semibold text-gray-900 leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-[14px] text-gray-500 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* Bottom editorial callout */}
        <Reveal delay={0.2} className="mt-20">
          <div className="rounded-[24px] bg-white border border-blue-50 px-8 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center gap-6 shadow-[0_2px_24px_rgba(13,52,219,0.05)]">
            <div className="flex-1">
              <h3 className="display-font text-[22px] sm:text-[26px] font-semibold text-gray-900 leading-snug">
                No spreadsheets. No manual tracking.{" "}
                <span className="text-blue-gradient">Just attendance.</span>
              </h3>
              <p className="mt-3 text-[15px] text-gray-500 leading-relaxed max-w-lg">
                Roll SYNC automates the record-keeping so teachers can focus on
                teaching, and admins can focus on the things that actually matter.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-[13px] font-semibold text-[#0d34db]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0d34db]" />
                QR check-in
              </span>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0d34db]/60" />
                Roll call
              </span>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0d34db]/30" />
                Reports
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
