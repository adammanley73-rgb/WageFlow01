/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";
import ActionButton from "@/components/ui/ActionButton";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("employees: missing Supabase env");
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
      console.error("employees: error loading active company", error);
      return null;
    }

    return data.name ?? null;
  } catch (err) {
    console.error("employees: admin client error", err);
    return null;
  }
}

export default async function EmployeesPage() {
  const activeCompanyName = await getActiveCompanyName();

  const employees: {
    id: string;
    name: string;
    email: string;
    ni: string;
    payFreq: string;
    hasPayroll: boolean;
  }[] = [];

  return (
    <PageTemplate title="Employees" currentSection="Employees">
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

        {/* Employees table card */}
        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          {/* Table header */}
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">
              Employee list
            </div>
            <div className="text-xs text-neutral-700">
              Sticky first column, 2 px separators, actions on the right.
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100">
                <tr className="border-b-2 border-neutral-300">
                  <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">
                    Name
                  </th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">NI</th>
                  <th className="text-left px-4 py-3">Pay Frequency</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr className="border-b-2 border-neutral-300">
                    <td
                      className="px-4 py-6 sticky left-0 bg-white"
                      colSpan={4}
                    >
                      <div className="text-neutral-800">No employees yet.</div>
                      <div className="text-neutral-700 text-xs">
                        Use the New Employee Wizard on the Dashboard to create
                        your first record.
                      </div>
                    </td>
                    <td className="px-4 py-6 text-right bg-white"></td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.id} className="border-b-2 border-neutral-300">
                      <td className="px-4 py-3 sticky left-0 bg-white">
                        {e.name}
                      </td>
                      <td className="px-4 py-3">{e.email}</td>
                      <td className="px-4 py-3">{e.ni}</td>
                      <td className="px-4 py-3">{e.payFreq}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <ActionButton
                            href={`/dashboard/employees/${e.id}/edit`}
                            variant="success"
                          >
                            Edit
                          </ActionButton>
                          <ActionButton
                            href="#"
                            variant="primary"
                            className={
                              e.hasPayroll
                                ? "opacity-50 pointer-events-none"
                                : ""
                            }
                          >
                            Delete
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
