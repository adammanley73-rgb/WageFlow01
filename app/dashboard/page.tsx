// C:\Projects\wageflow01\app\dashboard\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import { getServerSupabase } from "@/lib/supabase/server";

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

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
  );
}

async function getActiveCompanyId(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;

  if (!v) return null;

  const trimmed = String(v).trim();
  return isUuid(trimmed) ? trimmed : null;
}

async function getCountsForCompany(companyId: string): Promise<Counts> {
  const supabase = await getServerSupabase();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return { employeeCount: 0, payrollRunCount: 0, absenceRecordCount: 0 };
  }

  const { data: membership, error: memErr } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr || !membership) {
    return { employeeCount: 0, payrollRunCount: 0, absenceRecordCount: 0 };
  }

  const [employeesRes, payrollRunsRes, absencesRes] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("payroll_runs").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("absences").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);

  return {
    employeeCount: employeesRes.count ?? 0,
    payrollRunCount: payrollRunsRes.count ?? 0,
    absenceRecordCount: absencesRes.count ?? 0,
  };
}

function StatValue(props: { label: string; value: string | number }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center">
      <div className="text-sm font-semibold text-neutral-900">{props.label}</div>
      <div className={inter.className + " mt-2 text-[27px] leading-none font-semibold"}>
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

function GreyTile(props: { title: string; description?: string; href?: string }) {
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
    <Link href={props.href} className="block transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  );
}

export default async function DashboardPage() {
  const companyId = await getActiveCompanyId();
  const counts = companyId
    ? await getCountsForCompany(companyId)
    : { employeeCount: 0, payrollRunCount: 0, absenceRecordCount: 0 };

  return (
    <PageTemplate title="Dashboard" currentSection="dashboard">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        {!companyId ? (
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">No active company selected</div>
            <div className="mt-1 text-sm text-neutral-700">
              Select a company, then return to the Dashboard.
            </div>
          </div>
        ) : null}

        <div className="grid grid-rows-2 gap-3 flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 h-full min-h-0">
            <StatTile label="Employees" value={counts.employeeCount} />
            <StatTile label="Payroll runs" value={counts.payrollRunCount} />
            <StatTile label="Absence records" value={counts.absenceRecordCount} />
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