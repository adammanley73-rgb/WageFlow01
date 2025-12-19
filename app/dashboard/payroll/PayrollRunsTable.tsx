// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\PayrollRunsTable.tsx
"use client";

/* @ts-nocheck */

import { useEffect, useState } from "react";
import ActionButton from "@/components/ui/ActionButton";
import { formatUkDate } from "@/lib/formatUkDate";

type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";
type FrequencyFilter = "all" | Frequency;

type RunTotals = {
  gross: number;
  tax: number;
  ni: number;
  net: number;
};

type PayrollRun = {
  id: string;
  company_id: string;
  run_number: string;
  frequency: Frequency;
  period_start: string;
  period_end: string;
  status: string;
  pay_date: string | null;
  pay_date_overridden: boolean;

  // Legacy field retained for API compatibility, but no longer displayed.
  attached_all_due_employees: boolean;

  totals: RunTotals;
};

type RunsResponse = {
  ok: boolean;
  runs: PayrollRun[];
  taxYear?: {
    start: string;
    end: string;
  };
  error?: any;
};

const FREQUENCIES: { key: FrequencyFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "weekly", label: "Weekly" },
  { key: "fortnightly", label: "Fortnightly" },
  { key: "four_weekly", label: "4-weekly" },
  { key: "monthly", label: "Monthly" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return formatUkDate(value, "");
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function sortKey(isoLike: string | null | undefined): string {
  const s = String(isoLike ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return s;
  return dt.toISOString();
}

export default function PayrollRunsTable() {
  const [frequency, setFrequency] = useState<FrequencyFilter>("all");
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [taxYearStart, setTaxYearStart] = useState<string | null>(null);
  const [taxYearEnd, setTaxYearEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRuns(selectedFrequency: FrequencyFilter) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedFrequency && selectedFrequency !== "all") {
        params.set("frequency", selectedFrequency);
      }

      const url =
        params.toString().length > 0
          ? `/api/payroll/runs?${params.toString()}`
          : "/api/payroll/runs";

      const res = await fetch(url);
      const json: RunsResponse = await res.json();

      if (!json.ok) {
        setError(
          json.error?.message ||
            json.error ||
            "Failed to load payroll runs for this company."
        );
        setRuns([]);
        setTaxYearStart(json.taxYear?.start ?? null);
        setTaxYearEnd(json.taxYear?.end ?? null);
        return;
      }

      const sortedRuns = [...(json.runs || [])].sort((a, b) => {
        const aKey = sortKey(a.period_start);
        const bKey = sortKey(b.period_start);
        return bKey.localeCompare(aKey);
      });

      setRuns(sortedRuns);
      setTaxYearStart(json.taxYear?.start ?? null);
      setTaxYearEnd(json.taxYear?.end ?? null);
    } catch (err: any) {
      setError(err?.message || "Unexpected error while loading payroll runs.");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns(frequency);
  }, [frequency]);

  return (
    <>
      <div className="px-4 pt-3 pb-2 border-b-2 border-neutral-300 bg-neutral-50">
        <div className="flex flex-wrap items-center gap-2">
          {FREQUENCIES.map((f) => {
            const isActive = f.key === frequency;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFrequency(f.key)}
                className={
                  "rounded-full px-4 py-2 text-sm font-medium transition " +
                  (isActive
                    ? "bg-[#0f3c85] text-white"
                    : "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-300 hover:bg-neutral-50")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {taxYearStart && taxYearEnd && (
          <p className="mt-2 text-xs text-neutral-700">
            Tax year: {formatDate(taxYearStart)} to {formatDate(taxYearEnd)}.
          </p>
        )}

        {loading && <p className="mt-1 text-xs text-neutral-600">Loading...</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-100">
            <tr className="border-b-2 border-neutral-300">
              <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">
                Run
              </th>
              <th className="text-left px-4 py-3">Period</th>
              <th className="text-left px-4 py-3">Pay date</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Gross</th>
              <th className="text-right px-4 py-3">Tax</th>
              <th className="text-right px-4 py-3">NI</th>
              <th className="text-right px-4 py-3">Net</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && !loading && !error ? (
              <tr className="border-b-2 border-neutral-300">
                <td className="px-4 py-6 sticky left-0 bg-white" colSpan={4}>
                  <div className="text-neutral-800">
                    No payroll runs found for this frequency.
                  </div>
                  <div className="text-neutral-700 text-xs mt-1">
                    Create a run from the Dashboard. Use the Payroll Run Wizard
                    tile.
                  </div>
                </td>
                <td className="px-4 py-6 text-right bg-white" colSpan={5} />
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="border-b-2 border-neutral-300">
                  <td className="px-4 py-3 sticky left-0 bg-white font-semibold whitespace-nowrap">
                    {run.run_number}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(run.period_start)} to {formatDate(run.period_end)}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(run.pay_date)}
                    {run.pay_date_overridden && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        overridden
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="capitalize">
                      {String(run.status || "").replace(/_/g, " ")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(run.totals?.gross)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(run.totals?.tax)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(run.totals?.ni)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(run.totals?.net)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionButton
                      href={`/dashboard/payroll/${run.id}`}
                      variant="primary"
                    >
                      View
                    </ActionButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
