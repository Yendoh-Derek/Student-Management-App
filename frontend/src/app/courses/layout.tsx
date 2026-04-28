import { Fraunces, Outfit } from "next/font/google";
import type { Metadata } from "next";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-academic-display",
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-academic-body",
});

export const metadata: Metadata = {
  title: "Courses & enrollments · SMS",
  description: "Manage courses, enrollments, and grades",
};

export default function CoursesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`courses-skin ${display.variable} ${body.variable} min-h-screen font-[family-name:var(--font-academic-body)]`}
    >
      {children}
    </div>
  );
}
