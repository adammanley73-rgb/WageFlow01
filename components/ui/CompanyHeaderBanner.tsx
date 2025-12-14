// components/ui/HeaderBanner.tsx
// Shared header with logo, blue title, optional company name, and filled blue nav chips.

import React from "react";
import Link from "next/link";

type Section = "dashboard" | "employees" | "payroll" | "absence" | "settings";

type HeaderBannerProps = {
  title?: string;
  currentSection?: Section | string;
  companyName?: string; // <-- added here
};

const container =
  "mx-auto mb-6 mt-2 w-full max-w-6xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm";
const row = "flex items-center justify-between gap-4";
const left = "flex items-center gap-4";
const logoCls = "h-16 w-16 rounded-lg object-contain bg-transparent";
const titleCls = "text-4xl font-extrabold tracking-tight text-blue-900";
const chipsRow = "flex items-center gap-3";

const chipBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 transition-colors w-28 text-center";

function chipsFor(section: string | undefined): { label: string; href: string; key: Section }[] {
  const base: { label: string; href: string; key: Section }[] = [
    { label: "Employees", href: "/dashboard/employees", key: "employees" },
    { label: "Payroll", href: "/dashboard/payroll", key: "payroll" },
    { label: "Absence", href: "/dashboard/absence", key: "absence" },
  ];

  if (section === "dashboard") {
    return [
      ...base,
      { label: "Settings", href: "/dashboard/settings", key: "settings" },
    ];
  }

  return [
    { label: "Dashboard", href: "/dashboard", key: "dashboard" },
    ...base,
  ];
}

function humanizeTitle(section?: string): string {
  if (!section) return "Dashboard";
  if (section === section.toLowerCase()) {
    return section.charAt(0).toUpperCase() + section.slice(1);
  }
  return section;
}

export default function HeaderBanner({
  title,
  currentSection = "dashboard",
  companyName, // <-- added here
}: HeaderBannerProps) {
  const chips = chipsFor(currentSection);
  const heading = title ?? humanizeTitle(currentSection);

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
          <h1 className={titleCls}>
            {heading}
            {companyName ? (
              <span className="ml-2 font-semibold text-neutral-700">
                – {companyName}
              </span>
            ) : null}
          </h1>
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
