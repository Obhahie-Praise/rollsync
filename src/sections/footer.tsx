const LINKS = [
  {
    heading: "Product",
    items: [
      { label: "People", href: "#product" },
      { label: "Classes", href: "#product" },
      { label: "Timetable", href: "#product" },
      { label: "Attendance", href: "#product" },
    ],
  },
  {
    heading: "Platform",
    items: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Use cases", href: "#use-cases" },
      { label: "Mobile (coming soon)", href: "#" },
      { label: "API", href: "#" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#06070a] border-t border-white/5 px-5 sm:px-8 lg:px-10 pt-16 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 mb-14">
          {/* Brand */}
          <div className="flex-1 max-w-xs">
            <span className="logo-font text-[26px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0d34db]">
              Roll SYNC
            </span>
            <p className="mt-4 text-[14px] text-white/35 leading-relaxed">
              Attendance infrastructure built for schools, organizations, and
              events. Fast. Reliable. Everywhere.
            </p>
          </div>

          {/* Link groups */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 flex-1">
            {LINKS.map((group) => (
              <div key={group.heading}>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-4">
                  {group.heading}
                </p>
                <ul className="flex flex-col gap-3">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="text-[14px] text-white/45 hover:text-white/80 transition-colors"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[13px] text-white/25">
            © {new Date().getFullYear()} Roll SYNC. All rights reserved.
          </p>
          <p className="text-[13px] text-white/20">
            Fast attendance. Reliable infrastructure. Built for everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
