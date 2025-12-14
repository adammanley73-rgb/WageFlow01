"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

type PageTemplateProps = {
  title: string;
  currentSection?: string;
  children: React.ReactNode;
};

const BASE_NAV = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Company Selection", href: "/dashboard/companies" },
  { name: "Employees", href: "/dashboard/employees" },
  { name: "Payroll", href: "/dashboard/payroll" },
  { name: "Absence", href: "/dashboard/absence" },
  { name: "Reports", href: "/dashboard/reports" },
];

export default function PageTemplate({
  title,
  currentSection,
  children,
}: PageTemplateProps) {
  const navItems =
    currentSection === "Dashboard"
      ? [...BASE_NAV, { name: "Settings", href: "/dashboard/settings" }]
      : BASE_NAV;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-400 to-blue-600">
      <div className="mx-auto max-w-6xl px-3 md:px-0 pt-6 pb-10">
        <div className="bg-white rounded-2xl px-4 md:px-6 py-4 flex items-center gap-4 shadow-sm mb-5">
          <Image
            src="/WageFlowLogo.png"
            alt="WageFlow"
            width={58}
            height={58}
            className="h-[58px] w-[58px] object-contain"
          />
          <div className="flex-1">
            <h1 className="text-3xl md:text-[2.2rem] font-bold text-[#0f3c85] leading-tight">
              {title}
            </h1>
          </div>
          <div className="hidden md:flex gap-2 flex-wrap justify-end min-w-[460px]">
            {navItems
              .filter((item) => item.name !== currentSection)
              .map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="inline-flex items-center justify-center w-36 h-9 rounded-full bg-[#164fa3] text-white text-[0.75rem] font-medium shadow-sm hover:bg-[#0f3c85] transition"
                >
                  {item.name}
                </Link>
              ))}
          </div>
        </div>

        <div className="md:hidden mb-4 flex flex-wrap gap-2">
          {navItems
            .filter((item) => item.name !== currentSection)
            .map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="inline-flex items-center justify-center w-32 h-9 rounded-full bg-[#164fa3] text-white text-xs font-medium shadow-sm hover:bg-[#0f3c85] transition"
              >
                {item.name}
              </Link>
            ))}
        </div>

        {children}
      </div>
    </div>
  );
}
