// File: app/dashboard/page.tsx
// Dashboard with larger title, uniform tiles, consistent title styling,
// and action tiles that float on hover.

import Image from 'next/image'
import Link from 'next/link'
import { Inter, Manrope } from 'next/font/google'

export const revalidate = 0

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export default function DashboardPage() {
  return (
    <main
      className={`${manrope.className} min-h-screen w-full`}
      style={{
        background:
          'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
      }}
    >
      {/* Header banner (not full width) */}
      <header className="w-full pt-6 pb-4">
        <div className="mx-auto w-[min(1100px,92vw)] rounded-2xl bg-white shadow-md px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: logo + title */}
            <div className="flex items-center gap-3">
              <Image
                src="/WageFlowLogo.png"
                alt="WageFlow"
                width={64}
                height={64}
                className="h-16 w-auto"
                priority
              />
              <h1
                className="text-5xl font-extrabold"
                style={{ color: '#1e40af' }}
              >
                Dashboard
              </h1>
            </div>

            {/* Right: 4 uniform nav buttons in logo blue */}
            <nav className="hidden md:flex items-center gap-3">
              <HeaderNavLink href="/dashboard/employees" label="Employees" />
              <HeaderNavLink href="/dashboard/payroll" label="Payroll" />
              <HeaderNavLink href="/dashboard/absence" label="Absence" />
              <HeaderNavLink href="/dashboard/settings" label="Settings" />
            </nav>

            {/* Mobile: condensed menu links */}
            <nav className="md:hidden grid grid-cols-2 gap-2 w-[min(320px,60vw)]">
              <HeaderNavLink href="/dashboard/employees" label="Employees" compact />
              <HeaderNavLink href="/dashboard/payroll" label="Payroll" compact />
              <HeaderNavLink href="/dashboard/absence" label="Absence" compact />
              <HeaderNavLink href="/dashboard/settings" label="Settings" compact />
            </nav>
          </div>
        </div>
      </header>

      {/* Content container */}
      <section className="mx-auto w-[min(1100px,92vw)] pb-12">
        {/* Stat tiles */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile title="Employees" value="0" />
          <StatTile title="Open Payroll Runs" value="0" />
          <StatTile title="Absence Requests" value="0" />
          <StatTile title="PAYE" value="£0.00" />
        </div>

        {/* Quick actions row */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionTile
            title="New Employee Wizard"
            href="/dashboard/employees/new"
            description="Create a new employee record"
          />
          <ActionTile
            title="Record Absence"
            href="/dashboard/absence/new/sickness"
            description="Sickness, parental, or other leave"
          />
          <ActionTile
            title="Payroll Wizard"
            href="/dashboard/payroll/new"
            description="Create a new payroll run"
          />
          <ActionTile
            title="Reports"
            href="/dashboard/reports"
            description="Export summaries and audits"
          />
        </div>
      </section>
    </main>
  )
}

/* --- components in-file for a single-page drop-in --- */

function HeaderNavLink({
  href,
  label,
  compact,
}: {
  href: string
  label: string
  compact?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-xl text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        backgroundColor: '#1e40af',
        width: compact ? '7.5rem' : '8rem',
        height: compact ? '2.25rem' : '2.5rem',
      }}
    >
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  )
}

const tileBase =
  "rounded-2xl bg-white/95 shadow-sm ring-1 ring-neutral-300 p-5 flex flex-col items-center justify-center text-center h-44";

function StatTile({ title, value }: { title: string; value: string }) {
  return (
    <div className={tileBase}>
      <div className="text-base font-bold" style={{ color: '#111827' }}>
        {title}
      </div>
      <div className="mt-2">
        <span className={`${inter.className} text-[27px] font-extrabold tracking-tight`}>
          {value}
        </span>
      </div>
    </div>
  )
}

function ActionTile({
  title,
  href,
  description,
}: {
  title: string
  href: string
  description: string
}) {
  return (
    <Link
      href={href}
      className={`${tileBase} transition-transform transform hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2`}
    >
      <div className="text-base font-bold" style={{ color: '#111827' }}>
        {title}
      </div>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
    </Link>
  )
}
