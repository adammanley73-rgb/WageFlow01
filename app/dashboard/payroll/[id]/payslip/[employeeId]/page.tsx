// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\[id]\payslip\[employeeId]\page.tsx
/* @ts-nocheck */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { formatUkDate } from "@/lib/formatUkDate";

type PayslipApiResponse = any;

function toNumber(v: any): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function gbp(v: any): string {
  const n = toNumber(v);
  return n.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  });
}

function formatPaymentDescription(el: any): string {
  const base =
    el?.description ||
    el?.typeDescription ||
    el?.name ||
    el?.code ||
    "Payment";

  const meta = el?.meta || {};
  const hours =
    el?.hours ??
    el?.quantity ??
    el?.units ??
    meta?.hours ??
    meta?.qty ??
    null;
  const rate =
    el?.rate ??
    el?.hourly_rate ??
    meta?.rate ??
    meta?.hourly_rate ??
    null;
  const multiplier =
    el?.multiplier ??
    meta?.multiplier ??
    meta?.ot_multiplier ??
    null;

  const parts: string[] = [base];

  if (hours != null && rate != null) {
    const hoursNum = toNumber(hours);
    const rateNum = toNumber(rate);
    const multNum = multiplier != null ? toNumber(multiplier) : 1;
    let extra = `${hoursNum}h @ ${gbp(rateNum)}`;
    if (multNum && multNum !== 1) {
      extra += ` x ${multNum}`;
    }
    parts.push(extra);
  }

  return parts.join(" · ");
}

export default function PayslipPage() {
  const params = useParams() as { id?: string; employeeId?: string };
  const searchParams = useSearchParams();
  const router = useRouter();

  const runId =
    (params?.id as string) ??
    searchParams?.get("runId") ??
    searchParams?.get("run_id") ??
    "";

  // Handle both route segment `[employeeId]` and query string `?employeeId=`
  const employeeId =
    (params?.employeeId as string) ??
    searchParams?.get("employeeId") ??
    searchParams?.get("employee_id") ??
    "";

  const [data, setData] = useState<PayslipApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!runId || !employeeId) {
      setErr("Missing run or employee id for payslip.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/payroll/${runId}/payslip/${employeeId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed to load payslip for run ${runId}`);
      }
      const j = (await res.json()) as PayslipApiResponse;
      // Some routes wrap the payload in .body
      const body = j?.body && j.body.ok !== undefined ? j.body : j;
      setData(body);
    } catch (e: any) {
      setErr(e?.message || "Failed to load payslip.");
    } finally {
      setLoading(false);
    }
  }, [runId, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  // ----- Unpack API response safely -----

  // Root payslip object – handle both { payslip: {...} } and flat response.
  const rootPayslip =
    data?.payslip ||
    data?.payslipData ||
    data?.payslip_payload ||
    data ||
    {};

  const run =
    data?.run ||
    data?.payrollRun ||
    rootPayslip?.run ||
    rootPayslip?.payrollRun ||
    {};

  const employee =
    data?.employee ||
    data?.worker ||
    rootPayslip?.employee ||
    rootPayslip?.worker ||
    {};

  const employer =
    data?.employer ||
    data?.company ||
    rootPayslip?.employer ||
    rootPayslip?.company ||
    {};

  // Employer name & address
  const employerName =
    rootPayslip?.employerName ||
    rootPayslip?.companyName ||
    employer?.name ||
    employer?.company_name ||
    employer?.employer_name ||
    run?.employer_name ||
    run?.company_name ||
    "Employer name";

  const employerAddressLines = [
    rootPayslip?.employerAddressLine1 ||
      employer?.address_line1 ||
      employer?.addressLine1,
    rootPayslip?.employerAddressLine2 ||
      employer?.address_line2 ||
      employer?.addressLine2,
    rootPayslip?.employerTown || employer?.town || employer?.city,
    rootPayslip?.employerPostcode ||
      employer?.postcode ||
      employer?.post_code,
  ].filter(Boolean);

  const payeRef =
    rootPayslip?.paye_reference ||
    rootPayslip?.payeRef ||
    employer?.paye_reference ||
    employer?.payeRef ||
    run?.paye_reference ||
    run?.payeRef ||
    "";

  // Employee name, number, address
  const employeeNameFromRoot =
    rootPayslip?.employeeName || rootPayslip?.workerName;
  const employeeNumberFromRoot =
    rootPayslip?.employeeNumber || rootPayslip?.workerNumber;

  const employeeFirst = employee?.first_name || employee?.forename || "";
  const employeeLast = employee?.last_name || employee?.surname || "";
  const employeeNameValue = [employeeFirst, employeeLast]
    .filter(Boolean)
    .join(" ");

  const employeeName =
    employeeNameFromRoot ||
    employee?.fullName ||
    employee?.name ||
    employeeNameValue ||
    "Employee name";

  const employeeNumber =
    employeeNumberFromRoot ||
    employee?.employee_number ||
    employee?.employeeNumber ||
    "—";

  const employeeAddressLines = [
    rootPayslip?.employeeAddressLine1 ||
      employee?.address_line1 ||
      employee?.addressLine1,
    rootPayslip?.employeeAddressLine2 ||
      employee?.address_line2 ||
      employee?.addressLine2,
    rootPayslip?.employeeTown || employee?.town || employee?.city,
    rootPayslip?.employeePostcode ||
      employee?.postcode ||
      employee?.post_code,
  ].filter(Boolean);

  const taxCode =
    rootPayslip?.taxCode ||
    employee?.tax_code ||
    employee?.taxCode ||
    run?.tax_code ||
    run?.taxCode ||
    "";

  const niNumber =
    rootPayslip?.ni_number ||
    rootPayslip?.niNumber ||
    employee?.ni_number ||
    employee?.niNumber ||
    employee?.nin ||
    employee?.national_insurance_number ||
    "";

  const periodStart =
    rootPayslip?.periodStart ||
    rootPayslip?.pay_period_start ||
    run?.periodStart ||
    run?.pay_period_start ||
    run?.period_start ||
    "";

  const periodEnd =
    rootPayslip?.periodEnd ||
    rootPayslip?.pay_period_end ||
    run?.periodEnd ||
    run?.pay_period_end ||
    run?.period_end ||
    "";

  const payDate =
    rootPayslip?.payDate ||
    rootPayslip?.date_paid ||
    run?.payDate ||
    run?.pay_date ||
    "";

  const frequency =
    rootPayslip?.frequency ||
    run?.frequency ||
    run?.pay_frequency ||
    run?.run_frequency ||
    "";

  // Try all plausible shapes for earnings/payments & deductions.
  const payElements =
    rootPayslip?.payElements ||
    rootPayslip?.elements ||
    rootPayslip?.pay_elements ||
    {};

  const payments: any[] =
    rootPayslip?.payments ||
    rootPayslip?.earnings ||
    payElements?.earnings ||
    payElements?.payments ||
    [];

  const deductions: any[] =
    rootPayslip?.deductions ||
    rootPayslip?.deductionLines ||
    payElements?.deductions ||
    [];

  // Totals (period & YTD)
  const totals =
    rootPayslip?.totals || rootPayslip?.summary || data?.totals || {};

  const grossThis =
    toNumber(
      totals?.gross ??
        totals?.periodGross ??
        totals?.total_gross ??
        totals?.total_gross_pay
    ) || payments.reduce((s, el) => s + toNumber(el?.amount), 0);

  const grossYtd =
    toNumber(
      totals?.grossYtd ??
        totals?.gross_ytd ??
        totals?.ytdGross ??
        totals?.ytd_gross ??
        employee?.ytd_gross
    ) || 0;

  const dedThis =
    toNumber(
      totals?.deductions ??
        totals?.total_deductions ??
        totals?.deductionsThisPeriod ??
        totals?.total_deductions_this_period
    ) || deductions.reduce((s, el) => s + toNumber(el?.amount), 0);

  const dedYtd =
    toNumber(
      totals?.deductionsYtd ??
        totals?.deductions_ytd ??
        totals?.ytdDeductions ??
        totals?.ytd_deductions
    ) || 0;

  const netThis =
    toNumber(
      totals?.net ??
        totals?.netThisPeriod ??
        totals?.total_net ??
        totals?.total_net_pay
    ) || grossThis - dedThis;

  const netYtd =
    toNumber(
      totals?.netYtd ??
        totals?.net_ytd ??
        totals?.ytdNet ??
        totals?.ytd_net
    ) || grossYtd - dedYtd;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0fbf74] to-[#0f3c85] px-3 py-4 print:bg-white print:px-0 print:py-0 print:min-h-0">
      {/* Non-printable header actions */}
      <div className="mx-auto mb-3 flex w-full max-w-4xl items-center justify-between text-xs text-white print:hidden">
        <button
          type="button"
          onClick={() => {
            if (runId) {
              router.push(`/dashboard/payroll/${encodeURIComponent(runId)}`);
            } else {
              router.push("/dashboard/payroll");
            }
          }}
          className="inline-flex w-32 items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm ring-1 ring-white/30 transition hover:bg-[#0b2b5f]"
        >
          ← Back to run
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] font-semibold text-[#0f3c85] sm:inline">
            Printable payslip (A4)
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex w-32 items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm ring-1 ring-white/30 transition hover:bg-[#0b2b5f]"
          >
            Print payslip
          </button>
        </div>
      </div>

      {/* Main payslip card */}
      <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white text-[11px] shadow-xl ring-1 ring-slate-200 print:m-0 print:w-[190mm] print:max-w-none print:rounded-none print:text-[9px] print:shadow-none print:ring-0">
        {loading && (
          <div className="px-6 py-10 text-center text-slate-600">
            Loading payslip…
          </div>
        )}

        {!loading && err && (
          <div className="px-6 py-10 text-center text-red-700">{err}</div>
        )}

        {!loading && !err && (
          <>
            {/* HEADER: employer / employee */}
            <div className="border-b border-slate-200 px-6 py-3 text-slate-700">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                {/* Employer */}
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">
                    Employer
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {employerName}
                  </div>
                  {employerAddressLines.length > 0 &&
                    employerAddressLines.map((line: string, idx: number) => (
                      <div key={idx}>{line}</div>
                    ))}
                  <div className="mt-1">
                    <span className="font-semibold">PAYE ref:&nbsp;</span>
                    <span>{payeRef || "—"}</span>
                  </div>
                </div>

                {/* Employee */}
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">
                    Employee
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {employeeName}
                  </div>
                  <div>Employee no: {employeeNumber}</div>
                  {employeeAddressLines.length > 0 &&
                    employeeAddressLines.map((line: string, idx: number) => (
                      <div key={idx}>{line}</div>
                    ))}
                  <div className="mt-1">
                    <span className="font-semibold">NI no:&nbsp;</span>
                    <span>{niNumber || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Period / tax info */}
              <div className="mt-3 grid gap-2 text-[10px] text-slate-700 md:grid-cols-4">
                <div>
                  <div className="font-semibold text-slate-600">Pay period</div>
                  <div>
                    {periodStart && periodEnd
                      ? `${formatUkDate(periodStart)} to ${formatUkDate(
                          periodEnd
                        )}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-600">Pay date</div>
                  <div>{payDate ? formatUkDate(payDate) : "—"}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-600">Tax code</div>
                  <div>{taxCode || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-600">
                    Pay frequency
                  </div>
                  <div>{frequency || "—"}</div>
                </div>
              </div>
            </div>

            {/* MAIN: Payments (left), Deductions (middle), Net pay (right) */}
            <div className="grid gap-3 border-b border-slate-200 px-6 py-3 md:grid-cols-3">
              {/* PAYMENTS */}
              <div className="md:col-span-1">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Payments
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-semibold text-slate-700">
                        <th className="border-b border-slate-200 px-3 py-1.5 text-left">
                          Description
                        </th>
                        <th className="border-b border-slate-200 px-3 py-1.5 text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!payments || payments.length === 0) && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-[10px] text-slate-500"
                          >
                            No payments recorded for this period.
                          </td>
                        </tr>
                      )}
                      {payments &&
                        payments.map((el: any, idx: number) => (
                          <tr
                            key={el?.id || idx}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-3 py-1.5 align-top text-[10px] text-slate-700">
                              {formatPaymentDescription(el)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-[10px] text-slate-900">
                              {gbp(el?.amount)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        Total gross this period
                      </span>
                      <span className="font-semibold">{gbp(grossThis)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-slate-600">
                      <span>Gross pay year to date</span>
                      <span>{gbp(grossYtd)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div className="md:col-span-1">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Deductions
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-semibold text-slate-700">
                        <th className="border-b border-slate-200 px-3 py-1.5 text-left">
                          Description
                        </th>
                        <th className="border-b border-slate-200 px-3 py-1.5 text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!deductions || deductions.length === 0) && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-[10px] text-slate-500"
                          >
                            No deductions recorded for this period.
                          </td>
                        </tr>
                      )}
                      {deductions &&
                        deductions.map((el: any, idx: number) => (
                          <tr
                            key={el?.id || idx}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-3 py-1.5 align-top text-[10px] text-slate-700">
                              {el?.description ||
                                el?.typeDescription ||
                                el?.name ||
                                el?.code ||
                                "Deduction"}
                            </td>
                            <td className="px-3 py-1.5 text-right text-[10px] text-slate-900">
                              {gbp(el?.amount)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        Total deductions this period
                      </span>
                      <span className="font-semibold">{gbp(dedThis)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-slate-600">
                      <span>Deductions year to date</span>
                      <span>{gbp(dedYtd)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NET PAY */}
              <div className="md:col-span-1">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Net pay
                </div>
                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px]">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-700">
                      Take-home pay this period
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {gbp(netThis)}
                    </div>
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-2 text-[10px] text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Net pay year to date</span>
                      <span className="font-semibold">{gbp(netYtd)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NOTES (bottom half of A4) */}
            <div className="px-6 pb-3 pt-2 text-[10px] leading-snug text-slate-700">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Notes about this payslip
              </div>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <span className="font-semibold">Basic pay:</span> For salaried
                  employees, basic pay is shown as a single line. Any overtime
                  worked is shown as separate lines with hours and, if
                  applicable, the overtime multiplier (for example{" "}
                  <span className="font-mono">20h @ £X.XX x 1.25</span>).
                </li>
                <li>
                  <span className="font-semibold">Hourly pay:</span> For hourly
                  paid employees, lines normally show the number of hours and
                  the hourly rate (for example{" "}
                  <span className="font-mono">25h @ £X.XX</span>). Overtime hours
                  appear on separate lines.
                </li>
                <li>
                  <span className="font-semibold">Deductions:</span> Includes
                  PAYE income tax, National Insurance, pension contributions and
                  other agreed deductions. Statutory deductions (such as student
                  loans) are shown where applicable.
                </li>
                <li>
                  <span className="font-semibold">Year-to-date (YTD) totals:</span>{" "}
                  Gross, deductions and net YTD figures are cumulative from the
                  start of the current tax year.
                </li>
                <li>
                  <span className="font-semibold">
                    Tax code &amp; PAYE reference:
                  </span>{" "}
                  Used to determine how much tax is deducted and which PAYE
                  scheme your employer uses with HMRC.
                </li>
                <li>
                  <span className="font-semibold">Queries:</span> If anything on
                  this payslip looks incorrect or unclear, contact your employer
                  or payroll department as soon as possible.
                </li>
              </ul>
              <div className="mt-2 text-[9px] text-slate-500">
                This payslip is provided for your records. Keep it in a safe
                place.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
