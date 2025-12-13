/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\[id]\page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Inter } from "next/font/google";
import PageTemplate from "@/components/layout/PageTemplate";
import { formatUkDate } from "@/lib/formatUkDate";

const inter = Inter({ subsets: ["latin"] });

type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";
type Status = "draft" | "processing" | "approved" | "rti_submitted" | "completed";

type Run = {
  id: string;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  frequency: Frequency;
  status: Status;
  createdAt?: string;
  updatedAt?: string;

  runName?: string;
  attachedAllDueEmployees?: boolean;
  summary?: {
    totalRows?: number;
  };
};

type CalculationSource = "elements" | "manual" | "db";

type PayElement = {
  id?: string;
  code?: string;
  typeCode?: string;
  description?: string;
  typeDescription?: string;
  amount?: number | string;
};

type EmployeePayElements = {
  earnings?: PayElement[];
  deductions?: PayElement[];
};

type Row = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  email: string | null;
  gross: number;
  deductions: number;
  net: number;
  payeTax?: number;
  isLeaver?: boolean;
  payAfterLeaving?: boolean;
  calculationSource?: CalculationSource;
  payElements?: EmployeePayElements;
};

type ApiResponse = {
  run: Run;
  employees: any[];
  totals: any;
  warnings?: string[];
  employeePayElements?: Record<string, EmployeePayElements>;
};

type BankStatus = "unknown" | "present" | "missing" | "error";

function gbp(n: number) {
  if (!isFinite(n)) n = 0;
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function toNumberSafe(v: string | number): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isFinite(n) ? n : 0;
}

function getFrequencyLabel(freq?: Frequency | string | null): string {
  if (!freq) return "—";
  switch (freq) {
    case "weekly":
      return "Weekly";
    case "fortnightly":
      return "Fortnightly";
    case "four_weekly":
      return "Four-weekly";
    case "monthly":
      return "Monthly";
    default:
      return String(freq);
  }
}

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params?.id as string;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [approvedMsg, setApprovedMsg] = useState<string | null>(null);
  const [breakdownRowId, setBreakdownRowId] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);

  const [bankStatus, setBankStatus] = useState<Record<string, BankStatus>>({});

  const normaliseRowsFromResponse = (j: ApiResponse): Row[] => {
    const payElementsByRow: Record<string, EmployeePayElements> =
      j.employeePayElements || {};

    const normalisedRows: Row[] = (j.employees || []).map((r: any) => {
      const rowId = r.id;
      const fromEmployee: EmployeePayElements = r.payElements || r.elements || {};
      const fromMap: EmployeePayElements =
        payElementsByRow[rowId] ||
        payElementsByRow[r.payrollRunEmployeeId as string] ||
        {};

      const combined: EmployeePayElements = {
        earnings:
          (fromEmployee.earnings && fromEmployee.earnings.length > 0
            ? fromEmployee.earnings
            : fromMap.earnings) || [],
        deductions:
          (fromEmployee.deductions && fromEmployee.deductions.length > 0
            ? fromEmployee.deductions
            : fromMap.deductions) || [],
      };

      const calcSource: CalculationSource =
        (r.calculationSource as CalculationSource | undefined) || "manual";

      const earningsFromElements = (combined.earnings || []).reduce(
        (sum, el) => sum + toNumberSafe((el.amount ?? 0) as any),
        0
      );
      const deductionsFromElements = (combined.deductions || []).reduce(
        (sum, el) => sum + toNumberSafe((el.amount ?? 0) as any),
        0
      );

      let grossVal: number;
      let totalDeductions: number;
      let netVal: number;

      if (calcSource === "elements") {
        grossVal = earningsFromElements;
        totalDeductions = deductionsFromElements;
        netVal = grossVal - totalDeductions;
      } else {
        grossVal = toNumberSafe(r.gross ?? 0);
        totalDeductions = toNumberSafe(
          r.deductions != null ? r.deductions : (r.gross ?? 0) - (r.net ?? 0)
        );
        netVal = toNumberSafe(
          r.net != null ? r.net : (r.gross ?? 0) - totalDeductions
        );
      }

      const payeTax = toNumberSafe(
        r?.paye?.taxThisPeriod != null ? r.paye.taxThisPeriod : 0
      );

      return {
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        employeeNumber: r.employeeNumber ?? null,
        email: r.email ?? null,
        gross: grossVal,
        deductions: totalDeductions,
        net: netVal,
        payeTax,
        isLeaver: (r.status ?? "").toString().toLowerCase() === "leaver",
        payAfterLeaving: !!r.payAfterLeaving,
        calculationSource: calcSource,
        payElements: combined,
      };
    });

    return normalisedRows;
  };

  async function updateBankFlags(rowsForStatus: Row[]) {
    const uniqueEmployeeIds = Array.from(
      new Set(
        rowsForStatus
          .map((r) => r.employeeId)
          .filter((id) => typeof id === "string" && id.length > 0)
      )
    );

    if (uniqueEmployeeIds.length === 0) {
      setBankStatus({});
      return;
    }

    const initial: Record<string, BankStatus> = {};
    uniqueEmployeeIds.forEach((id) => {
      initial[id] = "unknown";
    });
    setBankStatus(initial);

    try {
      const results = await Promise.all(
        uniqueEmployeeIds.map(async (employeeId) => {
          try {
            const res = await fetch(`/api/employees/${employeeId}/bank`, {
              cache: "no-store",
            });

            if (res.status === 204 || res.status === 404) {
              return { employeeId, status: "missing" as BankStatus };
            }

            if (!res.ok) {
              return { employeeId, status: "error" as BankStatus };
            }

            const j = await res.json().catch(() => null);
            const d = (j?.data ?? j) as any;

            const hasRow =
              !!d &&
              (d.account_name ||
                d.sort_code ||
                d.account_number ||
                Array.isArray(d));

            return {
              employeeId,
              status: hasRow ? ("present" as BankStatus) : ("missing" as BankStatus),
            };
          } catch {
            return { employeeId, status: "error" as BankStatus };
          }
        })
      );

      const next: Record<string, BankStatus> = {};
      results.forEach(({ employeeId, status }) => {
        next[employeeId] = status;
      });
      setBankStatus(next);
    } catch {
      // Best effort
    }
  }

  const load = async () => {
    setApprovedMsg(null);
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/${runId}`, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to load run ${runId}`);
      }
      const j: ApiResponse = await res.json();

      const normalisedRows = normaliseRowsFromResponse(j);

      const hasNetMismatchWarning = (j.warnings || []).some(
        (w) =>
          w.startsWith("Net pay for ") &&
          w.includes("did not match the totals from their pay elements")
      );

      setData(j);
      setRows(normalisedRows);
      setDirty(hasNetMismatchWarning);
      setValidation({});

      updateBankFlags(normalisedRows);
    } catch (e: any) {
      setErr(e.message || "Error loading run");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (runId) load();
  }, [runId]);

  const totals = useMemo(() => {
    const tg = rows.reduce((a, r) => (isFinite(r.gross) ? a + r.gross : a), 0);
    const td = rows.reduce(
      (a, r) => (isFinite(r.deductions) ? a + r.deductions : a),
      0
    );
    const tn = rows.reduce((a, r) => (isFinite(r.net) ? a + r.net : a), 0);
    return { tg, td, tn };
  }, [rows]);

  const onChangeCell = (
    id: string,
    field: "gross" | "deductions" | "net",
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: Row = { ...r };
        const n = toNumberSafe(value);

        if (field === "gross") {
          next.gross = n;
          next.net = Number((next.gross - next.deductions).toFixed(2));
        } else if (field === "deductions") {
          next.deductions = n;
          next.net = Number((next.gross - next.deductions).toFixed(2));
        } else if (field === "net") {
          next.net = n;
          next.deductions = Number((next.gross - next.net).toFixed(2));
        }

        return next;
      })
    );
    setDirty(true);
  };

  const togglePayAfterLeaving = (id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, payAfterLeaving: !r.payAfterLeaving } : r
      )
    );
    setDirty(true);
  };

  useEffect(() => {
    const v: Record<string, string> = {};
    for (const r of rows) {
      if (r.gross < 0) v[r.id] = "Gross cannot be negative";
      else if (r.deductions < 0) v[r.id] = "Deductions cannot be negative";
      else if (r.net < 0) v[r.id] = "Net cannot be negative";
    }
    setValidation(v);
  }, [rows]);

  const hasErrors = Object.keys(validation).length > 0;

  const runStatus: Status | undefined = data?.run?.status;
  const runLocked =
    runStatus === "approved" ||
    runStatus === "rti_submitted" ||
    runStatus === "completed";

  const saveChanges = async () => {
    try {
      setSaving(true);
      setErr(null);
      setApprovedMsg(null);
      const payload = {
        items: rows.map((r) => ({
          id: r.id,
          gross: Number(r.gross.toFixed(2)),
          deductions: Number(r.deductions.toFixed(2)),
          net: Number(r.net.toFixed(2)),
          pay_after_leaving: !!r.payAfterLeaving,
        })),
      };
      const res = await fetch(`/api/payroll/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save changes");
      }
      const j: ApiResponse = await res.json();

      const normalisedRows = normaliseRowsFromResponse(j);

      const hasNetMismatchWarning = (j.warnings || []).some(
        (w) =>
          w.startsWith("Net pay for ") &&
          w.includes("did not match the totals from their pay elements")
      );

      setData(j);
      setRows(normalisedRows);
      setDirty(hasNetMismatchWarning);
      setApprovedMsg("Changes saved.");

      updateBankFlags(normalisedRows);
    } catch (e: any) {
      setErr(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const attachDueEmployees = async () => {
    if (!runId) return;
    try {
      setAttaching(true);
      setErr(null);
      setApprovedMsg(null);

      const res = await fetch(`/api/payroll/${runId}/attach`, {
        method: "POST",
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok || !j?.ok) {
        const msg =
          j?.details || j?.error || "Failed to attach employees to this run.";
        throw new Error(msg);
      }

      const inserted =
        typeof j.inserted === "number" && isFinite(j.inserted) ? j.inserted : 0;

      if (inserted > 0) {
        setApprovedMsg(
          `Attached ${inserted} employee${inserted === 1 ? "" : "s"} to this run.`
        );
      } else {
        setApprovedMsg("No new employees needed attaching for this run.");
      }

      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to attach employees to this run.");
    } finally {
      setAttaching(false);
    }
  };

  const exportCsv = () => {
    const url = `/api/payroll/${runId}/export`;
    window.location.href = url;
  };

  const openBreakdown = (rowId: string) => {
    setBreakdownRowId(rowId);
  };

  const closeBreakdown = () => {
    setBreakdownRowId(null);
  };

  const breakdownRow = useMemo(
    () => rows.find((r) => r.id === breakdownRowId) || null,
    [rows, breakdownRowId]
  );

  const breakdownElements: EmployeePayElements = breakdownRow?.payElements || {
    earnings: [],
    deductions: [],
  };

  const earningsList = breakdownElements.earnings || [];
  const deductionsList = breakdownElements.deductions || [];

  const earningsTotal = earningsList.reduce(
    (sum, el) => sum + toNumberSafe((el.amount ?? 0) as any),
    0
  );
  const deductionsTotal = deductionsList.reduce(
    (sum, el) => sum + toNumberSafe((el.amount ?? 0) as any),
    0
  );
  const netFromElements = earningsTotal - deductionsTotal;

  const employeeCount = rows.length;

  const missingBankCount = rows.filter((r) => {
    const status = bankStatus[r.employeeId];
    return status === "missing" || status === "error";
  }).length;

  return (
    <PageTemplate title="Payroll" currentSection="Payroll">
      <div className="flex flex-col gap-4 pb-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Payroll Run</h1>
              {data && (
                <span className="inline-flex items-center rounded-full bg-indigo-900/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-50 ring-1 ring-indigo-300/60">
                  {data.run.status}
                </span>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
            <Link
              href="/dashboard/payroll"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0f3c85] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2b5f] md:w-auto"
            >
              Back to Runs
            </Link>
            <button
              type="button"
              onClick={attachDueEmployees}
              disabled={attaching || runLocked}
              className={[
                "inline-flex w-full items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition md:w-auto",
                attaching || runLocked
                  ? "cursor-not-allowed opacity-70 bg-[#fed7aa] text-orange-900"
                  : "bg-[#f97316] hover:bg-[#ea580c]",
              ].join(" ")}
            >
              {attaching ? "Attaching…" : "Attach due employees"}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0f3c85] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2b5f] md:w-auto"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-white/95 px-4 py-3 text-[13px] text-slate-700 md:flex-row md:flex-wrap md:items-center md:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Run:</span>
            <span className={`${inter.className} font-semibold text-[#0f3c85]`}>
              {data?.run.runNumber ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Period:</span>
            <span className={`${inter.className} font-semibold text-[#0f3c85]`}>
              {data
                ? `${formatUkDate(data.run.periodStart)} to ${formatUkDate(
                    data.run.periodEnd
                  )}`
                : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Pay date:</span>
            <span className={`${inter.className} font-semibold text-[#0f3c85]`}>
              {data ? formatUkDate(data.run.payDate) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Frequency:</span>
            <span className={`${inter.className} font-semibold text-[#0f3c85]`}>
              {data ? getFrequencyLabel(data.run.frequency) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">
              Employees attached:
            </span>
            <span className={`${inter.className} font-semibold text-[#0f3c85]`}>
              {employeeCount}
            </span>
          </div>
        </div>

        {missingBankCount > 0 && (
          <div className="rounded-xl border border-red-300 bg-red-50/95 px-4 py-2 text-xs text-red-800 sm:text-sm">
            {missingBankCount === 1
              ? "1 employee in this run has no bank details saved. They cannot be paid until bank details are added."
              : `${missingBankCount} employees in this run have no bank details saved. They cannot be paid until bank details are added.`}
          </div>
        )}

        {data?.warnings && data.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-slate-50/95 px-4 py-3 text-xs text-amber-800 sm:text-sm">
            {data.warnings.map((w, idx) => (
              <div key={idx}>{w}</div>
            ))}
          </div>
        )}

        {approvedMsg && (
          <div className="rounded-xl border border-emerald-400 bg-emerald-50/95 px-4 py-2 text-xs text-emerald-800 sm:text-sm">
            {approvedMsg}
          </div>
        )}
        {err && (
          <div className="rounded-xl border border-red-400 bg-red-50/95 px-4 py-2 text-xs text-red-800 sm:text-sm">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-sky-50/90 p-4 text-center shadow-md">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-sky-800/80">
              Total Gross
            </div>
            <div className={`${inter.className} text-2xl font-extrabold text-sky-950`}>
              {gbp(totals.tg)}
            </div>
          </div>
          <div className="rounded-2xl bg-sky-50/90 p-4 text-center shadow-md">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-sky-800/80">
              Total Deductions
            </div>
            <div className={`${inter.className} text-2xl font-extrabold text-sky-950`}>
              {gbp(totals.td)}
            </div>
          </div>
          <div className="rounded-2xl bg-sky-50/90 p-4 text-center shadow-md">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-sky-800/80">
              Total Net
            </div>
            <div className={`${inter.className} text-2xl font-extrabold text-sky-950`}>
              {gbp(totals.tn)}
            </div>
          </div>
        </div>

        <section className="rounded-2xl bg-white/95 p-4 shadow-md sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
              Employees in this run
            </h2>
            <p className="text-xs text-slate-600 sm:text-sm">
              Draft and processing runs are editable. Approved runs will lock.
            </p>
          </div>

          <div className="mt-3 -mx-2 overflow-x-auto pb-1 sm:mx-0 sm:overflow-x-visible">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-800">
                    Employee
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-800">
                    Number
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-800">
                    Gross
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-800">
                    PAYE (calc)
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-800">
                    Other deductions
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-800">
                    Net
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-800">
                    Payslip
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-sm text-slate-600">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-sm text-slate-600">
                      No employees attached to this run.
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const calc = r.calculationSource || "manual";
                  const isElementsRow = calc === "elements";

                  const elementCount =
                    (r.payElements?.earnings?.length ?? 0) +
                    (r.payElements?.deductions?.length ?? 0);

                  const payeTax = isFinite(r.payeTax ?? NaN) ? r.payeTax ?? 0 : 0;
                  const totalDeductions = isFinite(r.deductions) ? r.deductions : 0;
                  const otherDeductions = Math.max(0, totalDeductions - payeTax);

                  const grossDisabled = runLocked || isElementsRow;
                  const netDisabled = runLocked || isElementsRow;

                  const calcTooltip =
                    isElementsRow && elementCount > 0
                      ? "This value is calculated from pay elements. To change it, edit the elements via the breakdown."
                      : isElementsRow
                      ? "This value is calculated from pay elements."
                      : "";

                  const bankFlag = bankStatus[r.employeeId];

                  return (
                    <tr key={r.id} className="border-b border-slate-200 last:border-b-0">
                      <td className="px-3 py-2 text-sm text-slate-900">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{r.employeeName}</span>
                            {(r.isLeaver || r.payAfterLeaving) && (
                              <div className="flex items-center gap-1">
                                {r.isLeaver && (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700">
                                    L
                                  </span>
                                )}
                                {r.payAfterLeaving && (
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                    Pay after leaving
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {bankFlag && bankFlag !== "unknown" && (
                            <div className="flex flex-wrap items-center gap-1">
                              {bankFlag === "present" && (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Bank details OK
                                </span>
                              )}
                              {bankFlag === "missing" && (
                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                  Bank details missing
                                </span>
                              )}
                              {bankFlag === "error" && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  Bank status unknown
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-slate-900">
                        {r.employeeNumber || "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-sm">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`${inter.className} w-full min-w-[7rem] rounded-xl border border-slate-300 px-2 py-1 text-right text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500`}
                          value={isFinite(r.gross) ? r.gross.toFixed(2) : "0.00"}
                          onChange={(e) => onChangeCell(r.id, "gross", e.target.value)}
                          disabled={grossDisabled}
                          title={grossDisabled ? calcTooltip : ""}
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-slate-900">
                        <span className={`${inter.className} inline-flex min-w-[7rem] justify-end`}>
                          {gbp(payeTax)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-slate-900">
                        <span className={`${inter.className} inline-flex min-w-[7rem] justify-end`}>
                          {gbp(otherDeductions)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-sm">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`${inter.className} w-full min-w-[7rem] rounded-xl border border-slate-300 px-2 py-1 text-right text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500`}
                          value={isFinite(r.net) ? r.net.toFixed(2) : "0.00"}
                          onChange={(e) => onChangeCell(r.id, "net", e.target.value)}
                          disabled={netDisabled}
                          title={netDisabled ? calcTooltip : ""}
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-sm">
                        <div className="flex items-center justify-center">
                          <Link
                            href={`/dashboard/payroll/${runId}/payslip/${r.employeeId}`}
                            className="inline-flex items-center justify-center rounded-2xl bg-[#0f3c85] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#0b2b5f]"
                          >
                            View payslip
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500 sm:text-sm">
            Live totals reflect your edits. Net is kept in line with the total
            deductions for each row. PAYE is a calculated suggestion based on
            the employee record and elements. Other deductions are the remaining
            total after PAYE.
          </p>
        </section>

        <div className="mt-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          {runLocked && (
            <div className="text-xs text-slate-100 sm:text-sm">
              Run is {runStatus?.toUpperCase()} and cannot be edited.
            </div>
          )}
          <button
            type="button"
            onClick={saveChanges}
            disabled={!dirty || hasErrors || saving || runLocked}
            className={[
              "inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition",
              !dirty || hasErrors || saving || runLocked
                ? "cursor-not-allowed opacity-60"
                : "hover:bg-emerald-700",
            ].join(" ")}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {breakdownRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6"
          onClick={closeBreakdown}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Pay breakdown: {breakdownRow.employeeName}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Run {data?.run.runNumber ?? "—"} ·{" "}
                  {data
                    ? `${formatUkDate(data.run.periodStart)} to ${formatUkDate(
                        data.run.periodEnd
                      )}`
                    : "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={closeBreakdown}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {earningsList.length === 0 && deductionsList.length === 0 ? (
                <div className="text-sm text-slate-600">
                  No element breakdown is available for this employee in this run.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-sm font-semibold text-slate-900">
                        Earnings
                      </div>
                      <div className="-mx-2 overflow-x-auto md:mx-0">
                        <table className="min-w-[320px] table-fixed border-separate border-spacing-0">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-800">
                                Code
                              </th>
                              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-800">
                                Description
                              </th>
                              <th className="whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-800">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {earningsList.map((el, idx) => (
                              <tr
                                key={el.id || idx}
                                className="border-b border-slate-200 last:border-b-0"
                              >
                                <td className="px-3 py-2 text-sm text-slate-900">
                                  {el.code ||
                                    el.typeCode ||
                                    el.description ||
                                    el.typeDescription ||
                                    "—"}
                                </td>
                                <td className="px-3 py-2 text-sm text-slate-700">
                                  {el.description ||
                                    el.typeDescription ||
                                    el.code ||
                                    el.typeCode ||
                                    "—"}
                                </td>
                                <td className="px-3 py-2 text-center text-sm text-slate-900">
                                  <span className={inter.className}>
                                    {gbp(
                                      toNumberSafe(
                                        (el.amount ?? 0) as number | string
                                      )
                                    )}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td className="px-3 py-2" />
                              <td className="px-3 py-2 text-sm font-semibold text-slate-900">
                                Total earnings
                              </td>
                              <td className="px-3 py-2 text-center text-sm text-slate-900">
                                <span className={inter.className}>
                                  {gbp(earningsTotal)}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-semibold text-slate-900">
                        Deductions
                      </div>
                      <div className="-mx-2 overflow-x-auto md:mx-0">
                        <table className="min-w-[320px] table-fixed border-separate border-spacing-0">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-800">
                                Code
                              </th>
                              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-800">
                                Description
                              </th>
                              <th className="whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-800">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {deductionsList.map((el, idx) => (
                              <tr
                                key={el.id || idx}
                                className="border-b border-slate-200 last:border-b-0"
                              >
                                <td className="px-3 py-2 text-sm text-slate-900">
                                  {el.code ||
                                    el.typeCode ||
                                    el.description ||
                                    el.typeDescription ||
                                    "—"}
                                </td>
                                <td className="px-3 py-2 text-sm text-slate-700">
                                  {el.description ||
                                    el.typeDescription ||
                                    el.code ||
                                    el.typeCode ||
                                    "—"}
                                </td>
                                <td className="px-3 py-2 text-center text-sm text-slate-900">
                                  <span className={inter.className}>
                                    {gbp(
                                      toNumberSafe(
                                        (el.amount ?? 0) as number | string
                                      )
                                    )}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td className="px-3 py-2" />
                              <td className="px-3 py-2 text-sm font-semibold text-slate-900">
                                Total deductions
                              </td>
                              <td className="px-3 py-2 text-center text-sm text-slate-900">
                                <span className={inter.className}>
                                  {gbp(deductionsTotal)}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-slate-900">
                    <div>
                      From elements:{" "}
                      <span className={inter.className}>
                        {gbp(earningsTotal)} earnings − {gbp(deductionsTotal)} deductions ={" "}
                        {gbp(netFromElements)} net
                      </span>
                    </div>
                    <div>
                      Row totals:{" "}
                      <span className={inter.className}>
                        {gbp(breakdownRow.gross)} gross, {gbp(breakdownRow.deductions)} deductions,{" "}
                        {gbp(breakdownRow.net)} net
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={closeBreakdown}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
