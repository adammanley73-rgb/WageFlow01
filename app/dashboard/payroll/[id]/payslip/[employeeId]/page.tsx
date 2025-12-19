// @ts-nocheck
// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\[id]\payslip\[employeeId]\page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";

import { formatUkDate } from "@/lib/formatUkDate";
import { PageShell, Header, Button, LinkButton } from "@/components/ui/wf-ui";

type RunApi = any;

type PayslipRow = {
  employee_id: string;

  employee_name?: string | null;
  employee_number?: string | null;
  email?: string | null;

  gross?: number | null;
  deductions?: number | null;
  net?: number | null;

  tax?: number | null;
  ni_employee?: number | null;
  pension_employee?: number | null;
  pension_employer?: number | null;

  other_deductions?: number | null;
  attachment_of_earnings?: number | null;
  student_loan?: number | null;
  postgrad_loan?: number | null;

  tax_code?: string | null;
  ni_category?: string | null;
};

const S = {
  sheet: {
    marginTop: "12px",
    background: "white",
    borderRadius: "1rem",
    padding: "16px",
  } as CSSProperties,
  header: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    paddingBottom: "12px",
    marginBottom: "12px",
  } as CSSProperties,
  companyBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } as CSSProperties,
  companyName: {
    fontSize: 18,
    fontWeight: 900,
  } as CSSProperties,
  companyMeta: {
    fontSize: 13,
    color: "rgba(0,0,0,0.7)",
  } as CSSProperties,
  payslipTitle: {
    textAlign: "right",
    fontWeight: 800,
    fontSize: 18,
  } as CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  } as CSSProperties,
  block: {
    background: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    padding: "12px",
  } as CSSProperties,
  row: {
    display: "grid",
    gridTemplateColumns: "160px 1fr",
    gap: 10,
    fontSize: 14,
    marginBottom: 6,
  } as CSSProperties,
  label: {
    color: "rgba(0,0,0,0.65)",
  } as CSSProperties,
  value: {
    fontWeight: 700,
  } as CSSProperties,
  totalsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    marginTop: 12,
  } as CSSProperties,
  num: {
    fontWeight: 900,
  } as CSSProperties,
  printBar: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 12,
  } as CSSProperties,

  sectionTitle: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid rgba(0,0,0,0.08)",
    fontSize: 14,
    fontWeight: 900,
    color: "rgba(0,0,0,0.85)",
  } as CSSProperties,

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 10,
  } as CSSProperties,

  breakdownRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.55)",
    border: "1px solid rgba(0,0,0,0.06)",
    marginBottom: 8,
    fontSize: 13,
  } as CSSProperties,

  small: {
    fontSize: 12,
    color: "rgba(0,0,0,0.7)",
    lineHeight: 1.35,
  } as CSSProperties,

  hint: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(15,60,133,0.06)",
    border: "1px solid rgba(15,60,133,0.12)",
    fontSize: 12,
    color: "rgba(0,0,0,0.75)",
    lineHeight: 1.4,
  } as CSSProperties,
};

function toNumberSafe(v: any): number {
  const n =
    typeof v === "number"
      ? v
      : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function gbp(n: any): string {
  const safe = toNumberSafe(n);
  return safe.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
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

export default function PayslipPage() {
  const params = useParams();
  const runId = String((params as any)?.id || "");
  const employeeId = String((params as any)?.employeeId || "");

  const [hydrated, setHydrated] = useState(false);

  const [companyName, setCompanyName] = useState<string>("Company name");
  const [run, setRun] = useState<RunApi | null>(null);
  const [row, setRow] = useState<PayslipRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setErr(null);
        setLoading(true);

        if (!runId || !employeeId) {
          throw new Error("Missing run id or employee id");
        }

        try {
          const cRes = await fetch("/api/active-company", { cache: "no-store" });
          if (cRes.ok) {
            const cj = await cRes.json().catch(() => null);
            const name = String(cj?.name ?? "").trim();
            if (name) setCompanyName(name);
          }
        } catch {
          // ignore
        }

        const res = await fetch(`/api/payroll/${runId}`, { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to load payroll run ${runId}`);
        }

        const j: any = await res.json();

        const runObj: any = j?.run || null;
        const employees: any[] = Array.isArray(j?.employees) ? j.employees : [];

        const match =
          employees.find((e: any) => String(e?.employee_id || "") === employeeId) ||
          employees.find((e: any) => String(e?.employeeId || "") === employeeId) ||
          employees.find((e: any) => String(e?.id || "") === employeeId) ||
          null;

        if (!mounted) return;

        setRun(runObj);

        if (!match) {
          setRow(null);
          setErr("No payroll row found for this employee in this run");
          return;
        }

        const gross = toNumberSafe(pickFirst(match.gross, match.gross_pay, match.total_gross, match.gross_pay_used, 0));

        const tax = toNumberSafe(
          pickFirst(match.tax, match.total_tax, match.tax_pay, match.paye_tax, match.income_tax, 0)
        );

        const niEmp = toNumberSafe(
          pickFirst(
            match.ni,
            match.ni_employee,
            match.employee_ni,
            match.niEmployee,
            match.employeeNi,
            0
          )
        );

        const pensionEmp = toNumberSafe(
          pickFirst(match.pension_employee, match.pensionEmployee, match.employee_pension, 0)
        );

        const pensionEr = toNumberSafe(
          pickFirst(match.pension_employer, match.pensionEmployer, match.employer_pension, 0)
        );

        const aeo = toNumberSafe(
          pickFirst(match.attachment_of_earnings, match.attachmentOfEarnings, 0)
        );

        const other = toNumberSafe(pickFirst(match.other_deductions, match.otherDeductions, 0));

        const studentLoan = toNumberSafe(pickFirst(match.student_loan, match.studentLoan, 0));
        const pgLoan = toNumberSafe(pickFirst(match.pg_loan, match.postgrad_loan, match.pgLoan, 0));

        const net = toNumberSafe(pickFirst(match.net, match.net_pay, match.total_net, gross - (tax + niEmp + pensionEmp + other + aeo + studentLoan + pgLoan)));

        const deductionsDirect = toNumberSafe(
          pickFirst(match.deductions, match.total_deductions, match.deduction_total, null)
        );

        const computedKnownDeductions = tax + niEmp + pensionEmp + other + aeo + studentLoan + pgLoan;

        const deductions =
          deductionsDirect && deductionsDirect > 0
            ? deductionsDirect
            : Number((gross - net).toFixed(2));

        const remainderOther =
          deductions > 0 && computedKnownDeductions > 0
            ? Math.max(0, Number((deductions - computedKnownDeductions).toFixed(2)))
            : 0;

        const taxCode = String(pickFirst(match.tax_code_used, match.tax_code, match.taxCode, "") || "").trim() || null;
        const niCat = String(pickFirst(match.ni_category_used, match.ni_category, match.niCategory, "") || "").trim() || null;

        setRow({
          employee_id: String(pickFirst(match.employee_id, match.employeeId, match.id, "") || ""),
          employee_name: String(pickFirst(match.employee_name, match.employeeName, "—") || "—"),
          employee_number: String(pickFirst(match.employee_number, match.employeeNumber, match.payroll_number, "—") || "—"),
          email: String(pickFirst(match.email, match.employee_email, "—") || "—"),

          gross: Number(gross.toFixed(2)),
          deductions: Number(deductions.toFixed(2)),
          net: Number(net.toFixed(2)),

          tax: Number(tax.toFixed(2)),
          ni_employee: Number(niEmp.toFixed(2)),
          pension_employee: Number(pensionEmp.toFixed(2)),
          pension_employer: Number(pensionEr.toFixed(2)),

          other_deductions: Number((other + remainderOther).toFixed(2)),
          attachment_of_earnings: Number(aeo.toFixed(2)),
          student_loan: Number(studentLoan.toFixed(2)),
          postgrad_loan: Number(pgLoan.toFixed(2)),

          tax_code: taxCode,
          ni_category: niCat,
        });
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Failed to load payslip");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (hydrated) load();

    return () => {
      mounted = false;
    };
  }, [runId, employeeId, hydrated]);

  const runNumber = useMemo(() => {
    const r: any = run || {};
    return String(pickFirst(r.run_number, r.runNumber, r.run_name, r.runName, runId) || runId);
  }, [run, runId]);

  const periodText = useMemo(() => {
    const r: any = run || {};
    const ps = pickFirst(r.period_start, r.periodStart, r.pay_period_start, r.payPeriodStart, null);
    const pe = pickFirst(r.period_end, r.periodEnd, r.pay_period_end, r.payPeriodEnd, null);
    if (!ps || !pe) return "—";
    return `${formatUkDate(String(ps))} to ${formatUkDate(String(pe))}`;
  }, [run]);

  const payDateText = useMemo(() => {
    const r: any = run || {};
    const pd = pickFirst(r.pay_date, r.payDate, null);
    return pd ? formatUkDate(String(pd)) : "—";
  }, [run]);

  const frequencyText = useMemo(() => {
    const r: any = run || {};
    return String(pickFirst(r.frequency, r.pay_frequency, r.payFrequency, "—") || "—");
  }, [run]);

  const taxCodeExampleText = useMemo(() => {
    const code = String(row?.tax_code || "").trim();
    const shown = code || "1257L";
    if (!shown) return "—";

    if (shown.toUpperCase() === "1257L") {
      return "1257L is the standard UK tax code for many employees. It usually means an annual tax-free Personal Allowance of £12,570. Your allowance is normally spread across the tax year, so part of your pay is tax-free each period before PAYE is calculated. The exact result can change if HMRC applies cumulative or Week 1 / Month 1 rules, or if your code is adjusted.";
    }

    return `${shown} is the tax code HMRC has issued for this employment. It affects how much of your pay is treated as tax-free before PAYE is calculated. Codes can change during the year when HMRC updates your record.`;
  }, [row?.tax_code]);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "linear-gradient(180deg, #10b981 0%, #0f3c85 100%)",
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            background: "rgba(255,255,255,0.92)",
            borderRadius: 16,
            padding: 16,
            fontWeight: 800,
          }}
        >
          Loading payslip...
        </div>
      </div>
    );
  }

  const tax = toNumberSafe(row?.tax);
  const niEmp = toNumberSafe(row?.ni_employee);
  const penEmp = toNumberSafe(row?.pension_employee);
  const penEr = toNumberSafe(row?.pension_employer);
  const otherDed = toNumberSafe(row?.other_deductions);
  const aeo = toNumberSafe(row?.attachment_of_earnings);
  const sl = toNumberSafe(row?.student_loan);
  const pgl = toNumberSafe(row?.postgrad_loan);

  const anyDetailedDeduction =
    tax > 0 || niEmp > 0 || penEmp > 0 || otherDed > 0 || aeo > 0 || sl > 0 || pgl > 0;

  return (
    <PageShell>
      <Header
        title="Payslip"
        subtitle="Printable payslip. Use the Print button to save as PDF."
        actions={
          <div className="wf-no-print" style={{ display: "flex", gap: 8 }}>
            <LinkButton href={`/dashboard/payroll/${runId}`} variant="secondary">
              Back to run
            </LinkButton>
            <Button onClick={() => window.print()} variant="primary">
              Print
            </Button>
          </div>
        }
      />

      {loading ? (
        <div
          style={{
            padding: "12px 16px",
            marginTop: 12,
            borderRadius: 8,
            background: "rgba(15,60,133,0.08)",
            color: "var(--wf-blue)",
            fontWeight: 700,
          }}
        >
          Loading payslip...
        </div>
      ) : null}

      {err ? (
        <div
          style={{
            padding: "12px 16px",
            marginTop: 12,
            borderRadius: 8,
            background: "rgba(220,38,38,0.08)",
            color: "#991b1b",
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={S.sheet}>
        <div style={S.header}>
          <div style={S.companyBlock}>
            <div style={S.companyName}>{companyName || "Company name"}</div>
            <div style={S.companyMeta}>Company address</div>
            <div style={S.companyMeta}>PAYE ref: —</div>
            <div style={S.companyMeta}>Accounts Office ref: —</div>
          </div>

          <div style={S.payslipTitle}>
            Payslip
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.65)" }}>
              {run ? `${periodText}. Pay date ${payDateText}` : "—"}
            </div>
          </div>
        </div>

        <div style={S.grid}>
          <div style={S.block}>
            <div style={S.row}>
              <div style={S.label}>Employee</div>
              <div style={S.value}>{row?.employee_name ?? "—"}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Employee No</div>
              <div style={S.value}>{row?.employee_number ?? "—"}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Pay frequency</div>
              <div style={S.value}>{frequencyText}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Tax code</div>
              <div style={S.value}>{row?.tax_code ?? "—"}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>NI category</div>
              <div style={S.value}>{row?.ni_category ?? "—"}</div>
            </div>
          </div>

          <div style={S.block}>
            <div style={S.row}>
              <div style={S.label}>Run</div>
              <div style={S.value}>{runNumber}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Period</div>
              <div style={S.value}>{periodText}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Pay date</div>
              <div style={S.value}>{payDateText}</div>
            </div>
          </div>
        </div>

        <div style={S.totalsRow}>
          <div style={S.block}>
            <div style={S.label}>Gross pay</div>
            <div className="wf-num" style={S.num}>
              {row ? gbp(row.gross) : "—"}
            </div>
          </div>

          <div style={S.block}>
            <div style={S.label}>Total deductions</div>
            <div className="wf-num" style={S.num}>
              {row ? gbp(row.deductions) : "—"}
            </div>
          </div>

          <div style={S.block}>
            <div style={S.label}>Net pay</div>
            <div className="wf-num" style={S.num}>
              {row ? gbp(row.net) : "—"}
            </div>
          </div>
        </div>

        <div style={S.sectionTitle}>Breakdown and what it means</div>

        <div style={S.twoCol}>
          <div style={S.block}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>This payslip breakdown</div>

            <div style={S.breakdownRow}>
              <div>Gross pay</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row ? gbp(row.gross) : "—"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>PAYE income tax</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row && anyDetailedDeduction ? gbp(tax) : "Not available yet"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>National Insurance (employee)</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row && anyDetailedDeduction ? gbp(niEmp) : "Not available yet"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>Pension (employee)</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row && anyDetailedDeduction ? gbp(penEmp) : "Not available yet"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>Pension (employer, not deducted)</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row && anyDetailedDeduction ? gbp(penEr) : "Not available yet"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>Student loan</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row && anyDetailedDeduction ? gbp(sl) : "Not available yet"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>Postgraduate loan</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row && anyDetailedDeduction ? gbp(pgl) : "Not available yet"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>Attachment of earnings / court orders</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row && anyDetailedDeduction ? gbp(aeo) : "Not available yet"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>Other deductions</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row && anyDetailedDeduction ? gbp(otherDed) : "Not available yet"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div style={{ fontWeight: 900 }}>Total deductions</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row ? gbp(row.deductions) : "—"}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div style={{ fontWeight: 900 }}>Net pay</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {row ? gbp(row.net) : "—"}
              </div>
            </div>

            <div style={S.hint}>
              If the run API does not return separate PAYE, NI, pension, and loan figures yet, WageFlow will show “Not available yet” rather than lying. Totals still remain correct.
            </div>
          </div>

          <div style={S.block}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>What these items mean</div>

            <div style={S.small}>
              1. Gross pay. Your total pay for the period before deductions. This can include basic pay, overtime, bonuses, and statutory payments (such as SSP or SMP) if applicable.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              2. PAYE income tax. Income Tax withheld under Pay As You Earn. The amount depends on your tax code, taxable pay, and whether HMRC applies cumulative rules (most common) or Week 1 / Month 1 rules.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              3. National Insurance (NI). A statutory contribution based on your NI category and earnings thresholds. Payslips usually show employee NI. Employer NI exists too, but it is not deducted from your pay.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              4. Pensions. Employee pension contributions reduce your take-home pay. Employer contributions do not reduce your pay, but they can be shown for transparency.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              5. Statutory deductions. These include student loan deductions, attachment of earnings orders, court orders, and other mandated deductions. They are separate from PAYE and NI.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              6. Net pay. The amount you receive after deductions. If a payment is held back for any reason, the paid amount can differ from net pay, but net pay remains the standard headline figure.
            </div>

            <div style={{ height: 14 }} />

            <div style={{ fontWeight: 900, marginBottom: 6 }}>Tax code example</div>
            <div style={S.small}>{taxCodeExampleText}</div>

            <div style={{ height: 12 }} />

            <div style={S.hint}>
              This explanation is a plain-English guide. It is not tax advice. HMRC rules, thresholds, and your personal circumstances decide the actual calculation.
            </div>
          </div>
        </div>

        <div style={S.printBar} className="wf-no-print">
          <Button variant="primary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <style>
        {`
          @media print {
            .wf-no-print { display: none !important; }
            body, html { background: #fff !important; }
          }

          @media (max-width: 900px) {
            /* Keep it readable on smaller screens */
            .wf-no-print { }
          }
        `}
      </style>
    </PageShell>
  );
}
