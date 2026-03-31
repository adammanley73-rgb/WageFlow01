// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\[id]\payslip\[employeeId]\page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";

import { formatUkDate } from "@/lib/formatUkDate";
import { PageShell, Header, Button, LinkButton } from "@/components/ui/wf-ui";

type NormalisedPayElement = {
  id: string;
  typeId: string;
  code: string;
  name: string;
  side: "earning" | "deduction";
  amount: number;
  taxableForPaye: boolean;
  nicEarnings: boolean;
  pensionable: boolean;
  aeQualifying: boolean;
  isSalarySacrificeType: boolean;
  description: string | null;
};

type PayslipApi = {
  ok?: boolean;
  payslip?: {
    runId: string;
    employeeId: string;
    payrollRunEmployeeId?: string | null;
    company?: {
      id?: string | null;
      name?: string | null;
      tradingName?: string | null;
      hmrcPayeReference?: string | null;
      raw?: any;
    } | null;
    employee?: {
      id?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      fullName?: string | null;
      employeeNumber?: string | null;
      email?: string | null;
      niNumber?: string | null;
      taxCode?: string | null;
      raw?: any;
    } | null;
    run?: {
      id?: string | null;
      runNumber?: string | null;
      runName?: string | null;
      frequency?: string | null;
      periodStart?: string | null;
      periodEnd?: string | null;
      payDate?: string | null;
      status?: string | null;
      raw?: any;
    } | null;
    totals?: {
      gross?: number | null;
      deductions?: number | null;
      net?: number | null;
      tax?: number | null;
      ni?: number | null;
    } | null;
    flags?: {
      payAfterLeaving?: boolean | null;
      isLeaver?: boolean | null;
    } | null;
    payElements?: {
      earnings?: NormalisedPayElement[] | null;
      deductions?: NormalisedPayElement[] | null;
    } | null;
    meta?: {
      generatedAt?: string | null;
      ssp?: any;
      initialTaxCode?: string | null;
      starterTaxCode?: string | null;
      finalTaxCode?: string | null;
    } | null;
    taxCode?: string | null;
  } | null;
  error?: string;
  message?: string;
  details?: string | null;
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
  subSectionTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 900,
    color: "rgba(0,0,0,0.8)",
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
  breakdownLabelWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  } as CSSProperties,
  breakdownMeta: {
    fontSize: 11,
    color: "rgba(0,0,0,0.58)",
    lineHeight: 1.35,
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

function toNumberSafe(v: unknown): number {
  const n =
    typeof v === "number"
      ? v
      : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function gbp(n: unknown): string {
  const safe = toNumberSafe(n);
  return safe.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function pickFirst(...vals: unknown[]) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    return v;
  }
  return null;
}

function formatTaxBasis(value: string | null | undefined): string {
  const v = String(value || "").trim().toLowerCase();
  if (v === "week1_month1") return "Week 1 / Month 1";
  if (v === "cumulative") return "Cumulative";
  return "—";
}

function formatFrequency(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "—";
  if (raw === "four_weekly") return "Four-weekly";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function upperTrim(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function normaliseText(value: unknown): string {
  return String(value ?? "").trim();
}

function amountsTotal(items: NormalisedPayElement[]): number {
  return round2(items.reduce((sum, item) => sum + toNumberSafe(item.amount), 0));
}

function isEmployerPensionElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  const desc = normaliseText(item.description).toLowerCase();

  return (
    code.includes("EMPLOYER") ||
    code.includes("PENSION_ER") ||
    name.includes("employer pension") ||
    desc.includes("employer pension")
  );
}

function isTaxElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  return code === "TAX_PAYE" || name.includes("paye");
}

function isNiElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  return code === "NIC_EMP" || name.includes("national insurance");
}

function elementTitle(item: NormalisedPayElement): string {
  return normaliseText(item.name) || normaliseText(item.code) || "Payroll item";
}

function elementMeta(item: NormalisedPayElement): string {
  const desc = normaliseText(item.description);
  const title = elementTitle(item);
  if (!desc) return "";
  if (desc.toLowerCase() === title.toLowerCase()) return "";
  return desc;
}

export default function PayslipPage() {
  const params = useParams();
  const runId = String((params as any)?.id || "");
  const employeeId = String((params as any)?.employeeId || "");

  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<PayslipApi | null>(null);
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

        const res = await fetch(`/api/payroll/${runId}/payslip/${employeeId}`, { cache: "no-store" });
        const j: PayslipApi = await res.json().catch(() => null as any);

        if (!res.ok || !j?.ok || !j?.payslip) {
          throw new Error(j?.message || j?.error || "Failed to load payslip");
        }

        if (!mounted) return;
        setData(j);
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

  const payslip = data?.payslip ?? null;
  const company = payslip?.company ?? null;
  const employee = payslip?.employee ?? null;
  const run = payslip?.run ?? null;
  const totals = payslip?.totals ?? null;
  const meta = payslip?.meta ?? null;

  const gross = toNumberSafe(totals?.gross);
  const totalDeductions = toNumberSafe(totals?.deductions);
  const net = toNumberSafe(totals?.net);
  const tax = toNumberSafe(totals?.tax);
  const ni = toNumberSafe(totals?.ni);

  const allEarnings = useMemo(() => {
    const items = Array.isArray(payslip?.payElements?.earnings) ? payslip?.payElements?.earnings : [];
    return items.filter((item) => toNumberSafe(item?.amount) > 0);
  }, [payslip]);

  const allDeductionElements = useMemo(() => {
    const items = Array.isArray(payslip?.payElements?.deductions) ? payslip?.payElements?.deductions : [];
    return items.filter((item) => toNumberSafe(item?.amount) > 0);
  }, [payslip]);

  const employerInfoElements = useMemo(() => {
    return allDeductionElements.filter((item) => isEmployerPensionElement(item));
  }, [allDeductionElements]);

  const employeeDeductionElements = useMemo(() => {
    return allDeductionElements.filter(
      (item) => !isTaxElement(item) && !isNiElement(item) && !isEmployerPensionElement(item)
    );
  }, [allDeductionElements]);

  const listedEarningsTotal = useMemo(() => amountsTotal(allEarnings), [allEarnings]);
  const listedEmployeeDeductionTotal = useMemo(
    () => amountsTotal(employeeDeductionElements),
    [employeeDeductionElements]
  );

  const otherEarnings = Math.max(0, round2(gross - listedEarningsTotal));
  const otherDeductions = Math.max(0, round2(totalDeductions - tax - ni - listedEmployeeDeductionTotal));

  const companyName = useMemo(() => {
    return String(pickFirst(company?.tradingName, company?.name, "Company name") || "Company name");
  }, [company]);

  const runNumber = useMemo(() => {
    return String(pickFirst(run?.runNumber, run?.runName, runId) || runId);
  }, [run, runId]);

  const periodText = useMemo(() => {
    const ps = pickFirst(run?.periodStart, null);
    const pe = pickFirst(run?.periodEnd, null);
    if (!ps || !pe) return "—";
    return `${formatUkDate(String(ps))} to ${formatUkDate(String(pe))}`;
  }, [run]);

  const payDateText = useMemo(() => {
    const pd = pickFirst(run?.payDate, null);
    return pd ? formatUkDate(String(pd)) : "—";
  }, [run]);

  const frequencyText = useMemo(() => {
    return formatFrequency(pickFirst(run?.frequency, "—"));
  }, [run]);

  const employeeName = useMemo(() => {
    return String(pickFirst(employee?.fullName, "—") || "—");
  }, [employee]);

  const employeeNumber = useMemo(() => {
    return String(pickFirst(employee?.employeeNumber, "—") || "—");
  }, [employee]);

  const taxCodeText = useMemo(() => {
    return String(pickFirst(payslip?.taxCode, employee?.taxCode, meta?.finalTaxCode, "—") || "—");
  }, [payslip, employee, meta]);

  const taxBasisText = useMemo(() => {
    const raw =
      employee && typeof employee === "object" && "raw" in employee
        ? pickFirst((employee.raw as any)?.tax_code_basis, (employee.raw as any)?.tax_code_basis_used, null)
        : null;
    return formatTaxBasis(raw ? String(raw) : "");
  }, [employee]);

  const niCategoryText = useMemo(() => {
    const raw =
      employee && typeof employee === "object" && "raw" in employee
        ? pickFirst((employee.raw as any)?.ni_category, (employee.raw as any)?.ni_category_used, null)
        : null;
    return String(raw || "—");
  }, [employee]);

  const taxCodeExampleText = useMemo(() => {
    const shown = taxCodeText && taxCodeText !== "—" ? taxCodeText : "1257L";

    if (shown.toUpperCase() === "1257L") {
      return "1257L is the standard UK tax code for many employees. It usually means an annual tax-free Personal Allowance of £12,570. Your allowance is normally spread across the tax year, so part of your pay is tax-free each period before PAYE is calculated. The exact result can change if HMRC applies cumulative or Week 1 / Month 1 rules, or if your code is adjusted.";
    }

    return `${shown} is the tax code HMRC has issued for this employment. It affects how much of your pay is treated as tax-free before PAYE is calculated. Codes can change during the year when HMRC updates your record.`;
  }, [taxCodeText]);

  const taxBasisExplanationText = useMemo(() => {
    const basis = String(taxBasisText || "").trim().toLowerCase();

    if (basis === "week 1 / month 1") {
      return "Week 1 / Month 1 means PAYE is worked out for this pay period on its own, without looking back at earlier pay and tax in the tax year. HMRC may use this for some starter or temporary code situations.";
    }

    if (basis === "cumulative") {
      return "Cumulative means PAYE is calculated using your pay and tax position across the tax year to date, not just this single period. This is the most common basis for regular payroll.";
    }

    return "Tax basis was not provided in the payslip data returned for this run.";
  }, [taxBasisText]);

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
            <div style={S.companyName}>{companyName}</div>
            <div style={S.companyMeta}>
              PAYE ref: {String(pickFirst(company?.hmrcPayeReference, company?.raw?.hmrc_paye_reference, "—") || "—")}
            </div>
            <div style={S.companyMeta}>Accounts Office ref: —</div>
          </div>

          <div style={S.payslipTitle}>
            Payslip
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.65)" }}>
              {periodText}. Pay date {payDateText}
            </div>
          </div>
        </div>

        <div style={S.grid}>
          <div style={S.block}>
            <div style={S.row}>
              <div style={S.label}>Employee</div>
              <div style={S.value}>{employeeName}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Employee No</div>
              <div style={S.value}>{employeeNumber}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Pay frequency</div>
              <div style={S.value}>{frequencyText}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Tax code</div>
              <div style={S.value}>{taxCodeText}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Tax basis</div>
              <div style={S.value}>{taxBasisText}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>NI category</div>
              <div style={S.value}>{niCategoryText}</div>
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
            <div style={S.row}>
              <div style={S.label}>Status</div>
              <div style={S.value}>{String(pickFirst(run?.status, "—") || "—")}</div>
            </div>
          </div>
        </div>

        <div style={S.totalsRow}>
          <div style={S.block}>
            <div style={S.label}>Gross pay</div>
            <div className="wf-num" style={S.num}>
              {gbp(gross)}
            </div>
          </div>

          <div style={S.block}>
            <div style={S.label}>Total deductions</div>
            <div className="wf-num" style={S.num}>
              {gbp(totalDeductions)}
            </div>
          </div>

          <div style={S.block}>
            <div style={S.label}>Net pay</div>
            <div className="wf-num" style={S.num}>
              {gbp(net)}
            </div>
          </div>
        </div>

        <div style={S.sectionTitle}>Breakdown and what it means</div>

        <div style={S.twoCol}>
          <div style={S.block}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>This payslip breakdown</div>

            <div style={S.subSectionTitle}>Earnings</div>

            {allEarnings.map((item) => {
              const metaText = elementMeta(item);
              return (
                <div key={`earn-${item.id}`} style={S.breakdownRow}>
                  <div style={S.breakdownLabelWrap}>
                    <div>{elementTitle(item)}</div>
                    {metaText ? <div style={S.breakdownMeta}>{metaText}</div> : null}
                  </div>
                  <div className="wf-num" style={{ fontWeight: 900 }}>
                    {gbp(item.amount)}
                  </div>
                </div>
              );
            })}

            {otherEarnings > 0 ? (
              <div style={S.breakdownRow}>
                <div style={S.breakdownLabelWrap}>
                  <div>Other earnings</div>
                  <div style={S.breakdownMeta}>Gross includes earnings not itemised in pay elements.</div>
                </div>
                <div className="wf-num" style={{ fontWeight: 900 }}>
                  {gbp(otherEarnings)}
                </div>
              </div>
            ) : null}

            <div style={S.breakdownRow}>
              <div style={{ fontWeight: 900 }}>Gross pay</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {gbp(gross)}
              </div>
            </div>

            <div style={S.subSectionTitle}>Deductions</div>

            <div style={S.breakdownRow}>
              <div>PAYE income tax</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {gbp(tax)}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div>National Insurance (employee)</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {gbp(ni)}
              </div>
            </div>

            {employeeDeductionElements.map((item) => {
              const metaText = elementMeta(item);
              return (
                <div key={`ded-${item.id}`} style={S.breakdownRow}>
                  <div style={S.breakdownLabelWrap}>
                    <div>{elementTitle(item)}</div>
                    {metaText ? <div style={S.breakdownMeta}>{metaText}</div> : null}
                  </div>
                  <div className="wf-num" style={{ fontWeight: 900 }}>
                    {gbp(item.amount)}
                  </div>
                </div>
              );
            })}

            {otherDeductions > 0 ? (
              <div style={S.breakdownRow}>
                <div style={S.breakdownLabelWrap}>
                  <div>Other deductions</div>
                  <div style={S.breakdownMeta}>Total deductions include amounts not itemised below.</div>
                </div>
                <div className="wf-num" style={{ fontWeight: 900 }}>
                  {gbp(otherDeductions)}
                </div>
              </div>
            ) : null}

            <div style={S.breakdownRow}>
              <div style={{ fontWeight: 900 }}>Total deductions</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {gbp(totalDeductions)}
              </div>
            </div>

            <div style={S.breakdownRow}>
              <div style={{ fontWeight: 900 }}>Net pay</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {gbp(net)}
              </div>
            </div>

            {employerInfoElements.length > 0 ? (
              <>
                <div style={S.subSectionTitle}>Employer-paid items</div>
                {employerInfoElements.map((item) => {
                  const metaText = elementMeta(item);
                  return (
                    <div key={`emp-info-${item.id}`} style={S.breakdownRow}>
                      <div style={S.breakdownLabelWrap}>
                        <div>{elementTitle(item)}</div>
                        <div style={S.breakdownMeta}>
                          {metaText || "Shown for transparency only. Not deducted from employee net pay."}
                        </div>
                      </div>
                      <div className="wf-num" style={{ fontWeight: 900 }}>
                        {gbp(item.amount)}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : null}
          </div>

          <div style={S.block}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>What these items mean</div>

            <div style={S.small}>
              1. Gross pay. Your total pay for the period before deductions. WageFlow now itemises the individual earnings
              lines that make up gross pay whenever those pay elements exist on the payroll run.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              2. PAYE income tax. Income Tax withheld under Pay As You Earn. The amount depends on your tax code, taxable
              pay, and whether HMRC applies cumulative rules or Week 1 / Month 1 rules.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              3. National Insurance. A statutory contribution based on your NI category and earnings thresholds. Employee NI
              is deducted from pay. Employer NI is a separate employer cost and is not taken from net pay.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              4. Other deductions. Pension, student loan, court orders, and similar items are listed separately when they
              exist as deduction elements on the payroll run.
            </div>
            <div style={{ height: 8 }} />

            <div style={S.small}>
              5. Net pay. The amount you receive after deductions. Gross pay minus total deductions should equal the final
              net pay shown on the payslip.
            </div>

            <div style={{ height: 14 }} />

            <div style={{ fontWeight: 900, marginBottom: 6 }}>Tax code example</div>
            <div style={S.small}>{taxCodeExampleText}</div>

            <div style={{ height: 12 }} />

            <div style={{ fontWeight: 900, marginBottom: 6 }}>Tax basis</div>
            <div style={S.small}>{taxBasisExplanationText}</div>

            <div style={{ height: 12 }} />

            <div style={S.hint}>
              This explanation is a plain-English guide. It is not tax advice. HMRC rules, thresholds, and your personal
              circumstances decide the actual calculation.
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
            .wf-no-print { }
          }
        `}
      </style>
    </PageShell>
  );
}