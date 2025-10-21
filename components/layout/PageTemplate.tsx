/* components/layout/PageTemplate.tsx */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";

type Section = "Dashboard" | "Employees" | "Payroll" | "Absence" | "Settings";

export default function PageTemplate({
  title,
  currentSection,
  children,
}: {
  title: string;
  currentSection: Section;
  children: React.ReactNode;
}) {
  // Chip rules:
  // - On Dashboard: show Employees, Payroll, Absence, Settings
  // - On other pages: show Dashboard only (no chip for the current page)
  const chips = useMemo(() => {
    if (currentSection === "Dashboard") {
      return [
        { label: "Employees", href: "/dashboard/employees" },
        { label: "Payroll", href: "/dashboard/payroll" },
        { label: "Absence", href: "/dashboard/absence" },
        { label: "Settings", href: "/dashboard/settings" },
      ];
    }
    return [{ label: "Dashboard", href: "/dashboard" }];
  }, [currentSection]);

  return (
    <div className="min-h-dvh bg-[linear-gradient(135deg,#22c55e_0%,#3b82f6_100%)] p-3 sm:p-4">
      {/* White header banner */}
      <div className="mx-auto max-w-6xl rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4">
          {/* Brand logo only. No duplicate brand text. */}
          <Image
            src="/wageflow-logo.png"
            alt="WageFlow"
            width={64}
            height={64}
            priority
            className="h-16 w-16 rounded-xl ring-1 ring-neutral-300 object-contain"
          />
          <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900">
            {title}
          </h1>
        </div>

        {/* Nav chips row */}
        <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-4 py-3 sm:px-6">
          {chips.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="w-32 text-center rounded-full bg-white ring-1 ring-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-900 hover:-translate-y-0.5 transition-transform"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Page body card area */}
      <div className="mx-auto mt-4 max-w-6xl flex-1 min-h-[60vh]">
        <div className="grid">
          <div className="rounded-2xl bg-white/60 backdrop-blur ring-1 ring-neutral-200 p-3 sm:p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
