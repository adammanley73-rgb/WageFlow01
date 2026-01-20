/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function createAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("employees: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

type EmployeesPageProps = {
  searchParams?: {
    sort?: string;
    direction?: string;
    showLeavers?: string;
  };
};

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
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

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const jar = cookies();

  const activeCompanyId =
    jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;

  if (!activeCompanyId || !isUuid(String(activeCompanyId))) {
    redirect("/dashboard/companies");
  }

  const sortParam = searchParams?.sort;
  const directionParam = searchParams?.direction;
  const showLeaversParam = searchParams?.showLeavers;

  const sortKey: "name" | "number" = sortParam === "number" ? "number" : "name";
  const sortDirection: "asc" | "desc" =
    directionParam === "desc" ? "desc" : "asc";

  const showLeavers = showLeaversParam === "1";

  const supabase = createAdminClient();

  // Demo schema: employee_id does not exist. Use id only.
  let employeesQuery = supabase
    .from("employees")
    .select(
      "id, employee_number, first_name, last_name, email, ni_number, pay_frequency, status"
    )
    .eq("company_id", activeCompanyId);

  if (sortKey === "number") {
    employeesQuery = employeesQuery
      .order("employee_number", { ascending: sortDirection === "asc" })
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });
  } else {
    employeesQuery = employeesQuery
      .order("last_name", { ascending: sortDirection === "asc" })
      .order("first_name", { ascending: sortDirection === "asc" });
  }

  const { data: employeesData, error: employeesError } = await employeesQuery;

  const employees = Array.isArray(employeesData) ? employeesData : [];

  const loadError = employeesError
    ? process.env.NODE_ENV === "production"
      ? "There was a problem loading employees."
      : `There was a problem loading employees: ${formatSupabaseError(
          employeesError
        )}`
    : null;

  const visibleEmployees = showLeavers
    ? employees
    : employees.filter((emp) => (emp.status ?? "active") !== "leaver");

  const hasAnyEmployees = employees.length > 0;

  const isNameSorted = sortKey === "name";
  const isNumberSorted = sortKey === "number";

  const nextNameDirection =
    isNameSorted && sortDirection === "asc" ? "desc" : "asc";
  const nextNumberDirection =
    isNumberSorted && sortDirection === "asc" ? "desc" : "asc";

  const nameSortLabel = isNameSorted
    ? sortDirection === "asc"
      ? "Sort ↑"
      : "Sort ↓"
    : "Sort";

  const numberSortLabel = isNumberSorted
    ? sortDirection === "asc"
      ? "Sort ↑"
      : "Sort ↓"
    : "Sort";

  const currentSortParam = sortKey === "number" ? "number" : "name";

  const toggleShowLeaversHref = `/dashboard/employees?sort=${currentSortParam}&direction=${sortDirection}${
    showLeavers ? "" : "&showLeavers=1"
  }`;

  const nameSortHref = `/dashboard/employees?sort=name&direction=${nextNameDirection}${
    showLeavers ? "&showLeavers=1" : ""
  }`;

  const numberSortHref = `/dashboard/employees?sort=number&direction=${nextNumberDirection}${
    showLeavers ? "&showLeavers=1" : ""
  }`;

  return (
    <PageTemplate title="Employees" currentSection="employees">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  Employees
                </div>
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

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-200 text-xs font-semibold uppercase text-neutral-700">
                <tr>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>Emp no</span>
                      <Link
                        href={numberSortHref}
                        className="inline-flex items-center justify-center rounded-full border border-neutral-400 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-800 hover:bg-neutral-100"
                      >
                        {numberSortLabel}
                      </Link>
                    </div>
                  </th>

                  <th className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>Name</span>
                      <Link
                        href={nameSortHref}
                        className="inline-flex items-center justify-center rounded-full border border-neutral-400 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-800 hover:bg-neutral-100"
                      >
                        {nameSortLabel}
                      </Link>
                    </div>
                  </th>

                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">NI</th>
                  <th className="px-4 py-3">Pay frequency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-neutral-100 divide-y divide-neutral-300">
                {visibleEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-sm text-neutral-700">
                      {!hasAnyEmployees
                        ? "No employees yet. Use the New Employee Wizard on the Dashboard to create your first record."
                        : showLeavers
                        ? "No employees found for this filter."
                        : 'No active employees to show. You may only have leavers. Use "Show leavers" to view them.'}
                    </td>
                  </tr>
                ) : (
                  visibleEmployees.map((employee) => {
                    const name = `${employee.first_name ?? ""} ${
                      employee.last_name ?? ""
                    }`.trim();

                    const rawStatus = employee.status ?? "active";
                    const isLeaver = rawStatus === "leaver";
                    const statusLabel = isLeaver ? "Leaver" : "Active";

                    const statusClass = isLeaver
                      ? "border-red-300 bg-red-100 text-red-800"
                      : "border-emerald-300 bg-emerald-100 text-emerald-800";

                    const routeId = employee.id;

                    return (
                      <tr key={employee.id}>
                        <td className="px-4 py-3 text-neutral-900">
                          {employee.employee_number ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-neutral-900">
                          {name || "Unnamed employee"}
                        </td>
                        <td className="px-4 py-3 text-neutral-800">
                          {employee.email ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-neutral-800">
                          {employee.ni_number ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-neutral-800">
                          {employee.pay_frequency ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-neutral-800">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/employees/${routeId}`}
                            className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85] min-w-[88px]"
                          >
                            View / edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
