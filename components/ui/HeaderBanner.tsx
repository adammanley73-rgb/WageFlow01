/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\components\ui\HeaderBanner.tsx

import Link from "next/link";
import Image from "next/image";
import { AiStatusBadge } from "@/components/ui/AiStatusBadge";

type HeaderMode = "default" | "wizard";

type HeaderBannerProps = {
  title: string;
  currentSection: string;
  mode?: HeaderMode;
  backHref?: string;
  backLabel?: string;
};

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "employees", label: "Employees", href: "/dashboard/employees" },
  { key: "payroll", label: "Payroll", href: "/dashboard/payroll" },
  { key: "absence", label: "Absence", href: "/dashboard/absence" },
  { key: "reports", label: "Reports", href: "/dashboard/reports" },
];

function normalizeSection(s: string) {
  const raw = String(s || "").trim();
  const lower = raw.toLowerCase();

  // Backwards compatibility if older pages pass "Dashboard" etc
  if (lower === "dashboard") return "dashboard";
  if (lower === "employees") return "employees";
  if (lower === "payroll") return "payroll";
  if (lower === "absence") return "absence";
  if (lower === "reports") return "reports";
  if (lower === "settings") return "settings";

  return lower || "dashboard";
}

function buildNav(currentSection: string) {
  const cur = normalizeSection(currentSection);
  const items = [...NAV_ITEMS];

  if (cur === "dashboard") {
    items.push({
      key: "settings",
      label: "Settings",
      href: "/dashboard/settings",
    });
  }

  return items.filter((item) => item.key !== cur);
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

export default function HeaderBanner({
  title,
  currentSection,
  mode = "default",
  backHref,
  backLabel,
}: HeaderBannerProps) {
  const navItems = mode === "wizard" ? [] : buildNav(currentSection);

  const safeBackHref =
    typeof backHref === "string" && backHref.trim() ? backHref.trim() : "/dashboard";
  const safeBackLabel =
    typeof backLabel === "string" && backLabel.trim() ? backLabel.trim() : "Back";

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

        {mode === "wizard" ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <NavChip label={safeBackLabel} href={safeBackHref} />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}
