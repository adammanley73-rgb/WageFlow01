/* @ts-nocheck */
export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

type Counts = {
  employees: number;
  runs_active: number;
  runs_current_period: number;
  tasks: number;
  notices: number;
};

const NAV_CHIP =
  'w-32 text-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const BTN_PRIMARY =
  'w-44 text-center inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-white';

/**
 * One notch darker cards: neutral-300 with neutral-400 ring.
 * Titles prominent. Non-numeric text uses Manrope; numbers use Inter at 75% size.
 */
const CARD_TITLE = 'text-base font-semibold text-neutral-950';
const CARD_BASE =
  'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-5 flex flex-col items-center text-center';
const CARD_STATS = `${CARD_BASE} min-h-[150px] justify-between`;
const CARD_ACTIONS = `${CARD_BASE} h-[165px] w-full justify-between`;

function StatCard({
  title,
  value,
  ctaText,
  ctaHref,
}: {
  title: string;
  value: number | string;
  ctaText: string;
  ctaHref: string;
}) {
  return (
    <div className={CARD_STATS}>
      <div className={`min-h-[22px] ${CARD_TITLE}`}>{title}</div>
      {/* 4xl ≈ 36px. 75% = 27px */}
      <div className="text-[27px] leading-none font-[var(--font-inter,inherit)]">
        {value}
      </div>
      <Link href={ctaHref} className={BTN_PRIMARY}>
        {ctaText}
      </Link>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className={CARD_ACTIONS}>
      {/* Title at top */}
      <div className={CARD_TITLE}>{title}</div>

      {/* Descriptor vertically centered between title and button */}
      <div className="flex-1 flex items-center">
        <p className="w-full px-2 text-sm text-neutral-900">{desc}</p>
      </div>

      {/* Button pinned to bottom, uniform width */}
      <Link href={href} className={BTN_PRIMARY}>
        {cta}
      </Link>
    </div>
  );
}

async function countEmployeesDirect(): Promise<number> {
  const url = process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    '';
  const companyId = process.env.COMPANY_ID || '';
  if (!url || !key || !companyId) return 0;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { count, error } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) return 0;
  return count ?? 0;
}

async function getCounts(): Promise<Counts> {
  try {
    const res = await fetch('/api/counts', { cache: 'no-store' });
    const ok = res.ok;
    const data = ok ? ((await res.json()) as any) : {};

    // Prefer API if it returns a positive number; otherwise fall back to direct count.
    let employees = Number(data?.employees ?? 0);
    if (!Number.isFinite(employees) || employees < 0) employees = 0;
    if (employees === 0) {
      const direct = await countEmployeesDirect();
      if (direct > 0) employees = direct;
    }

    return {
      employees,
      runs_active: Number(data?.runs_active ?? data?.runs ?? 0),
      runs_current_period: Number(data?.runs_current_period ?? 0),
      tasks: Number(data?.tasks ?? 0),
      notices: Number(data?.notices ?? 0),
    };
  } catch {
    // Hard fallback to direct count only
    const employees = await countEmployeesDirect();
    return {
      employees,
      runs_active: 0,
      runs_current_period: 0,
      tasks: 0,
      notices: 0,
    };
  }
}

export default async function DashboardPage() {
  const counts = await getCounts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-300 via-teal-400 to-blue-600 font-[var(--font-manrope,inherit)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header banner */}
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow"
              width={64}
              height={64}
              priority
            />
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">Dashboard</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/employees" className={NAV_CHIP}>
              Employees
            </Link>
            <Link href="/dashboard/payroll" className={NAV_CHIP}>
              Payroll
            </Link>
            <Link href="/dashboard/absence" className={NAV_CHIP}>
              Absence
            </Link>
            <Link href="/dashboard/settings" className={NAV_CHIP}>
              Settings
            </Link>
          </nav>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title="Employees"
            value={counts.employees}
            ctaText="View Employees"
            ctaHref="/dashboard/employees"
          />
          <StatCard
            title="Payroll Runs"
            value={counts.runs_active}
            ctaText="Go to Payroll"
            ctaHref="/dashboard/payroll"
          />
          <StatCard
            title="Pending Tasks"
            value={counts.tasks}
            ctaText="View Tasks"
            ctaHref="/dashboard"
          />
          <StatCard
            title="Notices"
            value={counts.notices}
            ctaText="View Notices"
            ctaHref="/dashboard"
          />
        </div>

        {/* Actions row */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <ActionCard
            title="New Employee Wizard"
            desc="Create a new employee record."
            href="/dashboard/employees/new"
            cta="Open Wizard"
          />
          <ActionCard
            title="View Employees"
            desc="Browse and edit your employee list."
            href="/dashboard/employees"
            cta="View Employees"
          />
          <ActionCard
            title="Run Payroll"
            desc="Start a weekly or monthly run."
            href="/dashboard/payroll"
            cta="Go to Payroll"
          />
          <ActionCard
            title="Record Absence"
            desc="Log sickness or annual leave."
            href="/dashboard/absence"
            cta="Go to Absences"
          />
        </div>
      </div>
    </div>
  );
}

