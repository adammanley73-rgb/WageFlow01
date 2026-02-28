// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\PayrollRunsTable.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
  run_number: string | null;
  run_name?: string | null;

  frequency: Frequency;

  // These are frequently null or come back under different key names.
  period_start?: string | null;
  period_end?: string | null;

  status: string;
  pay_date: string | null;
  pay_date_overridden: boolean;

  // Legacy field retained for API compatibility, but no longer displayed.
  attached_all_due_employees: boolean;

  totals: RunTotals;

  // New (optional) fields. UI will still work if API does not send them yet.
  run_kind?: "primary" | "supplementary" | string | null;
  parent_run_id?: string | null;
  created_at?: string | null;
  pay_schedule_id?: string | null;

  // Possible legacy/alt API shapes (we pick these at render time)
  periodStart?: string | null;
  periodEnd?: string | null;
  pay_period_start?: string | null;
  pay_period_end?: string | null;
  payPeriodStart?: string | null;
  payPeriodEnd?: string | null;
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

function pickFirst(...values: any[]): string | null {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    return s;
  }
  return null;
}

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

function normalizeKind(v: any): "primary" | "supplementary" | "unknown" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "primary" || s === "main") return "primary";
  if (s === "supplementary" || s === "supp" || s === "supplemental") return "supplementary";
  return "unknown";
}

function labelKind(kind: "primary" | "supplementary" | "unknown"): string {
  if (kind === "supplementary") return "Supplementary";
  return "Main";
}

function Pill({
  kind,
  label,
}: {
  kind: "primary" | "supplementary" | "unknown";
  label: string;
}) {
  const cls =
    kind === "supplementary"
      ? "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200"
      : "bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200";

  return (
    <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " + cls}>
      {label}
    </span>
  );
}

type RunMeta = {
  kind: "primary" | "supplementary" | "unknown";
  suppSeq: number | null;
  primaryId: string | null;
  primaryLabel: string | null;
};

function runDisplayLabel(run: PayrollRun): string {
  const rn = String(run.run_number ?? "").trim();
  if (rn) return rn;
  const nm = String(run.run_name ?? "").trim();
  if (nm) return nm;
  return "Run";
}

function buildRunMeta(runs: PayrollRun[]): Map<string, RunMeta> {
  const groups = new Map<string, PayrollRun[]>();
  const keyFor = (r: PayrollRun) =>
    [
      r.company_id ?? "",
      r.frequency ?? "",
      pickFirst(r.period_start, r.periodStart, r.pay_period_start, r.payPeriodStart) ?? "",
      pickFirst(r.period_end, r.periodEnd, r.pay_period_end, r.payPeriodEnd) ?? "",
      r.pay_schedule_id ?? "",
    ].join("|");

  for (const r of runs) {
    const k = keyFor(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  const meta = new Map<string, RunMeta>();

  for (const [, groupRuns] of groups) {
    // Find the primary run for this period.
    const explicitPrimary =
      groupRuns.find((r) => normalizeKind(r.run_kind) === "primary") ||
      groupRuns.find((r) => !r.parent_run_id) ||
      groupRuns[0];

    const primaryId = explicitPrimary?.id ?? null;
    const primaryLabel = explicitPrimary ? runDisplayLabel(explicitPrimary) : null;

    // Decide which runs are supplementary.
    const suppRuns = groupRuns
      .filter((r) => {
        const k = normalizeKind(r.run_kind);
        if (k === "supplementary") return true;
        if (primaryId && r.parent_run_id && r.parent_run_id === primaryId) return true;
        // If API does not send run_kind, but does send parent_run_id, treat as supplementary.
        if (r.parent_run_id) return true;
        return false;
      })
      .sort((a, b) => {
        const aKey = sortKey(a.created_at) || a.id;
        const bKey = sortKey(b.created_at) || b.id;
        return aKey.localeCompare(bKey);
      });

    const suppSeqById = new Map<string, number>();
    suppRuns.forEach((r, idx) => suppSeqById.set(r.id, idx + 1));

    for (const r of groupRuns) {
      const kindGuess =
        normalizeKind(r.run_kind) !== "unknown"
          ? normalizeKind(r.run_kind)
          : r.parent_run_id
          ? "supplementary"
          : "primary";

      const isSupp = suppSeqById.has(r.id);
      const kind = isSupp ? "supplementary" : kindGuess;

      meta.set(r.id, {
        kind,
        suppSeq: isSupp ? suppSeqById.get(r.id)! : null,
        primaryId: primaryId,
        primaryLabel: primaryLabel,
      });
    }
  }

  return meta;
}

function getPeriodStart(run: any): string | null {
  return pickFirst(run?.period_start, run?.periodStart, run?.pay_period_start, run?.payPeriodStart);
}

function getPeriodEnd(run: any): string | null {
  return pickFirst(run?.period_end, run?.periodEnd, run?.pay_period_end, run?.payPeriodEnd);
}

function renderPeriod(run: any) {
  const ps = getPeriodStart(run);
  const pe = getPeriodEnd(run);

  const psFmt = formatDate(ps);
  const peFmt = formatDate(pe);

  if (!psFmt && !peFmt) {
    return <span className="text-neutral-500">Not set</span>;
  }

  if (psFmt && peFmt) {
    return (
      <span>
        {psFmt} to {peFmt}
      </span>
    );
  }

  if (psFmt) {
    return <span>From {psFmt}</span>;
  }

  return <span>To {peFmt}</span>;
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
        setError(json.error?.message || json.error || "Failed to load payroll runs for this company.");
        setRuns([]);
        setTaxYearStart(json.taxYear?.start ?? null);
        setTaxYearEnd(json.taxYear?.end ?? null);
        return;
      }

      const sortedRuns = [...(json.runs || [])].sort((a, b) => {
        const aKey = sortKey(getPeriodStart(a) ?? "");
        const bKey = sortKey(getPeriodStart(b) ?? "");
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

  const runMeta = useMemo(() => buildRunMeta(runs), [runs]);

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

        <p className="mt-2 text-xs text-neutral-700">
          Runs are labelled as Main or Supplementary so you can spot correction runs at a glance.
        </p>

        {loading && <p className="mt-1 text-xs text-neutral-600">Loading...</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-100">
            <tr className="border-b-2 border-neutral-300">
              <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">Run</th>
              <th className="text-left px-4 py-3">Type</th>
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
                <td className="px-4 py-6 sticky left-0 bg-white" colSpan={5}>
                  <div className="text-neutral-800">No payroll runs found for this frequency.</div>
                  <div className="text-neutral-700 text-xs mt-1">
                    Create a run from the Dashboard. Use the Payroll Run Wizard tile.
                  </div>
                </td>
                <td className="px-4 py-6 text-right bg-white" colSpan={5} />
              </tr>
            ) : (
              runs.map((run) => {
                const meta = runMeta.get(run.id) || {
                  kind: normalizeKind(run.run_kind) !== "unknown" ? normalizeKind(run.run_kind) : "primary",
                  suppSeq: null,
                  primaryId: null,
                  primaryLabel: null,
                };

                const kindLabel = labelKind(meta.kind);
                const pillLabel =
                  meta.kind === "supplementary" && meta.suppSeq ? `Supp ${meta.suppSeq}` : kindLabel;

                const primaryHint =
                  meta.kind === "supplementary"
                    ? meta.primaryLabel
                      ? `Main: ${meta.primaryLabel}`
                      : "Main: linked run"
                    : null;

                return (
                  <tr key={run.id} className="border-b-2 border-neutral-300">
                    <td className="px-4 py-3 sticky left-0 bg-white font-semibold whitespace-nowrap">
                      {runDisplayLabel(run)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div>
                          <Pill kind={meta.kind} label={pillLabel} />
                        </div>
                        {primaryHint && <div className="text-[11px] text-neutral-600">{primaryHint}</div>}
                      </div>
                    </td>

                    <td className="px-4 py-3">{renderPeriod(run)}</td>

                    <td className="px-4 py-3">
                      {formatDate(run.pay_date)}
                      {run.pay_date_overridden && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          overridden
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="capitalize">{String(run.status || "").replace(/_/g, " ")}</div>
                    </td>

                    <td className="px-4 py-3 text-right">{formatCurrency(run.totals?.gross)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(run.totals?.tax)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(run.totals?.ni)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(run.totals?.net)}</td>

                    <td className="px-4 py-3 text-right">
                      <ActionButton href={`/dashboard/payroll/${run.id}`} variant="primary">
                        View
                      </ActionButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
