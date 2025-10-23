/* components/layout/PageTemplate.tsx */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";

type Section =
  | "Dashboard"
  | "Employees"
  | "Payroll"
  | "Absence"
  | "Reports"
  | "Company"
  | "Settings";

export default function PageTemplate({
  title,
  currentSection,
  children,
}: {
  title: string;
  currentSection: Section;
  children: React.ReactNode;
}) {
  const allChips = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Employees", href: "/dashboard/employees" },
      { label: "Payroll", href: "/dashboard/payroll" },
      { label: "Absence", href: "/dashboard/absence" },
      { label: "Reports", href: "/dashboard/reports" },
      { label: "Company", href: "/dashboard/company" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
    []
  );

  const chips = useMemo(
    () => allChips.filter((c) => c.label !== currentSection),
    [allChips, currentSection]
  );

  return (
    <div
      className="min-h-dvh bg-[linear-gradient(180deg,#22c55e_0%,#3b82f6_100%)] p-3 sm:p-4"
      style={{ scrollbarGutter: "stable" }}
    >
      <div className="mx-auto max-w-6xl rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-4 min-w-0">
            <Image
              src="/wageflow-logo.png"
              alt="WageFlow"
              width={64}
              height={64}
              priority
              className="h-16 w-16 rounded-xl ring-1 ring-neutral-300 object-contain shrink-0"
            />
            <h1 className="text-[34px] sm:text-[40px] leading-none font-semibold text-[#2563eb] truncate">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {chips.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="min-w-24 text-center rounded-full bg-[#2563eb] text-white ring-1 ring-[#1e40af] px-3 py-1.5 text-xs sm:text-sm font-semibold transition-transform hover:-translate-y-0.5"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-6xl flex-1 min-h-[60vh]">
        <div className="rounded-2xl bg-white/60 backdrop-blur ring-1 ring-neutral-200 p-3 sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
