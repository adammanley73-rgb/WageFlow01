// C:\Projects\wageflow01\app\dashboard\employees\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import EmployeesSearchTable from "./EmployeesSearchTable";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EmployeesPageProps = {
  searchParams?: Promise<{
    sort?: string;
    direction?: string;
    showLeavers?: string;
  }>;
};

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "")
  );
}

function formatSupabaseError(err: any) {
  const msg =
    err?.message ||
    err?.hint ||
    err?.details ||
    (typeof err === "string" ? err : "") ||
    "";

  if (msg) return String(msg);

  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

async function getActiveCompanyId(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;
  if (!v) return null;
  const trimmed = String(v).trim();
  return isUuid(trimmed) ? trimmed : null;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const activeCompanyId = await getActiveCompanyId();

  if (!activeCompanyId) {
    redirect("/dashboard/companies");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sortParam = resolvedSearchParams?.sort;
  const directionParam = resolvedSearchParams?.direction;
  const showLeaversParam = resolvedSearchParams?.showLeavers;

  const sortKey: "name" | "number" = sortParam === "number" ? "number" : "name";
  const sortDirection: "asc" | "desc" = directionParam === "desc" ? "desc" : "asc";
  const showLeavers = showLeaversParam === "1";

  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return (
      <PageTemplate title="Employees" currentSection="employees">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">Sign in required</div>
            <div className="mt-1 text-sm text-neutral-700">Please sign in again.</div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const { data: membership, error: membershipErr } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", activeCompanyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipErr || !membership) {
    return (
      <PageTemplate title="Employees" currentSection="employees">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">Company access denied</div>
            <div className="mt-1 text-sm text-neutral-700">
              You do not have access to the active company. Re-select a company.
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-full border border-neutral-400 bg-white px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
              >
                Go to company select
              </Link>
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  let employeesQuery = supabase
    .from("employees")
    .select("id, employee_number, first_name, last_name, email, ni_number, pay_frequency, status")
    .eq("company_id", activeCompanyId);

  if (sortKey === "number") {
    employeesQuery = employeesQuery
      .order("employee_number", { ascending: sortDirection === "asc" })
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });
  } else {
    employeesQuery = employeesQuery
      .order("last_name", { ascending: sortDirection === "asc" })
      .order("first_name", { ascending: sortDirection === "asc" })
      .order("employee_number", { ascending: true });
  }

  const { data: employeesData, error: employeesError } = await employeesQuery;

  const employees = Array.isArray(employeesData) ? employeesData : [];

  const loadError = employeesError
    ? process.env.NODE_ENV === "production"
      ? "There was a problem loading employees."
      : `There was a problem loading employees: ${formatSupabaseError(employeesError)}`
    : null;

  const visibleEmployees = showLeavers
    ? employees
    : employees.filter((emp) => (emp.status ?? "active") !== "leaver");

  const hasAnyEmployees = employees.length > 0;

  const currentSortParam = sortKey === "number" ? "number" : "name";
  const toggleShowLeaversHref = `/dashboard/employees?sort=${currentSortParam}&direction=${sortDirection}${showLeavers ? "" : "&showLeavers=1"}`;

  return (
    <PageTemplate title="Employees" currentSection="employees">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-900">Employees</div>
                <div className="text-xs text-neutral-700">
                  {showLeavers
                    ? "All employees for the active company, including leavers."
                    : "Active employees for the active company. Leavers are hidden by default."}
                </div>
              </div>

              <div className="flex items-center">
                <Link
                  href={toggleShowLeaversHref}
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    showLeavers
                      ? "border-neutral-400 bg-white text-neutral-800 hover:bg-neutral-100 focus-visible:ring-neutral-400"
                      : "border-[#0f3c85] bg-[#0f3c85] text-white hover:bg-[#0c2f68] focus-visible:ring-[#0f3c85]"
                  }`}
                >
                  {showLeavers ? "Hide leavers" : "Show leavers"}
                </Link>
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="px-4 py-3 text-sm text-red-800 bg-red-50 border-t border-red-200">
              {loadError}
            </div>
          ) : null}

          {visibleEmployees.length === 0 ? (
            <div className="px-4 py-4 text-sm text-neutral-700">
              {!hasAnyEmployees
                ? "No employees yet. Use the New Employee Wizard on the Dashboard to create your first record."
                : showLeavers
                ? "No employees found for this filter."
                : 'No active employees to show. You may only have leavers. Use "Show leavers" to view them.'}
            </div>
          ) : (
            <EmployeesSearchTable employees={visibleEmployees} />
          )}
        </div>
      </div>
    </PageTemplate>
  );
}