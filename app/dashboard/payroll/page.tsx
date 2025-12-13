/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";
import ActionButton from "@/components/ui/ActionButton";

type RunStatus =
  | "draft"
  | "processing"
  | "approved"
  | "rti_submitted"
  | "completed";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("payroll page: missing Supabase env");
  }

  return createClient(url, key, {
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

    const supabase = adminClient();

    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", activeCompanyId)
      .maybeSingle();

    if (error || !data) {
      console.error("payroll page: error loading active company", error);
      return null;
    }

    return data.name ?? null;
  } catch (err) {
    console.error("payroll page: admin client error", err);
    return null;
  }
}

function cannotDelete(status: RunStatus) {
  return (
    status === "rti_submitted" ||
    status === "completed" ||
    status === "approved"
  );
}

export default async function PayrollPage() {
  const activeCompanyName = await getActiveCompanyName();

  // Placeholder data. Replace with Supabase data later.
  const runs: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: RunStatus;
    createdAt: string;
  }[] = [];

  return (
    <PageTemplate title="Payroll" currentSection="Payroll">
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

        {/* Payroll runs table card */}
        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          {/* Table header */}
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">
              Payroll runs
            </div>
            <div className="text-xs text-neutral-700">
              Use the Create Payroll Run Wizard from the Dashboard to start a
              run.
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <colgroup>
                <col className="w-[16rem]" />
                <col className="w-[10rem]" />
                <col className="w-[10rem]" />
                <col className="w-[10rem]" />
                <col className="w-[10rem]" />
                <col className="w-[12rem]" />
              </colgroup>
              <thead className="bg-neutral-100">
                <tr className="border-b-2 border-neutral-300">
                  <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">
                    Run ID
                  </th>
                  <th className="text-left px-4 py-3">Period Start</th>
                  <th className="text-left px-4 py-3">Period End</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr className="border-b-2 border-neutral-300">
                    <td
                      className="px-4 py-6 sticky left-0 bg-white"
                      colSpan={5}
                    >
                      <div className="text-neutral-800">
                        No payroll runs yet.
                      </div>
                      <div className="text-neutral-700 text-xs">
                        Start one via the Create Payroll Run Wizard on the
                        Dashboard.
                      </div>
                    </td>
                    <td className="px-4 py-6 text-right bg-white" />
                  </tr>
                ) : (
                  runs.map((r) => (
                    <tr key={r.id} className="border-b-2 border-neutral-300">
                      <td className="px-4 py-3 sticky left-0 bg-white">
                        {r.id}
                      </td>
                      <td className="px-4 py-3">{r.periodStart}</td>
                      <td className="px-4 py-3">{r.periodEnd}</td>
                      <td className="px-4 py-3 capitalize">
                        {r.status.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">{r.createdAt}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <ActionButton
                            href={`/dashboard/payroll/${r.id}/edit`}
                            variant="success"
                          >
                            Edit
                          </ActionButton>
                          <ActionButton
                            href="#"
                            variant="primary"
                            className={
                              cannotDelete(r.status)
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
