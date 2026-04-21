// C:\Projects\wageflow01\app\dashboard\payroll\[id]\payslip\[employeeId]\page.tsx

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

type CorrectedPayrollRow = {
  payrollRunEmployeeId?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  contractJobTitle?: string | null;
  contractStatus?: string | null;
  contractStartDate?: string | null;
  contractLeaveDate?: string | null;
  contractPayAfterLeaving?: boolean | null;
  gross?: number | null;
  tax?: number | null;
  employeeNi?: number | null;
  employerNi?: number | null;
  net?: number | null;
};

type PayslipApi = {
  ok?: boolean;
  payslip?: {
    runId: string;
    employeeId: string;
    payrollRunEmployeeId?: string | null;
    combinedPayrollRunEmployeeIds?: string[] | null;
    combinedPayrollRowCount?: number | null;
    correctedPayrollRows?: CorrectedPayrollRow[] | null;
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
      usedCorrectedRunDetailRows?: boolean | null;
      employeeBreakdown?: {
        tax?: number | null;
        employeeNi?: number | null;
        salarySacrifice?: number | null;
        employeePension?: number | null;
        employeeOtherDeductions?: number | null;
      } | null;
      employerBreakdown?: {
        employerNi?: number | null;
        employerPension?: number | null;
        employerOnlyTotal?: number | null;
      } | null;
    } | null;
    taxCode?: string | null;
  } | null;
  error?: string;
  message?: string;
  details?: string | null;
};

type BreakdownLine = {
  key: string;
  title: string;
  amount: number;
  meta?: string;
};

type ContractCard = {
  key: string;
  title: string;
  jobTitle: string | null;
  status: string | null;
  startDate: string | null;
  leaveDate: string | null;
  payAfterLeaving: boolean;
  gross: number;
  grossBeforeSalarySacrifice: number;
  salarySacrifice: number;
  salarySacrificeMeta: string | null;
  tax: number;
  employeeNi: number;
  employerNi: number;
  net: number;
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
  contractGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 10,
  } as CSSProperties,
  contractCard: {
    background: "rgba(15,60,133,0.04)",
    border: "1px solid rgba(15,60,133,0.12)",
    borderRadius: 14,
    padding: 14,
  } as CSSProperties,
  contractHeaderTitle: {
    fontSize: 14,
    fontWeight: 900,
    marginBottom: 6,
  } as CSSProperties,
  chipRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 8,
  } as CSSProperties,
  chip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: "rgba(15,60,133,0.08)",
    color: "var(--wf-blue)",
    border: "1px solid rgba(15,60,133,0.12)",
  } as CSSProperties,
  chipWarn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: "rgba(217,119,6,0.1)",
    color: "#92400e",
    border: "1px solid rgba(217,119,6,0.16)",
  } as CSSProperties,
} as const;

function toNumberSafe(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
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

function formatEmbeddedUkDates(value: string): string {
  return String(value || "").replace(/\b([0-9]{4})-([0-9]{2})-([0-9]{2})\b/g, (_m, year, month, day) => {
    return `${day}-${month}-${year}`;
  });
}

function cleanPayslipMetaText(value: unknown): string {
  const withoutFallback = normaliseText(value).replace(/\s*\(generated by local full compute fallback\)\s*/gi, " ");
  const withUkDates = formatEmbeddedUkDates(withoutFallback);
  return withUkDates.replace(/\s+/g, " ").trim();
}

function amountsTotal(items: Array<{ amount: number }>): number {
  return round2(items.reduce((sum, item) => sum + toNumberSafe(item.amount), 0));
}

function isTaxElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  return code === "TAX_PAYE" || code === "PAYE" || name.includes("paye") || name.includes("income tax");
}

function isEmployeeNiElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  const desc = normaliseText(item.description).toLowerCase();

  return (
    code === "NIC_EMP" ||
    code === "EE_NI" ||
    code === "NI_EMP" ||
    code === "EMPLOYEE_NI" ||
    name.includes("national insurance (employee)") ||
    name.includes("employee ni") ||
    desc.includes("employee ni")
  );
}

function isEmployerNiElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  const desc = normaliseText(item.description).toLowerCase();

  return (
    code === "ER_NI" ||
    code === "NIC_ER" ||
    code === "NI_ER" ||
    code === "EMPLOYER_NI" ||
    name.includes("employer ni") ||
    name.includes("employer national insurance") ||
    desc.includes("employer ni")
  );
}

function isEmployerPensionElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  const desc = normaliseText(item.description).toLowerCase();

  return (
    code.includes("EMPLOYER") ||
    code.includes("PENSION_ER") ||
    code === "ER_PEN" ||
    name.includes("employer pension") ||
    desc.includes("employer pension")
  );
}

function isEmployerInfoElement(item: NormalisedPayElement): boolean {
  return isEmployerNiElement(item) || isEmployerPensionElement(item);
}

function isSalarySacrificePensionElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  const desc = normaliseText(item.description).toLowerCase();

  return (
    code === "EE_PEN_SAL_SAC" ||
    Boolean(item.isSalarySacrificeType) ||
    name.includes("salary sacrifice") ||
    desc.includes("salary sacrifice")
  );
}

function isSspElement(item: NormalisedPayElement): boolean {
  return upperTrim(item.code) === "SSP" || normaliseText(item.name).toLowerCase().includes("statutory sick pay");
}

function isSicknessReductionElement(item: NormalisedPayElement): boolean {
  const code = upperTrim(item.code);
  const name = normaliseText(item.name).toLowerCase();
  const desc = normaliseText(item.description).toLowerCase();

  return (
    code === "SICK_BASIC_REDUCTION" ||
    name.includes("sickness absence adjustment") ||
    desc.includes("sickness absence adjustment")
  );
}

function elementTitle(item: NormalisedPayElement): string {
  const code = upperTrim(item.code);

  if (code === "SICK_BASIC_REDUCTION") return "Sickness absence adjustment";
  if (code === "EE_PEN_SAL_SAC" || isSalarySacrificePensionElement(item)) return "Salary sacrifice pension";
  if (code === "EE_NI") return "National Insurance (employee)";
  if (code === "ER_NI") return "Employer NI";
  if (code === "PAYE") return "PAYE income tax";

  return normaliseText(item.name) || normaliseText(item.code) || "Payroll item";
}

function elementMeta(item: NormalisedPayElement): string {
  if (
    isTaxElement(item) ||
    isEmployeeNiElement(item) ||
    isEmployerNiElement(item) ||
    isEmployerPensionElement(item) ||
    isSalarySacrificePensionElement(item)
  ) {
    return "";
  }

  const desc = cleanPayslipMetaText(item.description);
  const title = elementTitle(item);
  if (!desc) return "";
  if (desc.toLowerCase() === title.toLowerCase()) return "";
  return desc;
}

function nonZeroElements(items: NormalisedPayElement[] | null | undefined): NormalisedPayElement[] {
  return Array.isArray(items) ? items.filter((item) => Math.abs(toNumberSafe(item?.amount)) > 0.004) : [];
}

function earningSortWeight(item: NormalisedPayElement): number {
  const code = upperTrim(item.code);

  if (code === "BASIC") return 10;
  if (code === "SICK_BASIC_REDUCTION") return 20;
  if (code === "SSP") return 30;
  if (code === "EE_PEN_SAL_SAC" || isSalarySacrificePensionElement(item)) return 40;
  if (code === "OSP") return 50;

  return 100;
}

function toBreakdownLine(item: NormalisedPayElement, prefix: string): BreakdownLine {
  return {
    key: `${prefix}-${item.id || item.code}-${Math.abs(toNumberSafe(item.amount))}`,
    title: elementTitle(item),
    amount: round2(toNumberSafe(item.amount)),
    meta: elementMeta(item) || undefined,
  };
}

function amountStyle(amount: number): CSSProperties {
  return amount < 0 ? { fontWeight: 900, color: "#991b1b" } : { fontWeight: 900 };
}

function formatContractStatus(value: string | null): string | null {
  const raw = normaliseText(value).toLowerCase();
  if (!raw) return null;
  if (raw === "active") return "Active";
  if (raw === "ended") return "Ended";
  if (raw === "terminated") return "Terminated";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normaliseCompareText(value: unknown): string {
  return normaliseText(value).toLowerCase();
}

function uniqueNonEmptyStrings(values: Array<unknown>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normaliseCompareText(value))
        .filter((value) => value.length >= 3)
    )
  );
}

function buildContractMatchTokens(row: CorrectedPayrollRow, fallbackTitle: string): string[] {
  return uniqueNonEmptyStrings([
    row?.contractNumber,
    row?.contractId,
    row?.payrollRunEmployeeId,
    row?.contractJobTitle,
    row?.contractStatus,
    fallbackTitle,
  ]);
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
  const combinedPayrollRowCount = Math.max(1, Number(payslip?.combinedPayrollRowCount ?? 1));

  const rawDeductions = useMemo(() => nonZeroElements(payslip?.payElements?.deductions), [payslip]);

  const rawSalarySacrificeFromDeductions = useMemo(() => {
    return rawDeductions.filter((item) => isSalarySacrificePensionElement(item));
  }, [rawDeductions]);

  const correctedRows = useMemo(() => {
    return Array.isArray(payslip?.correctedPayrollRows) ? payslip.correctedPayrollRows : [];
  }, [payslip]);

  const contractCards = useMemo<ContractCard[]>(() => {
    const rows = correctedRows;
    const salarySacrificeItems = rawSalarySacrificeFromDeductions.map((item, index) => ({
      item,
      index,
      amount: Math.abs(round2(toNumberSafe(item.amount))),
      haystack: [item.code, item.name, item.description].map((value) => normaliseCompareText(value)).join(" "),
    }));

    const salarySacrificeByRow = rows.map(() => ({
      amount: 0,
      meta: null as string | null,
    }));

    const unassignedItemIndices = new Set<number>(salarySacrificeItems.map((entry) => entry.index));

    salarySacrificeItems.forEach((entry) => {
      const matchingRowIndices = rows
        .map((row, rowIndex) => {
          const contractNumber = normaliseText(row?.contractNumber);
          const title = contractNumber || `Contract ${String(rowIndex + 1).padStart(2, "0")}`;
          const tokens = buildContractMatchTokens(row, title);
          const matched = tokens.some((token) => entry.haystack.includes(token));
          return matched ? rowIndex : -1;
        })
        .filter((rowIndex) => rowIndex >= 0);

      if (matchingRowIndices.length === 1) {
        const rowIndex = matchingRowIndices[0];
        salarySacrificeByRow[rowIndex].amount = round2(salarySacrificeByRow[rowIndex].amount + entry.amount);
        salarySacrificeByRow[rowIndex].meta = "Matched to this contract from returned contract metadata in the payslip payload.";
        unassignedItemIndices.delete(entry.index);
      }
    });

    const remainingItemIndices = Array.from(unassignedItemIndices).sort((a, b) => a - b);

    if (rows.length === 1) {
      remainingItemIndices.forEach((itemIndex) => {
        const entry = salarySacrificeItems[itemIndex];
        salarySacrificeByRow[0].amount = round2(salarySacrificeByRow[0].amount + entry.amount);
        salarySacrificeByRow[0].meta = "Only one contract row was present, so the returned salary sacrifice line was applied to that contract.";
      });
    } else if (rows.length > 1) {
      remainingItemIndices.forEach((itemIndex, fallbackPosition) => {
        const targetRowIndex = Math.min(fallbackPosition, rows.length - 1);
        const entry = salarySacrificeItems[itemIndex];
        salarySacrificeByRow[targetRowIndex].amount = round2(salarySacrificeByRow[targetRowIndex].amount + entry.amount);
        if (!salarySacrificeByRow[targetRowIndex].meta) {
          salarySacrificeByRow[targetRowIndex].meta =
            "Matched to this contract by returned row order because the payslip API did not tag the salary sacrifice line with contract-level metadata.";
        }
      });
    }

    return rows.map((row, index) => {
      const contractNumber = normaliseText(row?.contractNumber);
      const jobTitle = normaliseText(row?.contractJobTitle) || null;
      const status = formatContractStatus(normaliseText(row?.contractStatus) || null);
      const startDate = normaliseText(row?.contractStartDate) || null;
      const leaveDate = normaliseText(row?.contractLeaveDate) || null;
      const title = contractNumber || `Contract ${String(index + 1).padStart(2, "0")}`;
      const grossAfterSalarySacrifice = round2(toNumberSafe(row?.gross));
      const salarySacrifice = round2(salarySacrificeByRow[index]?.amount ?? 0);

      return {
        key: normaliseText(row?.payrollRunEmployeeId) || `contract-${index + 1}`,
        title,
        jobTitle,
        status,
        startDate,
        leaveDate,
        payAfterLeaving: Boolean(row?.contractPayAfterLeaving),
        gross: grossAfterSalarySacrifice,
        grossBeforeSalarySacrifice: round2(grossAfterSalarySacrifice + salarySacrifice),
        salarySacrifice,
        salarySacrificeMeta: salarySacrificeByRow[index]?.meta ?? null,
        tax: round2(toNumberSafe(row?.tax)),
        employeeNi: round2(toNumberSafe(row?.employeeNi)),
        employerNi: round2(toNumberSafe(row?.employerNi)),
        net: round2(toNumberSafe(row?.net)),
      };
    });
  }, [correctedRows, rawSalarySacrificeFromDeductions]);

  const rawEarnings = useMemo(() => {
    const directEarnings = nonZeroElements(payslip?.payElements?.earnings);
    const directSalarySacrificeKeys = new Set(
      directEarnings
        .filter((item) => isSalarySacrificePensionElement(item))
        .map((item) => `${upperTrim(item.code)}|${Math.abs(round2(toNumberSafe(item.amount)))}`)
    );

    const syntheticSalarySacrificeEarnings = rawSalarySacrificeFromDeductions
      .filter((item) => {
        const key = `${upperTrim(item.code)}|${Math.abs(round2(toNumberSafe(item.amount)))}`;
        return !directSalarySacrificeKeys.has(key);
      })
      .map((item) => ({
        ...item,
        side: "earning" as const,
        amount: -Math.abs(round2(toNumberSafe(item.amount))),
        name: "Salary sacrifice pension",
        description:
          normaliseText(item.description) || "Salary sacrifice pension adjustment shown before deductions.",
      }));

    return [...directEarnings, ...syntheticSalarySacrificeEarnings].sort((a, b) => {
      const weightDiff = earningSortWeight(a) - earningSortWeight(b);
      if (weightDiff !== 0) return weightDiff;
      return upperTrim(a.code).localeCompare(upperTrim(b.code));
    });
  }, [payslip, rawSalarySacrificeFromDeductions]);

  const displayedEarnings = useMemo<BreakdownLine[]>(() => {
    const lines = rawEarnings.map((item) => toBreakdownLine(item, "earn"));
    const explicitTotal = amountsTotal(lines);
    const grossDiff = round2(gross - explicitTotal);

    if (Math.abs(grossDiff) > 0.01) {
      const hasSsp = rawEarnings.some((item) => isSspElement(item)) || Boolean(meta?.ssp);
      const isLikelySicknessReduction = hasSsp && grossDiff < 0 && !rawEarnings.some((item) => isSicknessReductionElement(item));

      lines.push({
        key: isLikelySicknessReduction ? "earn-synth-sick-reduction" : "earn-synth-adjustment",
        title: isLikelySicknessReduction ? "Sickness absence adjustment" : "Other earnings adjustment",
        amount: grossDiff,
        meta: isLikelySicknessReduction
          ? "Derived from Gross pay because the API earnings payload did not include the matching negative sickness reduction line."
          : "Derived from Gross pay because the earnings lines returned by the API did not fully reconcile to the displayed total.",
      });
    }

    return lines;
  }, [gross, meta, rawEarnings]);

  const taxElements = useMemo(() => rawDeductions.filter((item) => isTaxElement(item)), [rawDeductions]);
  const employeeNiElements = useMemo(() => rawDeductions.filter((item) => isEmployeeNiElement(item)), [rawDeductions]);
  const employerInfoElements = useMemo(() => rawDeductions.filter((item) => isEmployerInfoElement(item)), [rawDeductions]);

  const employeeDeductionElements = useMemo(() => {
    return rawDeductions.filter(
      (item) =>
        !isTaxElement(item) &&
        !isEmployeeNiElement(item) &&
        !isEmployerInfoElement(item) &&
        !isSalarySacrificePensionElement(item)
    );
  }, [rawDeductions]);

  const displayedTaxLines = useMemo<BreakdownLine[]>(() => {
    if (taxElements.length > 0) return taxElements.map((item) => toBreakdownLine(item, "tax"));
    if (Math.abs(tax) > 0.01) {
      return [{ key: "tax-fallback", title: "PAYE income tax", amount: round2(tax) }];
    }
    return [];
  }, [tax, taxElements]);

  const displayedEmployeeNiLines = useMemo<BreakdownLine[]>(() => {
    if (employeeNiElements.length > 0) return employeeNiElements.map((item) => toBreakdownLine(item, "eni"));
    if (Math.abs(ni) > 0.01) {
      return [{ key: "ni-fallback", title: "National Insurance (employee)", amount: round2(ni) }];
    }
    return [];
  }, [employeeNiElements, ni]);

  const displayedEmployeeDeductionLines = useMemo<BreakdownLine[]>(() => {
    const lines: BreakdownLine[] = [
      ...displayedTaxLines,
      ...displayedEmployeeNiLines,
      ...employeeDeductionElements.map((item) => toBreakdownLine(item, "ded")),
    ];

    const explicitTotal = amountsTotal(lines);
    const diff = round2(totalDeductions - explicitTotal);

    if (Math.abs(diff) > 0.01) {
      lines.push({
        key: "ded-synth-adjustment",
        title: "Other deductions adjustment",
        amount: diff,
        meta: "Derived from Total deductions because the deduction lines returned by the API did not fully reconcile to the displayed total.",
      });
    }

    return lines;
  }, [displayedTaxLines, displayedEmployeeNiLines, employeeDeductionElements, totalDeductions]);

  const displayedEmployerInfoLines = useMemo<BreakdownLine[]>(() => {
    return employerInfoElements.map((item) => toBreakdownLine(item, "emp-info"));
  }, [employerInfoElements]);

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
        title="Combined payslip"
        subtitle="Combined employee payslip for this run. Use the Print button to save as PDF."
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

      {combinedPayrollRowCount > 1 ? (
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
          This payslip combines {combinedPayrollRowCount} contract rows for this employee in the selected run.
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
            Combined payslip
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

        {contractCards.length > 0 ? (
          <>
            <div style={S.sectionTitle}>Contract sections</div>
            <div style={S.contractGrid}>
              {contractCards.map((card, index) => (
                <div key={card.key} style={S.contractCard}>
                  <div style={S.contractHeaderTitle}>{card.title || `Contract ${String(index + 1).padStart(2, "0")}`}</div>

                  <div style={S.chipRow}>
                    {card.jobTitle ? <span style={S.chip}>{card.jobTitle}</span> : null}
                    {card.status ? <span style={S.chip}>{card.status}</span> : null}
                    {card.startDate ? <span style={S.chip}>Start {formatUkDate(card.startDate)}</span> : null}
                    {card.leaveDate ? <span style={S.chip}>Leave {formatUkDate(card.leaveDate)}</span> : null}
                    {card.payAfterLeaving ? <span style={S.chipWarn}>Pay after leaving</span> : null}
                  </div>

                  <div style={S.subSectionTitle}>Earnings</div>
                  {Math.abs(card.salarySacrifice) > 0.004 ? (
                    <>
                      <div style={S.breakdownRow}>
                        <div style={S.breakdownLabelWrap}>
                          <div>Gross pay before salary sacrifice</div>
                          <div style={S.breakdownMeta}>
                            Derived from the corrected contract gross plus the matched salary sacrifice pension amount for this contract.
                          </div>
                        </div>
                        <div className="wf-num" style={{ fontWeight: 900 }}>
                          {gbp(card.grossBeforeSalarySacrifice)}
                        </div>
                      </div>

                      <div style={S.breakdownRow}>
                        <div style={S.breakdownLabelWrap}>
                          <div>Sal Sac Pen</div>
                          <div style={S.breakdownMeta}>
                            {card.salarySacrificeMeta || "Shown as a gross deduction before PAYE and employee NI."}
                          </div>
                        </div>
                        <div className="wf-num" style={amountStyle(-card.salarySacrifice)}>
                          {gbp(-card.salarySacrifice)}
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div style={S.breakdownRow}>
                    <div style={S.breakdownLabelWrap}>
                      <div>Gross pay for this contract</div>
                      <div style={S.breakdownMeta}>
                        Gross after any salary sacrifice pension reduction and before payroll deductions for this contract row.
                      </div>
                    </div>
                    <div className="wf-num" style={{ fontWeight: 900 }}>
                      {gbp(card.gross)}
                    </div>
                  </div>

                  <div style={S.subSectionTitle}>Deductions</div>
                  {Math.abs(card.tax) > 0.004 ? (
                    <div style={S.breakdownRow}>
                      <div>PAYE income tax</div>
                      <div className="wf-num" style={{ fontWeight: 900 }}>
                        {gbp(card.tax)}
                      </div>
                    </div>
                  ) : null}
                  {Math.abs(card.employeeNi) > 0.004 ? (
                    <div style={S.breakdownRow}>
                      <div>National Insurance (employee)</div>
                      <div className="wf-num" style={{ fontWeight: 900 }}>
                        {gbp(card.employeeNi)}
                      </div>
                    </div>
                  ) : null}
                  {Math.abs(card.tax) <= 0.004 && Math.abs(card.employeeNi) <= 0.004 ? (
                    <div style={S.breakdownRow}>
                      <div>No employee deductions recorded for this contract row</div>
                      <div className="wf-num" style={{ fontWeight: 900 }}>
                        {gbp(0)}
                      </div>
                    </div>
                  ) : null}

                  {Math.abs(card.employerNi) > 0.004 ? (
                    <>
                      <div style={S.subSectionTitle}>Employer-paid item</div>
                      <div style={S.breakdownRow}>
                        <div style={S.breakdownLabelWrap}>
                          <div>Employer NI</div>
                          <div style={S.breakdownMeta}>Shown for transparency only. Not deducted from employee net pay.</div>
                        </div>
                        <div className="wf-num" style={{ fontWeight: 900 }}>
                          {gbp(card.employerNi)}
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div style={S.breakdownRow}>
                    <div style={{ fontWeight: 900 }}>Contract subtotal net pay</div>
                    <div className="wf-num" style={{ fontWeight: 900 }}>
                      {gbp(card.net)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={S.hint}>
              Contract sections above use corrected contract-row totals from the payroll run detail loader. Salary sacrifice pension is shown inside the relevant contract earnings section when it can be matched from the returned combined pay elements. Other detailed lines such as Basic pay, SSP, or sickness reduction are still returned at combined employee level by the payslip API, so those lines stay in the combined breakdown below rather than being guessed into a contract section.
            </div>
          </>
        ) : null}

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

        <div style={S.sectionTitle}>Combined employee breakdown</div>

        <div style={S.twoCol}>
          <div style={S.block}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Combined detailed lines</div>

            <div style={S.subSectionTitle}>Earnings</div>

            {displayedEarnings.map((item) => (
              <div key={item.key} style={S.breakdownRow}>
                <div style={S.breakdownLabelWrap}>
                  <div>{item.title}</div>
                  {item.meta ? <div style={S.breakdownMeta}>{item.meta}</div> : null}
                </div>
                <div className="wf-num" style={amountStyle(item.amount)}>
                  {gbp(item.amount)}
                </div>
              </div>
            ))}

            <div style={S.breakdownRow}>
              <div style={{ fontWeight: 900 }}>Gross pay</div>
              <div className="wf-num" style={{ fontWeight: 900 }}>
                {gbp(gross)}
              </div>
            </div>

            <div style={S.subSectionTitle}>Deductions</div>

            {displayedEmployeeDeductionLines.map((item) => (
              <div key={item.key} style={S.breakdownRow}>
                <div style={S.breakdownLabelWrap}>
                  <div>{item.title}</div>
                  {item.meta ? <div style={S.breakdownMeta}>{item.meta}</div> : null}
                </div>
                <div className="wf-num" style={{ fontWeight: 900 }}>
                  {gbp(item.amount)}
                </div>
              </div>
            ))}

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

            {displayedEmployerInfoLines.length > 0 ? (
              <>
                <div style={S.subSectionTitle}>Employer-paid items shown for transparency</div>
                {displayedEmployerInfoLines.map((item) => (
                  <div key={item.key} style={S.breakdownRow}>
                    <div style={S.breakdownLabelWrap}>
                      <div>{item.title}</div>
                      {item.meta ? <div style={S.breakdownMeta}>{item.meta}</div> : null}
                    </div>
                    <div className="wf-num" style={{ fontWeight: 900 }}>
                      {gbp(item.amount)}
                    </div>
                  </div>
                ))}
              </>
            ) : null}
          </div>

          <div style={S.block}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>What these items mean</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: "rgba(0,0,0,0.78)" }}>
              <div style={{ marginBottom: 10 }}>
                1. Combined payslip. This payslip combines all contract rows for this employee in the selected payroll run.
              </div>
              <div style={{ marginBottom: 10 }}>
                2. Contract sections. Each contract card above shows trusted contract-row totals and labels from the API. No raw UUIDs should appear unless the API itself has no contract metadata.
              </div>
              <div style={{ marginBottom: 10 }}>
                3. Combined detailed lines. Basic pay, SSP, sickness reduction, and other returned pay elements are shown in the combined employee section because the current payslip API returns them as employee-level lines rather than contract-tagged lines.
              </div>
              <div style={{ marginBottom: 10 }}>
                4. PAYE income tax. Income Tax withheld under Pay As You Earn. The amount depends on your tax code, taxable pay, and whether HMRC applies cumulative rules or Week 1 / Month 1 rules.
              </div>
              <div style={{ marginBottom: 10 }}>
                5. National Insurance. Employee NI is deducted from pay. Employer NI is a separate employer cost and is not taken from employee net pay.
              </div>
              <div style={{ marginBottom: 10 }}>
                6. Sickness adjustments. Where sickness affects normal pay, WageFlow should show the reduction separately from SSP so the visible earnings lines reconcile to Gross pay.
              </div>
              <div style={{ marginBottom: 10 }}>
                7. Salary sacrifice pension. Where pension is handled by salary sacrifice, the reduction should be shown in the earnings section before deductions, because it reduces pay before PAYE and employee NI are applied.
              </div>
              <div>
                8. Net pay. Gross pay minus total deductions should equal the final net pay shown on the payslip.
              </div>
            </div>

            <div style={S.sectionTitle}>Tax code example</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: "rgba(0,0,0,0.78)" }}>{taxCodeExampleText}</div>

            <div style={S.sectionTitle}>Tax basis</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: "rgba(0,0,0,0.78)" }}>{taxBasisExplanationText}</div>

            <div style={S.hint}>
              This explanation is a plain-English guide. It is not tax advice. HMRC rules, thresholds, and your personal circumstances decide the actual calculation.
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}