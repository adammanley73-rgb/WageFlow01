// C:\Users\adamm\Projects\wageflow01\app\dashboard\page.tsx

import Link from "next/link";
import { Inter } from "next/font/google";
import PageTemplate from "@/components/layout/PageTemplate";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

type Counts = {
  employeeCount: number;
  payrollRunCount: number;
  absenceRecordCount: number;
  employees?: number;
  runs?: number;
  absences?: number;
};

async function getCounts(): Promise<Counts> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const url = base ? `${base}/api/counts` : "/api/counts";

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        employeeCount: 0,
        payrollRunCount: 0,
        absenceRecordCount: 0,
      };
    }

    const data = (await res.json()) as Partial<Counts>;

    return {
      employeeCount:
        typeof data.employeeCount === "number"
          ? data.employeeCount
          : typeof data.employees === "number"
          ? data.employees
          : 0,
      payrollRunCount:
        typeof data.payrollRunCount === "number"
          ? data.payrollRunCount
          : typeof data.runs === "number"
          ? data.runs
          : 0,
      absenceRecordCount:
        typeof data.absenceRecordCount === "number"
          ? data.absenceRecordCount
          : typeof data.absences === "number"
          ? data.absences
          : 0,
    };
  } catch (err) {
    console.error("getCounts error:", err);
    return {
      employeeCount: 0,
      payrollRunCount: 0,
      absenceRecordCount: 0,
    };
  }
}

function StatValue(props: { label: string; value: string | number }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center">
      <div className="text-sm font-semibold text-neutral-900">
        {props.label}
      </div>
      <div
        className={`${inter.className} mt-2 text-[27px] leading-none font-semibold`}
      >
        {props.value}
      </div>
    </div>
  );
}

function StatTile(props: { label: string; value: string | number }) {
  return (
    <div
      className="h-full rounded-2xl ring-1 border bg-neutral-300 ring-neutral-400 border-neutral-400 p-4"
      style={{ backgroundColor: "#d4d4d4" }}
    >
      <StatValue label={props.label} value={props.value} />
    </div>
  );
}

function GreyTile(props: {
  title: string;
  description?: string;
  href?: string;
}) {
  const body = (
    <div
      className="h-full rounded-2xl ring-1 border bg-neutral-300 ring-neutral-400 border-neutral-400 p-4"
      style={{ backgroundColor: "#d4d4d4" }}
    >
      <div className="flex h-full w-full flex-col items-center text-center">
        <div className="text-base font-semibold text-neutral-900 min-h-[22px] flex items-end">
          {props.title}
        </div>
        <div className="mt-2 text-sm text-neutral-800 leading-snug min-h-[36px] w-full">
          {props.description ?? ""}
        </div>
        <div className="mt-auto" />
      </div>
    </div>
  );

  return props.href ? (
    <Link
      href={props.href}
      className="block transition-transform hover:-translate-y-0.5"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function DashboardPage() {
  const counts = await getCounts();

  return (
    <PageTemplate title="Dashboard" currentSection="Dashboard">
      <div className="grid grid-rows-2 gap-3 flex-1 min-h-0">
        {/* Row 1: three KPIs driven by /api/counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 h-full min-h-0">
          <StatTile label="Employees" value={counts.employeeCount} />
          <StatTile label="Payroll runs" value={counts.payrollRunCount} />
          <StatTile label="Absence records" value={counts.absenceRecordCount} />
        </div>

        {/* Row 2: four wizard tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 h-full min-h-0">
          <GreyTile
            title="New Employees Wizard"
            description="Create and onboard new employees."
            href="/dashboard/employees/new"
          />
          <GreyTile
            title="Leaver Wizard"
            description="Process leavers with a guided flow."
            href="/dashboard/employees"
          />
          <GreyTile
            title="New Absence Wizard"
            description="Record sickness, holiday, or other absences."
            href="/dashboard/absence/new"
          />
          <GreyTile
            title="Payroll Run Wizard"
            description="Start a guided payroll run."
            href="/dashboard/payroll/new"
          />
        </div>
      </div>
    </PageTemplate>
  );
}
