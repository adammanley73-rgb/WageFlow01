/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\components\ui\HeaderBanner.tsx

import Link from "next/link";
import Image from "next/image";
import { AiStatusBadge } from "@/components/ui/AiStatusBadge";

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

  if (currentSection === "Dashboard") {
    items.push({
      key: "Settings",
      label: "Settings",
      href: "/dashboard/settings",
    });
  }

  return items.filter((item) => item.key !== currentSection);
}

function NavChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        backgroundColor: "var(--wf-blue)",
        borderColor: "var(--wf-blue)",
      }}
      className="inline-flex h-9 w-32 items-center justify-center rounded-full border text-sm font-medium text-white transition hover:opacity-95"
    >
      {label}
    </Link>
  );
}

export default function HeaderBanner({ title, currentSection }: HeaderBannerProps) {
  const navItems = buildNav(currentSection);

  return (
    <header className="rounded-3xl bg-white px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20">
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow logo"
              fill
              className="rounded-2xl object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <h1
              className="text-3xl sm:text-4xl font-extrabold leading-tight"
              style={{ color: "var(--wf-blue)" }}
            >
              {title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:hidden">
          <AiStatusBadge />
          {navItems.map((item) => (
            <NavChip key={item.key} label={item.label} href={item.href} />
          ))}
        </div>

        <div className="hidden sm:flex sm:flex-row sm:items-center sm:gap-3 sm:justify-end">
          <AiStatusBadge />
          <div className="flex flex-wrap justify-end gap-2">
            {navItems.map((item) => (
              <NavChip key={item.key} label={item.label} href={item.href} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
