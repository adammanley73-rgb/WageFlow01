/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\leaver\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";

type EmployeeRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
};

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("leaver wizard: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function getActiveCompanyId(): string | null {
  const jar = cookies();
  return (
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    null
  );
}

async function loadEmployeesForCompany(
  companyId: string
): Promise<{ data: EmployeeRow[]; error: string | null }> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, employee_number")
      .eq("company_id", companyId)
      .order("first_name", { ascending: true });

    if (error) {
      console.error("leaver wizard: employee load error", error);
      return { data: [], error: error.message || "Failed to load employees" };
    }

    return { data: (data as EmployeeRow[]) || [], error: null };
  } catch (err: any) {
    console.error("leaver wizard: unexpected error", err);
    return {
      data: [],
      error: err?.message || "Unexpected error loading employees",
    };
  }
}

export default async function LeaverWizardEntryPage() {
  const companyId = getActiveCompanyId();

  if (!companyId) {
    return (
      <PageTemplate title="Leaver wizard" currentSection="Employees">
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          <p className="text-sm text-neutral-800">
            No active company selected. Go to the Companies page on the
            dashboard and choose a company before starting the leaver wizard.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/companies"
              className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68]"
            >
              Go to Companies
            </Link>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const { data: employees, error } = await loadEmployeesForCompany(companyId);

  return (
    <PageTemplate title="Leaver wizard" currentSection="Employees">
      <div className="space-y-4">
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0f3c85]">
                Start leaver wizard
              </h2>
              <p className="text-sm text-neutral-800">
                Choose the employee who is leaving. The wizard will walk you
                through final pay, holiday pay and other leaver details.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68]"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-2xl ring-1 border bg-neutral-300 ring-neutral-400 border-neutral-400 p-4 overflow-x-auto">
          {error ? (
            <div className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-sm text-neutral-800">
              No employees found for this company yet. Create an employee first
              using the New Employees Wizard.
            </div>
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-400 bg-neutral-200">
                  <th className="px-3 py-2 text-left font-semibold text-neutral-900">
                    Employee no
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-900">
                    Name
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-neutral-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const displayName =
                    [emp.first_name, emp.last_name]
                      .filter(Boolean)
                      .join(" ") || "Unnamed employee";

                  return (
                    <tr
                      key={emp.id}
                      className="border-b border-neutral-300 last:border-b-0 bg-neutral-100"
                    >
                      <td className="px-3 py-2 align-middle">
                        {emp.employee_number || "–"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {displayName}
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <Link
                          href={`/dashboard/employees/${emp.id}/wizard/leaver`}
                          className="inline-flex items-center justify-center rounded-2xl bg-[#0f3c85] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0c2f68]"
                        >
                          Start leaver wizard
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}
