// components/ui/HeaderBanner.tsx
// Banner with logo, title, and context-aware nav chips.
// Accepts a currentSection prop to hide the active section from chips.
// On Dashboard: show Employees, Payroll, Absence, Settings.
// On other pages: show Dashboard first and hide the current page; no Settings chip.

import React from "react";
import Link from "next/link";

type Section = "dashboard" | "employees" | "payroll" | "absence" | "settings";

type HeaderBannerProps = {
  title?: string;
  currentSection?: Section;
};

const chipBase =
  "inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-colors w-32 text-center";
const container =
  "mx-auto mb-6 mt-2 w-full max-w-6xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm";
const titleCls = "text-4xl font-semibold tracking-tight text-neutral-900";
const row = "flex items-center justify-between gap-4";
const left = "flex items-center gap-4";
const logoCls = "h-16 w-16 rounded-lg object-contain bg-transparent";
const chipsRow = "flex items-center gap-3";

function chipsFor(section: Section): { label: string; href: string; key: Section }[] {
  if (section === "dashboard") {
    return [
      { label: "Employees", href: "/dashboard/employees", key: "employees" },
      { label: "Payroll", href: "/dashboard/payroll", key: "payroll" },
      { label: "Absence", href: "/dashboard/absence", key: "absence" },
      { label: "Settings", href: "/dashboard/settings", key: "settings" },
    ];
  }

  // Non-dashboard pages: show Dashboard first, then the others except the current section.
  const all: { label: string; href: string; key: Section }[] = [
    { label: "Dashboard", href: "/dashboard", key: "dashboard" },
    { label: "Employees", href: "/dashboard/employees", key: "employees" },
    { label: "Payroll", href: "/dashboard/payroll", key: "payroll" },
    { label: "Absence", href: "/dashboard/absence", key: "absence" },
    // Settings intentionally omitted off-dashboard as per spec.
  ];
  return all.filter((c) => c.key !== section);
}

export default function HeaderBanner({
  title = "Dashboard",
  currentSection = "dashboard",
}: HeaderBannerProps) {
  const chips = chipsFor(currentSection);

  return (
    <div className={container}>
      <div className={row}>
        <div className={left}>
          <img
            src="/WageFlowLogo.png"
            alt="WageFlow logo"
            className={logoCls}
            loading="eager"
          />
          <h1 className={titleCls}>{title}</h1>
        </div>

        <nav className={chipsRow} aria-label="Primary">
          {chips.map((c) => (
            <Link key={c.key} href={c.href} className={chipBase}>
              {c.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
