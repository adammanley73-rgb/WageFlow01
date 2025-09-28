// components/layout/PageTemplate.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode, useMemo } from "react";

type Section = "Dashboard" | "Employees" | "Payroll" | "Absence" | "Settings";
type StatTile = { label: string; value: number | string };
type ActionTile = { label: string; href: string };

interface Props {
  currentSection: Section;
  hideCurrentChip?: boolean;
  showSettingsChip?: boolean;
  statTiles?: StatTile[];
  actionTiles?: ActionTile[];
  statColsMd?: 1 | 2 | 3 | 4;
  actionColsMd?: 1 | 2 | 3 | 4;
  children?: ReactNode;
}

const COLS_MD: Record<1 | 2 | 3 | 4, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export default function PageTemplate({
  currentSection,
  hideCurrentChip = true,
  showSettingsChip = false,
  statTiles = [],
  actionTiles = [],
  statColsMd = 4,
  actionColsMd = 3,
  children,
}: Props) {
  const allNav: { label: Section; href: string; show: boolean }[] = [
    { label: "Dashboard", href: "/dashboard", show: true },
    { label: "Employees", href: "/dashboard/employees", show: true },
    { label: "Payroll",   href: "/dashboard/payroll",   show: true },
    { label: "Absence",   href: "/dashboard/absence",   show: true },
    { label: "Settings",  href: "/dashboard/settings",  show: showSettingsChip },
  ];

  const nav = useMemo(
    () =>
      allNav.filter(
        item => !(hideCurrentChip && item.label === currentSection) && item.show
      ),
    [allNav, hideCurrentChip, currentSection]
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#10b981] to-[#1e40af]">
      {/* Header banner */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="rounded-2xl bg-white ring-1 ring-neutral-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <Image
                src="/WageFlowLogo.png"
                alt="WageFlow"
                width={64}
                height={64}
                priority
              />
              <h1 className="text-4xl font-semibold text-blue-900">
                {currentSection}
              </h1>
            </div>

            <nav className="flex items-center gap-3">
              {nav.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={[
                    "inline-flex h-10 w-32 items-center justify-center rounded-full",
                    "bg-blue-800 text-white text-sm font-medium",
                    "ring-1 ring-blue-900/20 shadow-sm",
                    "transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 pb-10">
        {statTiles.length > 0 && (
          <div className={["mt-6 grid grid-cols-1 gap-4", COLS_MD[statColsMd]].join(" ")}>
            {statTiles.map(t => (
              <div
                key={t.label}
                className="flex flex-col items-center justify-center rounded-2xl bg-neutral-300 p-4 text-center ring-1 ring-neutral-400"
              >
                <div className="text-sm text-neutral-700">{t.label}</div>
                <div className="mt-1 text-[27px] leading-none font-semibold [font-family:var(--font-inter,inherit)]">
                  {t.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {actionTiles.length > 0 && (
          <div className={["mt-6 grid grid-cols-1 gap-4", COLS_MD[actionColsMd]].join(" ")}>
            {actionTiles.map(a => (
              <Link
                key={a.label}
                href={a.href}
                className={[
                  "mx-auto inline-flex h-16 w-44 items-center justify-center rounded-2xl",
                  "bg-white text-blue-900 text-lg font-medium",
                  "ring-1 ring-neutral-200 shadow-sm",
                  "transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400",
                  "text-center",
                ].join(" ")}
              >
                {a.label}
              </Link>
            ))}
          </div>
        )}

        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
