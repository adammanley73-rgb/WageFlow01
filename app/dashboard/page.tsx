/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const inter = Inter({
subsets: ["latin"],
display: "swap",
});

type Counts = {
employeeCount: number;
payrollRunCount: number;
absenceRecordCount: number;
};

function isDynamicServerUsage(err: any): boolean {
const digest = err?.digest;
const msg = String(err?.message || "");
const desc = String(err?.description || "");
return (
digest === "DYNAMIC_SERVER_USAGE" ||
msg.includes("Dynamic server usage") ||
desc.includes("Dynamic server usage")
);
}

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

if (!activeCompanyId) return null;

const supabase = createAdminClient();

const { data, error } = await supabase
  .from("companies")
  .select("id, name")
  .eq("id", activeCompanyId)
  .maybeSingle();

if (error || !data) {
  if (error && !isDynamicServerUsage(error)) {
    console.error("dashboard: error loading active company", error);
  }
  return null;
}

return data.name ?? null;


} catch (err) {
if (!isDynamicServerUsage(err)) {
console.error("dashboard: admin client error", err);
}
return null;
}
}

async function getCounts(): Promise<Counts> {
try {
const jar = cookies();

const activeCompanyId =
  jar.get("active_company_id")?.value ??
  jar.get("company_id")?.value ??
  null;

if (!activeCompanyId) {
  return {
    employeeCount: 0,
    payrollRunCount: 0,
    absenceRecordCount: 0,
  };
}

const supabase = createAdminClient();

const [employeesRes, payrollRunsRes, absencesRes] = await Promise.all([
  supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", activeCompanyId),
  supabase
    .from("payroll_runs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", activeCompanyId),
  supabase
    .from("absences")
    .select("id", { count: "exact", head: true })
    .eq("company_id", activeCompanyId),
]);

if (employeesRes.error && !isDynamicServerUsage(employeesRes.error)) {
  console.error("dashboard: employee count error", employeesRes.error);
}
if (payrollRunsRes.error && !isDynamicServerUsage(payrollRunsRes.error)) {
  console.error("dashboard: payroll run count error", payrollRunsRes.error);
}
if (absencesRes.error && !isDynamicServerUsage(absencesRes.error)) {
  console.error("dashboard: absence count error", absencesRes.error);
}

return {
  employeeCount: employeesRes.count ?? 0,
  payrollRunCount: payrollRunsRes.count ?? 0,
  absenceRecordCount: absencesRes.count ?? 0,
};


} catch (err) {
if (!isDynamicServerUsage(err)) {
console.error("dashboard: getCounts error", err);
}
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
className={
inter.className + " mt-2 text-[27px] leading-none font-semibold"
}
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

if (!props.href) return body;

return (
<Link href={props.href} className="block transition-transform hover:-translate-y-0.5" >
{body}
</Link>
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
<div className="rounded-2xl bg-white/80 px-4 py-4">
{activeCompanyName ? (
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
<p className="text-lg sm:text-xl text-[#0f3c85]">
<span className="font-semibold">Active company:</span>{" "}
<span className="font-bold">{activeCompanyName}</span>
</p>
<Link href="/dashboard/companies" className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]" >
Change company
</Link>
</div>
) : (
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
<p className="text-sm sm:text-base text-neutral-800">
No active company selected. Go to the Companies page to choose
one.
</p>
<Link href="/dashboard/companies" className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]" >
Select company
</Link>
</div>
)}
</div>

    <div className="grid grid-rows-2 gap-3 flex-1 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 h-full min-h-0">
        <StatTile label="Employees" value={counts.employeeCount} />
        <StatTile label="Payroll runs" value={counts.payrollRunCount} />
        <StatTile
          label="Absence records"
          value={counts.absenceRecordCount}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 h-full min-h-0">
        <GreyTile
          title="New Employees Wizard"
          description="Create and onboard new employees."
          href="/dashboard/employees/new"
        />
        <GreyTile
          title="Leaver Wizard"
          description="Process leavers with a guided flow."
          href="/dashboard/employees/leaver"
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