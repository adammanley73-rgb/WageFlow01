/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\[id]\page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Inter } from "next/font/google";

import PageTemplate, { StatTile } from "@/components/ui/PageTemplate";
import { formatUkDate } from "@/lib/formatUkDate";

const inter = Inter({ subsets: ["latin"], display: "swap" });

type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";
type Status = "draft" | "processing" | "approved" | "rti_submitted" | "completed";

type Row = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  email: string;
  gross: number;
  deductions: number;
  net: number;
};

type ApiResponse = {
  ok?: boolean;
  debugSource?: string;

  run: any;
  employees: any[];
  totals: any;
};

function gbp(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function toNumberSafe(v: string | number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function statusLabel(s: string) {
  return String(s || "")
    .trim()
    .replaceAll("_", " ")
    .toUpperCase();
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    return v;
  }
  return null;
}

function mapEmployees(raw: any[]): Row[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: any) => {
    const gross = toNumberSafe(pickFirst(r.gross, r.total_gross, r.gross_pay, 0) as any);
    const deductions = toNumberSafe(pickFirst(r.deductions, r.total_deductions, r.deduction_total, 0) as any);
    const net = toNumberSafe(pickFirst(r.net, r.total_net, r.net_pay, gross - deductions) as any);

    return {
      id: String(pickFirst(r.id, r.pay_run_employee_id, "") || ""),
      employeeId: String(pickFirst(r.employeeId, r.employee_id, r.employeeId, "") || ""),
      employeeName: String(pickFirst(r.employeeName, r.employee_name, r.full_name, "—") || "—"),
      employeeNumber: String(pickFirst(r.employeeNumber, r.employee_number, r.payroll_number, "—") || "—"),
      email: String(pickFirst(r.email, r.employee_email, "—") || "—"),
      gross: Number.isFinite(gross) ? Number(gross.toFixed(2)) : 0,
      deductions: Number.isFinite(deductions) ? Number(deductions.toFixed(2)) : 0,
      net: Number.isFinite(net) ? Number(net.toFixed(2)) : 0,
    };
  });
}

export default function PayrollRunDetailPage() {
  const params = useParams();
  const runId = String((params as any)?.id || "");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [approvedMsg, setApprovedMsg] = useState<string | null>(null);

  const load = async () => {
    setApprovedMsg(null);
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/payroll/${runId}`, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed to load payroll run ${runId}`);
      }

      const j: ApiResponse = await res.json();
      setData(j);

      const mapped = mapEmployees(j?.employees);
      setRows(mapped);

      setDirty(false);
      setValidation({});
    } catch (e: any) {
      setErr(e?.message || "Error loading payroll run");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!runId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const rowTotals = useMemo(() => {
    const tg = rows.reduce((a, r) => a + (Number.isFinite(r.gross) ? r.gross : 0), 0);
    const td = rows.reduce((a, r) => a + (Number.isFinite(r.deductions) ? r.deductions : 0), 0);
    const tn = rows.reduce((a, r) => a + (Number.isFinite(r.net) ? r.net : 0), 0);
    return {
      gross: Number(tg.toFixed(2)),
      deductions: Number(td.toFixed(2)),
      net: Number(tn.toFixed(2)),
    };
  }, [rows]);

  const apiTotals = useMemo(() => {
    const runObj: any = (data as any)?.run || {};
    const totalsObj: any = (data as any)?.totals || {};

    const gross = toNumberSafe(
      pickFirst(
        totalsObj.gross,
        totalsObj.total_gross,
        runObj.total_gross_pay,
        runObj.totalGrossPay,
        0
      ) as any
    );

    const tax = toNumberSafe(pickFirst(totalsObj.tax, runObj.total_tax, runObj.totalTax, 0) as any);
    const ni = toNumberSafe(pickFirst(totalsObj.ni, runObj.total_ni, runObj.totalNi, 0) as any);

    const net = toNumberSafe(
      pickFirst(
        totalsObj.net,
        totalsObj.total_net,
        runObj.total_net_pay,
        runObj.totalNetPay,
        0
      ) as any
    );

    const deductions = Number((gross - net).toFixed(2));

    return {
      gross: Number(gross.toFixed(2)),
      deductions: Number(deductions.toFixed(2)),
      net: Number(net.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      ni: Number(ni.toFixed(2)),
    };
  }, [data]);

  const displayTotals = rows.length > 0 ? rowTotals : apiTotals;

  const onChangeCell = (id: string, field: "gross" | "deductions" | "net", value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const next = { ...r };
        const n = toNumberSafe(value);

        (next as any)[field] = n;

        if (field === "gross" || field === "deductions") {
          next.net = Number((toNumberSafe(next.gross) - toNumberSafe(next.deductions)).toFixed(2));
        }

        return next;
      })
    );

    setDirty(true);
  };

  useEffect(() => {
    const v: Record<string, string> = {};

    for (const r of rows) {
      const g = toNumberSafe(r.gross);
      const d = toNumberSafe(r.deductions);
      const n = toNumberSafe(r.net);

      if (g < 0) v[r.id] = "Gross cannot be negative";
      else if (d < 0) v[r.id] = "Deductions cannot be negative";
      else if (n < 0) v[r.id] = "Net cannot be negative";
    }

    setValidation(v);
  }, [rows]);

  const hasErrors = Object.keys(validation).length > 0;

  const saveChanges = async () => {
    try {
      setSaving(true);
      setErr(null);

      const payload = {
        items: rows.map((r) => ({
          id: r.id,
          gross: Number(toNumberSafe(r.gross).toFixed(2)),
          deductions: Number(toNumberSafe(r.deductions).toFixed(2)),
          net: Number(toNumberSafe(r.net).toFixed(2)),
        })),
      };

      const res = await fetch(`/api/payroll/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to save changes");
      }

      const j: ApiResponse = await res.json();
      setData(j);

      const mapped = mapEmployees(j?.employees);
      setRows(mapped);

      setDirty(false);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const approveRun = async () => {
    try {
      setSaving(true);
      setErr(null);

      const res = await fetch(`/api/payroll/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to approve run");
      }

      const j: ApiResponse = await res.json();
      setData(j);

      const mapped = mapEmployees(j?.employees);
      setRows(mapped);

      setDirty(false);
      setApprovedMsg("Run approved. FPS queued in RTI logs.");
    } catch (e: any) {
      setErr(e?.message || "Approval failed");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    window.location.href = `/api/payroll/${runId}/export`;
  };

  const runObj: any = (data as any)?.run || {};

  const runNumber = String(pickFirst(runObj.runNumber, runObj.run_number, "—") || "—");

  const periodStart = pickFirst(runObj.periodStart, runObj.period_start, null) as any;
  const periodEnd = pickFirst(runObj.periodEnd, runObj.period_end, null) as any;

  const payDate = pickFirst(runObj.payDate, runObj.pay_date, null) as any;

  const statusRaw = pickFirst(runObj.status, runObj.run_status, null) as any;
  const statusText = statusRaw ? statusLabel(statusRaw) : "—";

  const periodText =
    periodStart && periodEnd ? `${formatUkDate(String(periodStart))} to ${formatUkDate(String(periodEnd))}` : "—";

  const payDateText = payDate ? formatUkDate(String(payDate)) : "—";

  const canApprove =
    (String(statusRaw || "") === "draft" || String(statusRaw || "") === "processing") &&
    rows.length > 0 &&
    !dirty &&
    !hasErrors &&
    !saving;

  const showDataMismatchNote = !loading && rows.length === 0 && Number(apiTotals.gross) > 0;

  return (
    <PageTemplate title="Payroll" currentSection="payroll">
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl bg-white/95 shadow-sm ring-1 ring-neutral-300 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-extrabold text-slate-900">Run {runNumber}</div>

                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                  style={{
                    backgroundColor: "rgba(15,60,133,0.12)",
                    color: "var(--wf-blue)",
                  }}
                >
                  {statusText}
                </span>
              </div>

              <div className="flex flex-col gap-1 text-sm text-slate-700">
                <div>
                  <span className="font-semibold">Period:</span>{" "}
                  <span className={`${inter.className} font-extrabold`} style={{ color: "#059669" }}>
                    {periodText}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Pay date:</span>{" "}
                  <span className={`${inter.className} font-extrabold`} style={{ color: "var(--wf-blue)" }}>
                    {payDateText}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href="/dashboard/payroll"
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: "var(--wf-blue)" }}
              >
                Back to Runs
              </Link>

              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: "#059669" }}
              >
                Export CSV
              </button>
            </div>
          </div>

          {approvedMsg ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{
                borderColor: "#10b981",
                backgroundColor: "rgba(16,185,129,0.12)",
                color: "#065f46",
              }}
            >
              {approvedMsg}
            </div>
          ) : null}

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {err}
            </div>
          ) : null}

          {showDataMismatchNote ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              This run has totals but no employee rows were returned by the API. The run details still show correctly.
              Approve stays disabled until employees load.
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile title="Employees" value={loading ? "..." : String(rows.length)} />
          <StatTile title="Total Gross" value={gbp(displayTotals.gross)} />
          <StatTile title="Total Deductions" value={gbp(displayTotals.deductions)} />
          <StatTile title="Total Net" value={gbp(displayTotals.net)} />
        </div>

        <div className="rounded-3xl bg-white/95 shadow-sm ring-1 ring-neutral-300 overflow-hidden">
          <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Employees in this run</h2>
            <div className="text-sm text-slate-700">Edit amounts, save, export CSV, or open a payslip.</div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="sticky left-0 z-10 bg-neutral-100 px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Number
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Deductions
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Net
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Payslip
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 border-b border-neutral-200" colSpan={7}>
                      Loading...
                    </td>
                  </tr>
                ) : null}

                {!loading && rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 border-b border-neutral-200" colSpan={7}>
                      No employees attached to this run.
                    </td>
                  </tr>
                ) : null}

                {!loading &&
                  rows.map((r) => {
                    const rowError = validation?.[r.id];
                    return (
                      <tr key={r.id} className="bg-white">
                        <td className="sticky left-0 z-0 bg-white px-4 py-3 text-sm text-slate-900 border-b border-neutral-200">
                          {r.employeeName || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          {r.employeeNumber || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          {r.email || "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <input
                            className={`${inter.className} h-10 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm font-extrabold outline-none focus:ring-2 focus:ring-offset-1`}
                            style={{ color: "var(--wf-blue)" }}
                            type="number"
                            step="0.01"
                            value={Number.isFinite(r.gross) ? r.gross : 0}
                            onChange={(e) => onChangeCell(r.id, "gross", e.target.value)}
                          />
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <input
                            className={`${inter.className} h-10 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm font-extrabold outline-none focus:ring-2 focus:ring-offset-1`}
                            style={{ color: "var(--wf-blue)" }}
                            type="number"
                            step="0.01"
                            value={Number.isFinite(r.deductions) ? r.deductions : 0}
                            onChange={(e) => onChangeCell(r.id, "deductions", e.target.value)}
                          />
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <div className="flex flex-col gap-1">
                            <input
                              className={`${inter.className} h-10 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm font-extrabold outline-none focus:ring-2 focus:ring-offset-1`}
                              style={{ color: "var(--wf-blue)" }}
                              type="number"
                              step="0.01"
                              value={Number.isFinite(r.net) ? r.net : 0}
                              onChange={(e) => onChangeCell(r.id, "net", e.target.value)}
                            />
                            {rowError ? <div className="text-xs font-semibold text-red-700">{rowError}</div> : null}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <Link
                            href={`/dashboard/payroll/${runId}/payslip/${r.employeeId}`}
                            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                            style={{ backgroundColor: "var(--wf-blue)" }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 text-sm text-slate-700">
            Live totals reflect your edits. Net defaults to Gross minus Deductions.
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={saveChanges}
            disabled={!dirty || hasErrors || saving || rows.length === 0}
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition"
            style={{
              backgroundColor: !dirty || hasErrors || saving || rows.length === 0 ? "var(--wf-blue)" : "#059669",
              opacity: !dirty || hasErrors || saving || rows.length === 0 ? 0.6 : 1,
              cursor: !dirty || hasErrors || saving || rows.length === 0 ? "not-allowed" : "pointer",
            }}
            title={rows.length === 0 ? "No employee rows loaded for this run" : "Save employee row changes"}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={approveRun}
            disabled={!canApprove}
            title="Approve and queue FPS"
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition"
            style={{
              backgroundColor: "#059669",
              opacity: !canApprove ? 0.6 : 1,
              cursor: !canApprove ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Working..." : "Approve run"}
          </button>
        </div>
      </div>
    </PageTemplate>
  );
}
