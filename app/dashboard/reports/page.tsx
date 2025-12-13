/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\reports\page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("reports page: missing Supabase env");
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
      console.error("reports page: error loading active company", error);
      return null;
    }

    return data.name ?? null;
  } catch (err) {
    console.error("reports page: admin client error", err);
    return null;
  }
}

export default async function ReportsPage() {
  const activeCompanyName = await getActiveCompanyName();

  return (
    <PageTemplate title="Reports" currentSection="Reports">
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

        {/* Main reports content wrapper */}
        <div className="rounded-2xl bg-neutral-100 ring-1 ring-neutral-300 p-3 sm:p-4">
          {/* Summary tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-2xl bg-neutral-200 px-4 py-6 text-center ring-1 ring-neutral-300">
              <div className="text-sm font-semibold text-neutral-900">
                Payroll Runs
              </div>
              <div className="mt-2 text-2xl font-semibold">0</div>
            </div>
            <div className="rounded-2xl bg-neutral-200 px-4 py-6 text-center ring-1 ring-neutral-300">
              <div className="text-sm font-semibold text-neutral-900">
                Total Gross
              </div>
              <div className="mt-2 text-2xl font-semibold">£0.00</div>
            </div>
            <div className="rounded-2xl bg-neutral-200 px-4 py-6 text-center ring-1 ring-neutral-300">
              <div className="text-sm font-semibold text-neutral-900">
                Total Deductions
              </div>
              <div className="mt-2 text-2xl font-semibold">£0.00</div>
            </div>
          </div>

          {/* Payroll summary table */}
          <div className="rounded-xl bg-white ring-1 ring-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 text-sm font-semibold text-neutral-900">
              Payroll Summary
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr className="border-b-2 border-neutral-300">
                    <th className="text-left px-4 py-3">Run Number</th>
                    <th className="text-left px-4 py-3">Pay Date</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Gross</th>
                    <th className="text-left px-4 py-3">Deductions</th>
                    <th className="text-left px-4 py-3">Net</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-6 text-neutral-700" colSpan={6}>
                      No payroll runs found. Create a run in Payroll and come
                      back to view reports.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* RTI log */}
          <div className="rounded-xl bg-white ring-1 ring-neutral-200 overflow-hidden mt-4">
            <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 text-sm font-semibold text-neutral-900">
              RTI Submission Log
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr className="border-b-2 border-neutral-300">
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Period</th>
                    <th className="text-left px-4 py-3">Submitted</th>
                    <th className="text-left px-4 py-3">Reference</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-6 text-neutral-700" colSpan={6}>
                      No submissions logged yet. Submit FPS from a payroll run
                      to populate this table.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
