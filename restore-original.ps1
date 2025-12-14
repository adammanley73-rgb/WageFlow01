# restore-original.ps1

# Overwrite components/employees/EmployeePicker.tsx with its original contents
$employeePicker = @"
"use client"

import React, { useMemo } from "react"

type Option = { id: string; name: string }

export type EmployeePickerProps = {
  value?: string
  onSelect?: (employeeId: string) => void
  options?: Option[]
  placeholder?: string
}

/**
 * Minimal preview-safe picker.
 * Works both with and without props.
 * If no options are passed, shows a tiny mock list.
 */
export default function EmployeePicker({
  value,
  onSelect,
  options,
  placeholder = "Select employee"
}: EmployeePickerProps) {
  const items = useMemo<Option[]>(
    () =>
      options && options.length
        ? options
        : [
            { id: "emp-001", name: "Alex Carter" },
            { id: "emp-002", name: "Jamie Patel" },
            { id: "emp-003", name: "Sam O'Neill" }
          ],
    [options]
  )

  return (
    <div className="inline-flex items-center gap-2">
      <label className="text-sm text-gray-600">Employee</label>
      <select
        className="border rounded px-2 py-1 text-sm"
        aria-label="Employee"
        value={value ?? ""}
        onChange={(e) => onSelect?.(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {items.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  )
}
"@
$employeePicker | Set-Content -Path ".\components\employees\EmployeePicker.tsx" -Encoding UTF8

# Overwrite lib/storeVersion.ts with its original contents
$storeVersion = @"
/* @ts-nocheck */
/**
 * Preview-safe shim for absence storage and version helpers.
 * Exports expected by pages:
 *   ensureStoreReady, readAbsences, writeAbsences
 * Also provides getStoreVersion, bumpStoreVersion, storeVersion, default export.
 * No real persistence. In-memory only.
 */

const VERSION = "preview-0"

// tiny state bucket to survive hot reloads in dev
const G = globalThis as any
if (!G.__WF_PREVIEW__) G.__WF_PREVIEW__ = {}
if (!G.__WF_PREVIEW__.absences) G.__WF_PREVIEW__.absences = []

export function getStoreVersion(): string {
  return VERSION
}

export async function bumpStoreVersion(): Promise<string> {
  return VERSION
}

export const storeVersion = VERSION
export default VERSION

/** Always resolves true. Creates preview buckets if missing. */
export async function ensureStoreReady(): Promise<boolean> {
  if (!G.__WF_PREVIEW__) G.__WF_PREVIEW__ = {}
  if (!G.__WF_PREVIEW__.absences) G.__WF_PREVIEW__.absences = []
  return true
}

/** Returns a shallow copy for UI preview. */
export async function readAbsences(): Promise<any[]> {
  await ensureStoreReady()
  const list = G.__WF_PREVIEW__.absences || []
  return Array.isArray(list) ? [...list] : []
}

/**
 * Replaces the preview absences list.
 * Accepts array or single item. Returns the new list.
 */
export async function writeAbsences(input: any | any[]): Promise<any[]> {
  await ensureStoreReady()
  const next = Array.isArray(input) ? input : [input]
  G.__WF_PREVIEW__.absences = next.filter(Boolean)
  return [...G.__WF_PREVIEW__.absences]
}
"@
$storeVersion | Set-Content -Path ".\lib\storeVersion.ts" -Encoding UTF8

# Overwrite lib/statutory/spbp.ts with its original contents
$spbp = @"
/* @ts-nocheck */
/**
 * Preview-safe SPBP shim.
 * Accepts both {awe} and {weeklyEarnings}. Extra keys ignored.
 * Not production logic.
 */

export type SpbpInput = {
  awe?: number
  weeklyEarnings?: number
  days?: number
  taxYear?: string
  startDate?: string
}

export type SpbpResult = {
  eligible: boolean
  dailyRate: number
  days: number
  gross: number
  notes: string[]
}

export function calcSPBP(input: SpbpInput = {}): SpbpResult {
  const days =
    Number.isFinite(input.days) && input.days! > 0 ? Math.min(10, input.days!) : 10

  const awe =
    typeof input.awe === "number" && input.awe > 0
      ? input.awe
      : typeof input.weeklyEarnings === "number" && input.weeklyEarnings > 0
      ? input.weeklyEarnings
      : NaN

  const daily = Number.isFinite(awe) ? Math.min(awe / 7, 30) : 30
  const gross = Number((daily * days).toFixed(2))

  return {
    eligible: true,
    dailyRate: Number(daily.toFixed(2)),
    days,
    gross,
    notes: [
      "preview-stub: eligibility forced true",
      `taxYear=${input.taxYear ?? "unspecified"}`,
      `startDate=${input.startDate ?? "ignored-in-preview"}`
    ]
  }
}

export default { calcSPBP }
"@
$spbp | Set-Content -Path ".\lib\statutory\spbp.ts" -Encoding UTF8

# Overwrite components/ui/HeaderBanner.tsx with its original contents
$headerBanner = @"
// components/ui/HeaderBanner.tsx
// Banner with logo, title, and context-aware nav chips.
// Accepts a currentSection prop to hide the active section from chips.
// On Dashboard: show Employees, Payroll, Absence, Settings.
// On other pages: show Dashboard first and hide the current page; no Settings chip.

import React from "react";
import Link from "next/link";

type Section = "dashboard" | "employees" | "payroll" | "absence" | "settings";

// Loosen type so pages like "companies" don't throw TS errors.
// Unknown sections will simply not be hidden from the chips list.
type HeaderBannerProps = {
  title?: string;
  currentSection?: Section | string;
};

const chipBase =
  "inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-colors w-32 text-center";
const container =
  "mx-auto mb-6 mt-2 w-full max-w-6xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm";
const titleCls = "text-5xl font-extrabold tracking-tight text-neutral-900";
const row = "flex items-center justify-between gap-4";
const left = "flex items-center gap-4";
const logoCls = "h-16 w-16 rounded-lg object-contain bg-transparent";
const chipsRow = "flex items-center gap-3";

function chipsFor(section: string | undefined): { label: string; href: string; key: Section }[] {
  const base: { label: string; href: string; key: Section }[] = [
    { label: "Dashboard", href: "/dashboard", key: "dashboard" },
    { label: "Employees", href: "/dashboard/employees", key: "employees" },
    { label: "Payroll", href: "/dashboard/payroll", key: "payroll" },
    { label: "Absence", href: "/dashboard/absence", key: "absence" },
  ];

  if (section === "dashboard") {
    // On Dashboard include Settings and omit Dashboard chip
    return [
      { label: "Employees", href: "/dashboard/employees", key: "employees" },
      { label: "Payroll", href: "/dashboard/payroll", key: "payroll" },
      { label: "Absence", href: "/dashboard/absence", key: "absence" },
      { label: "Settings", href: "/dashboard/settings", key: "settings" },
    ];
  }

  // On other pages hide the current page chip if it matches a known key
  const known = new Set<Section>(["dashboard", "employees", "payroll", "absence", "settings"]);
  if (section && known.has(section as Section)) {
    return base.filter((c) => c.key !== (section as Section));
  }

  // For unknown sections like "companies", show all standard chips (keeps Settings off non-dashboard)
  return base;
}

function humanizeTitle(section?: string): string {
  if (!section) return "Dashboard";
  if (section === section.toLowerCase()) {
    // capitalize first letter only, keep simple
    return section.charAt(0).toUpperCase() + section.slice(1);
  }
  return section;
}

export default function HeaderBanner({
  title,
  currentSection = "dashboard",
}: HeaderBannerProps) {
  const chips = chipsFor(currentSection);
  const heading = title ?? humanizeTitle(currentSection);

  return (
    <div className={container}>
      <div className={row}>
        <div className={left}>
          <img
            src="/WageFlowLogo.png"
            alt="WageFlow logo"
            className={logoCls}
            loading="eager"
          />
          <h1 className={titleCls}>{heading}</h1>
        </div>

        <nav className={chipsRow} aria-label="Primary">
          {chips.map((c) => (
            <Link key={c.key} href={c.href} className={chipBase}>
              {c.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
"@
$headerBanner | Set-Content -Path ".\components\ui\HeaderBanner.tsx" -Encoding UTF8

# Overwrite lib/env.ts with its original contents
$env = @"
// @ts-nocheck
/* preview: auto-suppressed to keep Preview builds green. */
/* @ts-nocheck */
type BuildProfile = 'preview' | 'prod';

function readProfile(): BuildProfile {
  const raw = process.env.BUILD_PROFILE?.toLowerCase();
  if (raw === 'prod') return 'prod';
  return 'preview';
}

const profile = readProfile();

export const env = {
  profile,
  preview: profile === 'preview',
  prod: profile === 'prod',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE || '',
} as const;
"@
$env | Set-Content -Path ".\lib\env.ts" -Encoding UTF8

# Step 3: Clean and build
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build

# Step 4: Commit and push if build passes
if ($LASTEXITCODE -eq 0) {
    git add components/employees/EmployeePicker.tsx lib/storeVersion.ts lib/statutory/spbp.ts components/ui/HeaderBanner.tsx lib/env.ts
    git commit -m "chore: restore original EmployeePicker, storeVersion, spbp, HeaderBanner, and env"
    git push origin main
} else {
    Write-Host "Restore build failed; fix errors before committing."
}
