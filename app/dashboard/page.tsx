/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

type Counts = {
  employeeCount: number;
  payrollRunCount: number;
  absenceRecordCount: number;
};

type CountsResponse = {
  ok?: boolean;
  activeCompanyId?: string | null;
  counts?: Partial<Counts>;
  employeeCount?: number;
  payrollRunCount?: number;
  absenceRecordCount?: number;
};

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("dashboard: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

async function getActiveCompanyName(): Promise<string | null> {
  try {
    const jar = cookies();

    const activeCompanyId =
      jar.get("active_company_id")?.value ??
      jar.get("company_id")?.value ??
      null;

    if (!activeCompanyId) {
      return null;
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", activeCompanyId)
      .maybeSingle();

    if (error || !data) {
      console.error("dashboard: error loading active company", error);
      return null;
    }

    return data.name ?? null;
  } catch (err) {
    console.error("dashboard: admin client error", err);
    return null;
  }
}

async function getCounts(): Promise<Counts> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const url = base ? `${base}/api/counts` : "/api/counts";

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("dashboard: /api/counts returned", res.status);
      return {
        employeeCount: 0,
        payrollRunCount: 0,
        absenceRecordCount: 0,
      };
    }

    const raw = (await res.json()) as CountsResponse;

    const fromNested = raw.counts ?? {};
    const employeeCount =
      typeof fromNested.employeeCount === "number"
        ? fromNested.employeeCount
        : typeof raw.employeeCount === "number"
        ? raw.employeeCount
        : 0;

    const payrollRunCount =
      typeof fromNested.payrollRunCount === "number"
        ? fromNested.payrollRunCount
        : typeof raw.payrollRunCount === "number"
        ? raw.payrollRunCount
        : 0;

    const absenceRecordCount =
      typeof fromNested.absenceRecordCount === "number"
        ? fromNested.absenceRecordCount
        : typeof raw.absenceRecordCount === "number"
        ? raw.absenceRecordCount
        : 0;

    return {
      employeeCount,
      payrollRunCount,
      absenceRecordCount,
    };
  } catch (err) {
    console.error("dashboard: getCounts error", err);
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
  const [counts, activeCompanyName] = await Promise.all([
    getCounts(),
    getActiveCompanyName(),
  ]);

  return (
    <PageTemplate title="Dashboard" currentSection="Dashboard">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        {/* Active company banner */}
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          {activeCompanyName ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg sm:text-xl text-[#0f3c85]">
                <span className="font-semibold">Active company:</span>{" "}
                <span className="font-bold">{activeCompanyName}</span>
              </p>
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
              >
                Change company
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm sm:text-base text-neutral-800">
                No active company selected. Go to the Companies page to choose
                one.
              </p>
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
              >
                Select company
              </Link>
            </div>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-rows-2 gap-3 flex-1 min-h-0">
          {/* Row 1: three KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 h-full min-h-0">
            <StatTile label="Employees" value={counts.employeeCount} />
            <StatTile label="Payroll runs" value={counts.payrollRunCount} />
            <StatTile
              label="Absence records"
              value={counts.absenceRecordCount}
            />
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
      </div>
    </PageTemplate>
  );
}
