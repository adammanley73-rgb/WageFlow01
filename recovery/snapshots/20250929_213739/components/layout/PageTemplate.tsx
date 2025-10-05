/* components/layout/PageTemplate.tsx */
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

type ChipKey = "Dashboard" | "Employees" | "Payroll" | "Absence" | "Reports" | "Settings";
type Chip = { label: string; href: string; key: ChipKey };

export type PageTemplateProps = {
  title: string;
  currentSection: ChipKey;
  children?: ReactNode;
};

/** Identical-size chips; wrap on small screens; no horizontal scroll anywhere. */
const CHIP_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[#1e40af] text-white font-medium " +
  "w-24 h-8 text-[12px] shadow-sm hover:-translate-y-0.5 transition-transform " +
  "focus:outline-none focus:ring-2 focus:ring-white/60 select-none";

export default function PageTemplate({ title, currentSection, children }: PageTemplateProps) {
  const baseChips: Chip[] = [
    { label: "Dashboard", href: "/dashboard", key: "Dashboard" },
    { label: "Employees", href: "/dashboard/employees", key: "Employees" },
    { label: "Payroll", href: "/dashboard/payroll", key: "Payroll" },
    { label: "Absence", href: "/dashboard/absence", key: "Absence" },
    { label: "Reports", href: "/dashboard/reports", key: "Reports" }
  ];

  // Settings only visible on Dashboard
  const chips =
    currentSection === "Dashboard"
      ? [...baseChips, { label: "Settings", href: "/dashboard/settings", key: "Settings" }]
      : baseChips;

  // Hide chip for the current page
  const visibleChips = chips.filter(c => c.key !== currentSection);

  return (
    <div
      className={`${manrope.variable} ${inter.variable} min-h-dvh bg-gradient-to-b from-[#10b981] to-[#1e40af] flex flex-col overflow-x-hidden`}
      style={{ fontFamily: "var(--font-manrope)" }}
    >
      {/* Wider shared container; header + content use the same width so everything lines up */}
      <div className="mx-auto w-[90vw] max-w-[1600px] px-2 sm:px-4 py-6 flex-1 flex flex-col min-h-0">
        {/* Header banner (height unchanged) */}
        <header className="rounded-2xl bg-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow"
              width={64}
              height={64}
              className="h-16 w-16 object-contain shrink-0"
            />
            <h1 className="text-4xl font-semibold truncate" style={{ color: "#1e40af" }}>
              {title}
            </h1>
          </div>
          <nav className="flex flex-wrap justify-end items-center gap-2 max-w-full">
            {visibleChips.map(chip => (
              <Link key={chip.key} href={chip.href} className={CHIP_CLASS}>
                {chip.label}
              </Link>
            ))}
          </nav>
        </header>

        {/* Content fills remaining height, never causes horizontal scroll */}
        <main className="mt-6 flex-1 min-h-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
