/* app/dashboard/payroll/page.tsx */
import Link from "next/link";

function StatTile(props: { label: string; value: number | string }) {
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

function GreyActionTile(props: { title: string; desc: string; href: string; cta: string }) {
  return (
    <div
      className="h-full rounded-2xl ring-1 border bg-neutral-300 ring-neutral-400 border-neutral-400 p-6"
      style={{ backgroundColor: "#d4d4d4" }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center text-center">
        <div className="text-base font-semibold text-neutral-900">{props.title}</div>
        <div className="mt-2 text-sm text-neutral-800 max-w-[38ch]">{props.desc}</div>
        <Link
          href={props.href}
          className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 ring-1 ring-neutral-500 hover:shadow-sm bg-white text-neutral-900"
        >
          {props.cta}
        </Link>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Top stat tiles: Open runs, Completed, Approved, RTI submitted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Open runs" value={0} />
        <StatTile label="Completed" value={0} />
        <StatTile label="Approved" value={0} />
        <StatTile label="RTI submitted" value={0} />
      </div>

      {/* Bottom tiles: now grey to match top row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GreyActionTile
          title="New Payroll Wizard"
          desc="Create, review and approve payroll runs."
          href="/dashboard/payroll/new"
          cta="Open wizard"
        />
        <GreyActionTile
          title="View runs"
          desc="Browse all payroll runs and their statuses."
          href="/dashboard/payroll/runs"
          cta="Open runs"
        />
      </div>
    </div>
  );
}
/* app/dashboard/payroll/page.tsx */
