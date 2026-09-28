import type { Metadata } from "next";
import { Geist, Geist_Mono, MuseoModerno } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const museo = MuseoModerno({
  variable: "--font-museo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Roll SYNC — Attendance infrastructure built for everywhere",
  description:
    "Roll SYNC connects people, classes, timetables and attendance into one synchronized system. Fast attendance for schools, organizations, and events.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${museo.variable} h-full antialiased tracking-[-5%] leading-none`}
    >
      <Analytics/>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
