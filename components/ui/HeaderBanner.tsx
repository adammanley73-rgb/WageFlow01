/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\components\ui/HeaderBanner.tsx

import Link from "next/link";
import Image from "next/image";

type HeaderBannerProps = {
  title: string;
  currentSection: string;
};

const NAV_ITEMS = [
  { key: "Dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "Employees", label: "Employees", href: "/dashboard/employees" },
  { key: "Payroll", label: "Payroll", href: "/dashboard/payroll" },
  { key: "Absence", label: "Absence", href: "/dashboard/absence" },
  { key: "Reports", label: "Reports", href: "/dashboard/reports" },
];

function buildNav(currentSection: string) {
  const items = [...NAV_ITEMS];

  // Settings chip only on the Dashboard
  if (currentSection === "Dashboard") {
    items.push({
      key: "Settings",
      label: "Settings",
      href: "/dashboard/settings",
    });
  }

  // Hide the current section chip so we don't need a separate "active" style
  return items.filter((item) => item.key !== currentSection);
}

function NavChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 w-32 items-center justify-center rounded-full border text-sm font-medium bg-[#0f3c85] text-white border-[#0f3c85] hover:bg-[#0c326c] transition"
    >
      {label}
    </Link>
  );
}

export default function HeaderBanner({ title, currentSection }: HeaderBannerProps) {
  const navItems = buildNav(currentSection);

  return (
    <header className="rounded-3xl bg-white/90 px-4 py-4 sm:px-6 sm:py-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 sm:h-14 sm:w-14">
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow logo"
              fill
              className="rounded-2xl object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0f3c85] leading-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Nav chips – wrap on small screens, no horizontal scroll */}
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <NavChip key={item.key} label={item.label} href={item.href} />
          ))}
        </div>
      </div>
    </header>
  );
}
