/* app/dashboard/page.tsx */
import Link from "next/link";
import PageTemplate from "@/components/layout/PageTemplate";

function StatTile(props: { label: string; value: string | number }) {
  return (
    <div
      className="h-full rounded-2xl ring-1 border bg-neutral-300 ring-neutral-400 border-neutral-400 p-4"
      style={{ backgroundColor: "#d4d4d4" }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center text-center">
        <div className="text-sm font-semibold text-neutral-900">{props.label}</div>
        <div className="mt-2 text-[27px] leading-none font-semibold">{props.value}</div>
      </div>
    </div>
  );
}

function GreyTile(props: { title: string; description?: string; href?: string }) {
  const body = (
    <div
      className="h-full rounded-2xl ring-1 border bg-neutral-300 ring-neutral-400 border-neutral-400 p-4"
      style={{ backgroundColor: "#d4d4d4" }}
    >
      <div className="flex h-full w-full flex-col items-center text-center">
        <div className="text-base font-semibold text-neutral-900 min-h-[22px] flex items-end">{props.title}</div>
        <div className="mt-2 text-sm text-neutral-800 leading-snug min-h-[36px] w-full">
          {props.description ?? ""}
        </div>
        <div className="mt-auto" />
      </div>
    </div>
  );
  return props.href ? (
    <Link href={props.href} className="block hover:-translate-y-0.5 transition-transform">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function DashboardPage() {
  return (
    <PageTemplate title="Dashboard" currentSection="Dashboard">
      <div className="grid grid-rows-4 gap-3 flex-1 min-h-0">
        {/* Row 1: three KPIs spread across header width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 h-full min-h-0">
          <StatTile label="Employees" value={0} />
          <StatTile label="Pending Tasks" value={0} />
          <StatTile label="Notices" value={0} />
        </div>

        {/* Row 2: Employees pair */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full min-h-0">
          <GreyTile title="New Employee Wizard" description="Create a new employee record" href="/dashboard/employees/new" />
          <GreyTile title="View Employees" description="Browse and edit your employee list" href="/dashboard/employees" />
        </div>

        {/* Row 3: Absence pair */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full min-h-0">
          <GreyTile title="Record New Absence Wizard" description="Log sickness or annual leave" href="/dashboard/absence/new" />
          <GreyTile title="View Absences" description="Browse absence records" href="/dashboard/absence" />
        </div>

        {/* Row 4: Payroll pair */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full min-h-0">
          <GreyTile title="Run Payroll Wizard" description="Start a weekly or monthly run" href="/dashboard/payroll/new" />
          <GreyTile title="View Payroll Runs" description="Browse all payroll runs" href="/dashboard/payroll" />
        </div>
      </div>
    </PageTemplate>
  );
}
