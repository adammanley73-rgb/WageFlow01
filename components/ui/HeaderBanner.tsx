"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type SectionKey = "Dashboard" | "Employees" | "Payroll" | "Absence" | "Settings";

/**
 * HeaderBanner
 * Pages render this exactly once inside PageTemplate's width wrapper.
 * Auto-detects the active section from the URL and hides its chip.
 * Shows Settings chip only on Dashboard.
 * No gradient or width logic here.
 */
export default function HeaderBanner() {
  const pathname = usePathname() || "/dashboard";
  const segments = pathname.split("/").filter(Boolean);
  const section = deriveSection(segments);

  const allChips: Array<{ key: SectionKey; label: string; href: string }> = [
    { key: "Dashboard", label: "Dashboard", href: "/dashboard" },
    { key: "Employees", label: "Employees", href: "/dashboard/employees" },
    { key: "Payroll", label: "Payroll", href: "/dashboard/payroll" },
    { key: "Absence", label: "Absence", href: "/dashboard/absence" },
    { key: "Settings", label: "Settings", href: "/dashboard/settings" },
  ];

  const visibleChips = allChips.filter((chip) => {
    if (chip.key === section) return false;
    if (chip.key === "Settings" && section !== "Dashboard") return false;
    return true;
  });

  const title = sectionTitle(section, segments);

  return (
    <div className="w-full rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
      {/* Title Row */}
      <div className="flex items-center gap-4 px-6 pt-6">
        <div className="shrink-0">
          <Image
            src="/wageflow-logo.png"
            alt="WageFlow"
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            priority
          />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
      </div>

      {/* Nav Chips */}
      <div className="flex flex-wrap items-center gap-3 px-6 pb-6 pt-4">
        {visibleChips.map((chip) => (
          <Link
            key={chip.key}
            href={chip.href}
            className="inline-flex h-9 w-32 items-center justify-center rounded-full border border-neutral-300 bg-neutral-50 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function deriveSection(segments: string[]): SectionKey {
  if (segments.length === 0) return "Dashboard";
  if (segments[0] !== "dashboard") return "Dashboard";

  const second = segments[1];
  if (!second) return "Dashboard";

  switch (second) {
    case "employees":
      return "Employees";
    case "payroll":
      return "Payroll";
    case "absence":
      return "Absence";
    case "settings":
      return "Settings";
    default:
      return "Dashboard";
  }
}

function sectionTitle(section: SectionKey, segments: string[]): string {
  const base: Record<SectionKey, string> = {
    Dashboard: "Dashboard",
    Employees: "Employees",
    Payroll: "Payroll",
    Absence: "Absence",
    Settings: "Settings",
  };

  if (section === "Absence") {
    const lower = segments.join("/").toLowerCase();
    if (lower.includes("wizard") || lower.endsWith("new")) {
      return "Absence";
    }
  }
  return base[section];
}
