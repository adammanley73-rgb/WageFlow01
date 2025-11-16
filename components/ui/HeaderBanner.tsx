// C:\Users\adamm\Projects\wageflow01\components\ui\HeaderBanner.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

type Section =
  | "Dashboard"
  | "Company Selection"
  | "Employees"
  | "Payroll"
  | "Absence"
  | "Reports"
  | "Settings";

type HeaderBannerProps = {
  title: Section;
  currentSection: Section;
};

const NAV_ITEMS: { id: Section; name: string; href: string }[] = [
  { id: "Dashboard", name: "Dashboard", href: "/dashboard" },
  { id: "Company Selection", name: "Company Selection", href: "/dashboard/companies" },
  { id: "Employees", name: "Employees", href: "/dashboard/employees" },
  { id: "Payroll", name: "Payroll", href: "/dashboard/payroll" },
  { id: "Absence", name: "Absence", href: "/dashboard/absence" },
  { id: "Reports", name: "Reports", href: "/dashboard/reports" },
  { id: "Settings", name: "Settings", href: "/dashboard/settings" },
];

export default function HeaderBanner({ title, currentSection }: HeaderBannerProps) {
  const showSettings = currentSection === "Dashboard";

  // COMPANY SELECTION SHOULD HAVE NO NAV CHIPS
  if (currentSection === "Company Selection") {
    return (
      <header className="w-full bg-white rounded-3xl px-6 py-4 flex items-center gap-4">
        <div className="h-14 w-14 rounded-md bg-white flex items-center justify-center">
          <Image
            src="/WageFlowLogo.png"
            alt="WageFlow"
            width={56}
            height={56}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-4xl font-extrabold text-[#0f3c85] leading-none tracking-tight">
          {title}
        </h1>
      </header>
    );
  }

  const itemsToShow = NAV_ITEMS.filter((item) => {
    if (item.id === "Settings" && !showSettings) return false;
    if (item.id === currentSection) return false;
    return true;
  });

  return (
    <header className="w-full bg-white rounded-3xl px-6 py-4 flex items-center gap-6">
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-14 w-14 rounded-md bg-white flex items-center justify-center">
          <Image
            src="/WageFlowLogo.png"
            alt="WageFlow"
            width={56}
            height={56}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-4xl font-extrabold text-[#0f3c85] leading-none tracking-tight">
          {title}
        </h1>
      </div>

      <nav className="flex gap-2 flex-wrap justify-end w-full">
        {itemsToShow.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="w-36 h-10 px-3 rounded-full bg-[#0f3c85] text-white text-sm font-semibold text-center leading-[2.5rem] whitespace-nowrap"
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
