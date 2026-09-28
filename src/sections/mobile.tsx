import { Reveal } from "@/components/landing/reveal";
import Image from "next/image";
import { WifiOff, Smartphone, RefreshCw } from "lucide-react";

const FEATURES = [
  {
    icon: WifiOff,
    title: "Works without internet",
    body: "Attendance is recorded locally when there's no connection.",
  },
  {
    icon: Smartphone,
    title: "Native mobile app",
    body: "Purpose-built for iOS and Android — not a web app in a shell.",
  },
  {
    icon: RefreshCw,
    title: "Syncs when you're back",
    body: "Offline records sync automatically once connectivity returns.",
  },
];

export default function MobileSection() {
  return (
    <section
      className="py-24 sm:py-32 px-5 sm:px-8 lg:px-10 overflow-hidden"
      style={{ background: "#06070a" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Text side */}
          <div className="flex-1 max-w-lg">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#7898ff]/70 mb-6">
                <span className="w-3 h-3 rounded-full border border-[#7898ff]/40 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7898ff]/60" />
                </span>
                Coming soon
              </span>
            </Reveal>

            <Reveal delay={0.05}>
              <h2 className="display-font text-[36px] sm:text-[46px] lg:text-[52px] font-semibold text-white leading-[1.1] tracking-tight">
                Attendance shouldn&apos;t stop
                <br />
                when the{" "}
                <span className="text-blue-gradient">internet does.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-6 text-[16px] text-white/50 leading-relaxed">
                Offline-first mobile attendance is coming to Roll SYNC.
                The mobile app will let teachers and attendees record
                presence without a network connection — syncing everything
                back to your organization automatically when connectivity
                returns.
              </p>
            </Reveal>

            {/* Feature list */}
            <div className="mt-10 flex flex-col gap-5">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={f.title} delay={0.18 + i * 0.07}>
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={16} className="text-[#7898ff]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-white/85">
                          {f.title}
                        </p>
                        <p className="text-[13px] text-white/40 mt-0.5 leading-relaxed">
                          {f.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* Visual side */}
          <Reveal delay={0.1} className="flex-1 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[320px] sm:max-w-[380px]">
              {/* Glow behind phone */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-full blur-[80px] opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle, #0d34db 0%, transparent 70%)" }}
              />
              <div className="relative rounded-[32px] overflow-hidden border border-white/8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
                <Image
                  src="/qr-iphone.svg"
                  alt="Roll SYNC mobile app — QR check-in"
                  width={380}
                  height={560}
                  className="w-full h-auto block"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
