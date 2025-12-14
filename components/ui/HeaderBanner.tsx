// C:\Users\adamm\Projects\wageflow01\components\ui\HeaderBanner.tsx
// Server component used on dashboard-style pages.
// - White header banner with logo + title
// - Context-aware nav chips (matches WageFlow gold standard)

import React from "react";
import Link from "next/link";

type Section = "dashboard" | "employees" | "payroll" | "absence" | "settings";

type HeaderBannerProps = {
title: string;
currentSection: Section;
};

type NavLink = {
key: Section;
label: string;
href: string;
};

const LINKS: NavLink[] = [
{ key: "dashboard", label: "Dashboard", href: "/dashboard" },
{ key: "employees", label: "Employees", href: "/dashboard/employees" },
{ key: "payroll", label: "Payroll", href: "/dashboard/payroll" },
{ key: "absence", label: "Absence", href: "/dashboard/absence" },
{ key: "settings", label: "Settings", href: "/dashboard/settings" },
];

function getVisibleLinks(currentSection: Section): NavLink[] {
if (currentSection === "dashboard") {
return LINKS.filter((l) => l.key !== "dashboard");
}

return LINKS.filter((l) => {
if (l.key === "settings") return false; // Settings link only shown on Dashboard
if (l.key === currentSection) return false; // hide current page
return l.key === "dashboard" || l.key === "employees" || l.key === "payroll" || l.key === "absence";
});
}

export default function HeaderBanner({ title, currentSection }: HeaderBannerProps) {
const visible = getVisibleLinks(currentSection);

return (
<div className="rounded-[32px] bg-white px-6 py-6 shadow-sm">
<div className="flex flex-col gap-4">
<div className="flex items-center gap-4">
<div className="flex items-center justify-center">
<img src="/WageFlowLogo.png" alt="WageFlow" className="h-16 w-auto object-contain" />
</div>

      <h1 className="text-4xl font-extrabold tracking-tight text-[#111827]">
        {title}
      </h1>
    </div>

    <nav className="flex flex-wrap gap-3">
      {visible.map((l) => (
        <Link
          key={l.key}
          href={l.href}
          className="inline-flex h-10 w-32 items-center justify-center rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ backgroundColor: "#0f3c85" }}
        >
          <span className="text-sm font-semibold">{l.label}</span>
        </Link>
      ))}
    </nav>
  </div>
</div>


);
}