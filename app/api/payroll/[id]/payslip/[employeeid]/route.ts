// C:\Projects\wageflow01\app\api\payroll\[id]\payslip\[employeeId]\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSspAmountsForRun } from "@/lib/services/absenceService";
import { calculatePay } from "@/lib/payroll/calculatePay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ParamsShape = {
  id?: string;
  runId?: string;
  employeeId?: string;
  employeeid?: string;
};

type RouteContext = {
  params: Promise<ParamsShape>;
};

type DbRow = Record<string, unknown>;

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

type PayrollRunPayElementRow = {
  id: string;
  payroll_run_employee_id: string;
  pay_element_type_id: string | null;
  amount: number | null;
  description_override: string | null;
  taxable_for_paye_override: boolean | null;
  nic_earnings_override: boolean | null;
  pensionable_override: boolean | null;
  ae_qualifying_override: boolean | null;
};

type PayElementTypeRow = {
  id: string;
  code: string | null;
  name: string | null;
  side: string | null;
  taxable_for_paye: boolean | null;
  nic_earnings: boolean | null;
  pensionable_default: boolean | null;
  ae_qualifying_default: boolean | null;
  is_salary_sacrifice_type: boolean | null;
};

function isUuid(v: unknown): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(v ?? "").trim()
  );
}

function normaliseSide(value: unknown): "earning" | "deduction" {
  const s = typeof value === "string" ? value.toLowerCase().trim() : "";
  return s === "deduction" ? "deduction" : "earning";
}

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function isIsoDate(s: unknown): boolean {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function safeNumber(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function isSspLike(e: { code?: unknown; name?: unknown; description?: unknown }) {
  const code = String(e?.code || "").toUpperCase();
  const name = String(e?.name || "").toLowerCase();
  const desc = String(e?.description || "").toLowerCase();
  return code === "SSP" || code === "SSP1" || name.includes("statutory sick") || desc.includes("statutory sick");
}

function pickEarliestSicknessStart(sspForEmployee: unknown): string | null {
  const anySsp = sspForEmployee as { absences?: unknown } | null;
  const abs = Array.isArray(anySsp?.absences) ? (anySsp?.absences as unknown[]) : [];
  const starts = abs
    .map((a) => String((a as any)?.sicknessStart || ""))
    .filter((s) => isIsoDate(s))
    .sort((a, b) => a.localeCompare(b));
  return starts.length ? starts[0] : null;
}

async function computeAweWeeklyForSspCap(
  supabase: any,
  companyId: string,
  employeeId: string,
  referenceEndIso: string
): Promise<{
  aweWeekly: number;
  totalGrossInWindow: number;
  runCount: number;
  windowStart: string;
  windowEnd: string;
}> {
  if (!isIsoDate(referenceEndIso)) {
    throw new Error("AWE referenceEndIso must be YYYY-MM-DD");
  }

  const windowEnd = referenceEndIso;
  const windowStart = addDaysIso(windowEnd, -55);

  const { data: runs, error: runsErr } = await supabase
    .from("payroll_runs")
    .select("id, period_end")
    .eq("company_id", companyId)
    .gte("period_end", windowStart)
    .lte("period_end", windowEnd)
    .order("period_end", { ascending: false })
    .limit(24);

  if (runsErr) {
    throw new Error(`AWE: error loading payroll_runs: ${runsErr.message}`);
  }

  const runIds = (Array.isArray(runs) ? runs : [])
    .map((r: any) => r?.id)
    .filter((id: any) => typeof id === "string" && id.length > 0);

  if (!runIds.length) {
    return { aweWeekly: 0, totalGrossInWindow: 0, runCount: 0, windowStart, windowEnd };
  }

  const { data: pres, error: presErr } = await supabase
    .from("payroll_run_employees")
    .select("run_id, gross_pay")
    .eq("employee_id", employeeId)
    .in("run_id", runIds);

  if (presErr) {
    throw new Error(`AWE: error loading payroll_run_employees: ${presErr.message}`);
  }

  const rows = Array.isArray(pres) ? pres : [];
  const totalGross = rows.reduce((sum: number, r: any) => sum + (Number(r?.gross_pay) || 0), 0);
  const aweWeekly = totalGross > 0 ? totalGross / 8 : 0;

  return {
    aweWeekly: round2(aweWeekly),
    totalGrossInWindow: round2(totalGross),
    runCount: runIds.length,
    windowStart,
    windowEnd,
  };
}

function pickFirst(...values: unknown[]): string | null {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    return s;
  }
  return null;
}

async function loadPayslipPayload(supabase: any, runId: string, employeeId: string) {
  const { data: runRowRaw, error: runError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (runError || !runRowRaw) {
    return {
      ok: false,
      status: 404,
      body: {
        ok: false,
        error: "RUN_NOT_FOUND",
        message: "Payroll run not found for payslip.",
        details: runError?.message ?? null,
      },
    } as const;
  }

  const runRow = runRowRaw as DbRow;

  const companyId = String(runRow["company_id"] ?? "").trim();
  const frequency = (runRow["frequency"] ?? null) as unknown;

  const periodStart = (runRow["period_start"] ?? runRow["pay_period_start"] ?? null) as unknown;
  const periodEnd = (runRow["period_end"] ?? runRow["pay_period_end"] ?? null) as unknown;

  if (!companyId || !isUuid(companyId)) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "RUN_MISSING_COMPANY",
        message: "Payroll run is missing a valid company_id for payslip.",
        details: null,
      },
    } as const;
  }

  const { data: preRowRaw, error: preError } = await supabase
    .from("payroll_run_employees")
    .select("id, run_id, employee_id, gross_pay, net_pay, tax, ni_employee, ni_employer, pay_after_leaving")
    .eq("run_id", runId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (preError || !preRowRaw) {
    return {
      ok: false,
      status: 404,
      body: {
        ok: false,
        error: "PAYROLL_RUN_EMPLOYEE_NOT_FOUND",
        message: "No payroll record found for this employee in the selected run.",
        details: preError?.message ?? null,
      },
    } as const;
  }

  const preRow = preRowRaw as DbRow;
  const preId = String(preRow["id"] ?? "").trim();
  if (!preId) {
    return {
      ok: false,
      status: 500,
      body: { ok: false, error: "BAD_PAYROLL_RUN_EMPLOYEE", message: "Payroll row is missing an id.", details: null },
    } as const;
  }

  let preIds: string[] = [preId];

  const { data: allPreRows, error: allPreError } = await supabase
    .from("payroll_run_employees")
    .select("id")
    .eq("run_id", runId)
    .eq("employee_id", employeeId);

  if (!allPreError && Array.isArray(allPreRows) && allPreRows.length > 0) {
    const ids = allPreRows.map((r: any) => r?.id).filter((v: any) => typeof v === "string" && v.length > 0);
    if (ids.length > 0) preIds = ids;
  }

  const { data: companyRowRaw, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !companyRowRaw) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "COMPANY_NOT_FOUND",
        message: "Company details could not be loaded for this payslip.",
        details: companyError?.message ?? null,
      },
    } as const;
  }

  const companyRow = companyRowRaw as DbRow;

  const { data: employeeRowRaw, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError || !employeeRowRaw) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "EMPLOYEE_NOT_FOUND",
        message: "Employee details could not be loaded for this payslip.",
        details: employeeError?.message ?? null,
      },
    } as const;
  }

  const employeeRow = employeeRowRaw as DbRow;

  let starterTaxCode: string | null = null;
  try {
    const { data: starterRowRaw, error: starterError } = await supabase
      .from("employee_starters")
      .select("p45_provided, p45_present, starter_declaration, p45_tax_code")
      .eq("employee_id", employeeId)
      .maybeSingle();

    let row = starterRowRaw as any;

    if (!row && !starterError) {
      const { data: legacyRowRaw, error: legacyError } = await supabase
        .from("employee_starter_details")
        .select("p45_provided, p45_present, starter_declaration, p45_tax_code")
        .eq("employee_id", employeeId)
        .maybeSingle();
      if (legacyRowRaw && !legacyError) row = legacyRowRaw as any;
    }

    if (row) {
      const p45Provided = row.p45_provided ?? row.p45_present ?? false;
      if (p45Provided) {
        const code = String(row.p45_tax_code || "").trim();
        if (code) starterTaxCode = code;
      } else {
        const decl = String(row.starter_declaration || "").toUpperCase();
        if (decl === "A") starterTaxCode = "1257L Cumulative";
        else if (decl === "B") starterTaxCode = "1257L wk1/mth1";
        else if (decl === "C") starterTaxCode = "BR wk1/mth1";
      }
    }
  } catch (err) {
    console.error("payslip route: error reading starter details", err);
  }

  const elements: NormalisedPayElement[] = [];

  const { data: rawElementRows, error: elementsError } = await supabase
    .from("payroll_run_pay_elements")
    .select(
      "id, payroll_run_employee_id, pay_element_type_id, amount, description_override, taxable_for_paye_override, nic_earnings_override, pensionable_override, ae_qualifying_override"
    )
    .in("payroll_run_employee_id", preIds);

  if (elementsError) {
    console.error("payslip route: pay elements error", elementsError);
  }

  const elementRows = (Array.isArray(rawElementRows) ? rawElementRows : []) as unknown as PayrollRunPayElementRow[];

  const typeById: Record<string, PayElementTypeRow> = {};

  if (elementRows.length > 0) {
    const typeIds = Array.from(
      new Set(
        elementRows
          .map((r) => r.pay_element_type_id)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
      )
    );

    if (typeIds.length > 0) {
      const { data: typeRowsRaw, error: typeError } = await supabase
        .from("pay_element_types")
        .select(
          "id, code, name, side, taxable_for_paye, nic_earnings, pensionable_default, ae_qualifying_default, is_salary_sacrifice_type"
        )
        .in("id", typeIds);

      if (typeError) {
        console.error("payslip route: pay element types error", typeError);
      }

      const typeRows = (Array.isArray(typeRowsRaw) ? typeRowsRaw : []) as unknown as PayElementTypeRow[];
      for (const t of typeRows) {
        if (t?.id) typeById[String(t.id)] = t;
      }
    }
  }

  for (const row of elementRows) {
    const master = row.pay_element_type_id ? typeById[String(row.pay_element_type_id)] : undefined;

    const baseTaxable = typeof master?.taxable_for_paye === "boolean" ? master.taxable_for_paye : true;
    const baseNi = typeof master?.nic_earnings === "boolean" ? master.nic_earnings : true;
    const basePensionable = typeof master?.pensionable_default === "boolean" ? master.pensionable_default : true;
    const baseAe = typeof master?.ae_qualifying_default === "boolean" ? master.ae_qualifying_default : true;

    const taxableForPaye =
      typeof row.taxable_for_paye_override === "boolean" ? row.taxable_for_paye_override : baseTaxable;
    const nicEarnings = typeof row.nic_earnings_override === "boolean" ? row.nic_earnings_override : baseNi;
    const pensionable = typeof row.pensionable_override === "boolean" ? row.pensionable_override : basePensionable;
    const aeQualifying = typeof row.ae_qualifying_override === "boolean" ? row.ae_qualifying_override : baseAe;

    elements.push({
      id: String(row.id),
      typeId: String(master?.id ?? ""),
      code: String(master?.code ?? ""),
      name: String(master?.name ?? ""),
      side: normaliseSide(master?.side),
      amount: Number(row.amount ?? 0),
      taxableForPaye,
      nicEarnings,
      pensionable,
      aeQualifying,
      isSalarySacrificeType: Boolean(master?.is_salary_sacrifice_type ?? false),
      description: (row.description_override ?? master?.name ?? null) as string | null,
    });
  }

  let sspForEmployee: any = null;
  let sspEngineRan = false;

  const periodStartIso = String(periodStart ?? "").trim();
  const periodEndIso = String(periodEnd ?? "").trim();

  if (companyId && periodStartIso && periodEndIso) {
    try {
      let hasSickness = false;

      const { data: spAny, error: spErr } = await supabase
        .from("sickness_periods")
        .select("id")
        .eq("company_id", companyId)
        .lte("start_date", periodEndIso)
        .gte("end_date", periodStartIso)
        .limit(1);

      if (!spErr && Array.isArray(spAny) && spAny.length > 0) hasSickness = true;

      if (!hasSickness) {
        const { data: apsAny, error: apsErr } = await supabase
          .from("absence_pay_schedules")
          .select("id, element_code")
          .eq("company_id", companyId)
          .lte("pay_period_start", periodEndIso)
          .gte("pay_period_end", periodStartIso)
          .limit(1);

        if (!apsErr && Array.isArray(apsAny) && apsAny.length > 0) hasSickness = true;
      }

      if (hasSickness) {
        const sspEmployeesRaw = await getSspAmountsForRun(companyId, periodStartIso, periodEndIso);
        const sspEmployees = Array.isArray(sspEmployeesRaw) ? sspEmployeesRaw : [];
        sspEngineRan = true;

        const matchKeys = new Set(
          [String(employeeId), String(employeeRow?.["employee_id"] || ""), String(employeeRow?.["id"] || "")]
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        );

        sspForEmployee = sspEmployees.find((e: any) => matchKeys.has(String(e?.employeeId).trim())) ?? null;
      }
    } catch (err) {
      console.error("payslip route: error computing SSP amounts", err);
    }
  }

  let sspAdjusted = false;
  let sspDetails: any = null;

  if (sspForEmployee && Number(sspForEmployee.totalPayableDays || 0) > 0) {
    const packMeta = sspForEmployee.packMeta ?? null;

    const payable = Number(sspForEmployee.totalPayableDays || 0);
    const qualifying = Number(sspForEmployee.totalQualifyingDays || 0);

    let effectiveDailyRate = safeNumber(sspForEmployee.dailyRate) ?? 0;
    let effectiveAmount = safeNumber(sspForEmployee.sspAmount) ?? 0;

    const warnings: string[] = Array.isArray(sspForEmployee.warnings) ? [...sspForEmployee.warnings] : [];

    const lowCapEnabled = Boolean(packMeta?.lowEarnerPercentCapEnabled);
    const lowPct = safeNumber(packMeta?.lowEarnerPercent);
    const weeklyFlat = safeNumber(packMeta?.weeklyFlat);
    const qdpw = safeNumber(packMeta?.qualifyingDaysPerWeek) ?? 5;

    let capApplied = false;
    let aweInfo: any = null;

    if (lowCapEnabled && lowPct !== null && weeklyFlat !== null && lowPct > 0 && lowPct < 1) {
      const firstSick = pickEarliestSicknessStart(sspForEmployee);
      const referenceEnd = firstSick ? addDaysIso(firstSick, -1) : isIsoDate(periodEndIso) ? periodEndIso : null;

      if (referenceEnd && companyId) {
        try {
          const awe = await computeAweWeeklyForSspCap(supabase, companyId, employeeId, referenceEnd);
          aweInfo = awe;

          if (awe.aweWeekly > 0) {
            const weeklyCap = round2(awe.aweWeekly * lowPct);
            const weeklyRateUsed = Math.min(weeklyFlat, weeklyCap);
            capApplied = weeklyRateUsed < weeklyFlat - 0.004;

            effectiveDailyRate = round2(weeklyRateUsed / qdpw);
            effectiveAmount = round2(payable * effectiveDailyRate);
          } else {
            warnings.push(
              "SSP low-earner cap is enabled in the compliance pack, but AWE could not be derived from pay history in the 8-week window. Flat rate SSP used."
            );
          }
        } catch (err) {
          const msg = err && typeof err === "object" && "message" in err ? (err as any).message : err;
          warnings.push(
            `SSP low-earner cap is enabled but AWE calculation failed. Flat rate SSP used. (${String(msg)})`
          );
        }
      } else {
        warnings.push("SSP low-earner cap is enabled but reference date could not be determined. Flat rate SSP used.");
      }
    }

    const sspElem = elements.find((e) => isSspLike(e));

    const descBase = `Statutory Sick Pay for ${payable} day${payable === 1 ? "" : "s"} sickness (${qualifying} qualifying day${qualifying === 1 ? "" : "s"} in this period)`;
    const descCap = lowCapEnabled ? (capApplied ? `, low-earner cap applied` : `, low-earner cap checked`) : "";
    const descRate =
      Number.isFinite(effectiveDailyRate) && effectiveDailyRate > 0 ? `, daily rate £${effectiveDailyRate.toFixed(2)}` : "";

    if (sspElem) {
      sspElem.amount = effectiveAmount;
      sspElem.name = "Statutory Sick Pay";
      sspElem.description = `${descBase}${descCap}${descRate}`;
      sspAdjusted = true;
    } else {
      elements.push({
        id: `ssp:${runId}:${employeeId}`,
        typeId: "",
        code: "SSP",
        name: "Statutory Sick Pay",
        side: "earning",
        amount: effectiveAmount,
        taxableForPaye: true,
        nicEarnings: true,
        pensionable: false,
        aeQualifying: false,
        isSalarySacrificeType: false,
        description: `${descBase}${descCap}${descRate}`,
      });
      sspAdjusted = true;
    }

    sspDetails = {
      totalQualifyingDays: qualifying,
      totalPayableDays: payable,
      dailyRateUsed: effectiveDailyRate,
      amount: effectiveAmount,
      capEnabled: lowCapEnabled,
      capApplied,
      awe: aweInfo,
      packMeta: packMeta ? { ...packMeta } : null,
      warnings,
      source: "ssp_engine",
    };
  }

  const sspElemStored = elements.find((e) => isSspLike(e));
  if (!sspDetails && sspElemStored) {
    const amt = round2(Number(sspElemStored.amount ?? 0));
    const existingDesc = String(sspElemStored.description || "");
    if (!existingDesc.includes("£")) {
      const suffix = `amount £${amt.toFixed(2)}`;
      sspElemStored.description = existingDesc ? `${existingDesc}, ${suffix}` : suffix;
    }

    sspDetails = {
      totalQualifyingDays: null,
      totalPayableDays: null,
      dailyRateUsed: null,
      amount: amt,
      capEnabled: null,
      capApplied: null,
      awe: null,
      packMeta: null,
      warnings: [
        "SSP pay element exists in payroll_run_pay_elements but no sickness record was found for this run period, so SSP engine details could not be derived.",
      ],
      source: "stored_pay_element",
      engineRan: sspEngineRan,
    };
  }

  const rawTaxCode = String(employeeRow["tax_code"] ?? "").trim();
  const finalTaxCode = rawTaxCode || starterTaxCode || "1257L wk1/mth1";

  const grossStored = Number(preRow["gross_pay"] ?? 0);
  const netStored = Number(preRow["net_pay"] ?? 0);

  let tax = Number(preRow["tax"] ?? 0);
  const ni = Number(preRow["ni_employee"] ?? 0);

  const earnings = elements.filter((e) => e.side === "earning");
  const deductionsElements = elements.filter((e) => e.side === "deduction");

  const earningsTotal = earnings.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const deductionElementsTotal = deductionsElements.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  let gross = grossStored;
  let net = netStored;
  let deductions = grossStored - netStored;

  const useElementTotals = (grossStored === 0 && earnings.length > 0) || sspAdjusted;

  if (useElementTotals) {
    gross = earningsTotal;
    deductions = deductionElementsTotal;
    net = gross - deductions;
  } else {
    const canAutoCalc =
      tax === 0 && Number.isFinite(grossStored) && grossStored > 0 && String(frequency ?? "") === "monthly" && !!finalTaxCode;

    if (canAutoCalc) {
      try {
        const ytdTaxableBefore = Number(employeeRow["ytd_gross"] ?? 0);
        const ytdTaxPaidBefore = Number(employeeRow["ytd_tax"] ?? 0);

        const taxYear = (() => {
          const src = String(periodStart ?? "");
          const yr = parseInt(src.slice(0, 4), 10);
          return Number.isFinite(yr) ? yr : undefined;
        })();

        const payResult = calculatePay({
          grossForPeriod: grossStored,
          taxCode: finalTaxCode,
          period: 1,
          ytdTaxableBeforeThisPeriod: ytdTaxableBefore,
          ytdTaxPaidBeforeThisPeriod: ytdTaxPaidBefore,
          taxYear,
        });

        const taxThisPeriod = Number((payResult as any)?.tax ?? 0);

        if (Number.isFinite(taxThisPeriod)) {
          tax = taxThisPeriod;
          deductions = tax + deductionElementsTotal;
          net = grossStored - deductions;
        }
      } catch (err) {
        const msg = err && typeof err === "object" && "message" in err ? (err as any).message : err;
        console.error("payslip route: PAYE auto calc failed", { runId, employeeId, error: String(msg) });

        gross = grossStored;
        net = netStored;
        deductions = grossStored - netStored;
      }
    }
  }

  const payAfterLeaving = typeof preRow["pay_after_leaving"] === "boolean" ? (preRow["pay_after_leaving"] as boolean) : false;

  const firstName = String(employeeRow["first_name"] ?? "");
  const lastName = String(employeeRow["last_name"] ?? "");
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Unnamed employee";

  const niNumber = (employeeRow["ni_number"] ?? employeeRow["national_insurance_number"] ?? null) as unknown;

  const companyPayload = {
    id: companyRow["id"],
    name: companyRow["name"] ?? null,
    tradingName: companyRow["trading_name"] ?? null,
    hmrcPayeReference: companyRow["hmrc_paye_reference"] ?? null,
    raw: companyRow,
  };

  const initialTaxCode = rawTaxCode || null;

  const employeePayload = {
    id: employeeRow["id"],
    firstName,
    lastName,
    fullName,
    employeeNumber: employeeRow["employee_number"] ?? null,
    email: employeeRow["email"] ?? null,
    niNumber,
    taxCode: finalTaxCode,
    raw: employeeRow,
  };

  const runPayload = {
    id: runRow["id"],
    runNumber: runRow["run_number"] ?? runRow["run_name"] ?? null,
    runName: runRow["run_name"] ?? null,
    frequency: frequency ?? null,
    periodStart: periodStart ?? null,
    periodEnd: periodEnd ?? null,
    payDate: runRow["pay_date"] ?? null,
    status: runRow["status"] ?? runRow["workflow_status"] ?? null,
    raw: runRow,
  };

  const totalsPayload = {
    gross: round2(gross),
    deductions: round2(deductions),
    net: round2(net),
    tax: round2(tax),
    ni: round2(ni),
  };

  const flagsPayload = {
    payAfterLeaving,
    isLeaver:
      typeof employeeRow["status"] === "string" ? String(employeeRow["status"]).toLowerCase() === "leaver" : false,
  };

  const payElementsPayload = {
    earnings,
    deductions: deductionsElements,
  };

  const metaPayload = {
    generatedAt: new Date().toISOString(),
    ssp: sspDetails,
    initialTaxCode,
    starterTaxCode,
    finalTaxCode,
  };

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      payslip: {
        runId,
        employeeId,
        payrollRunEmployeeId: preRow["id"],
        company: companyPayload,
        employee: employeePayload,
        run: runPayload,
        totals: totalsPayload,
        flags: flagsPayload,
        payElements: payElementsPayload,
        meta: metaPayload,
        taxCode: finalTaxCode,
      },
    },
  } as const;
}

export async function GET(_req: Request, context: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const params = await context.params;

  const runId = params.id ?? params.runId ?? null;
  const employeeId = params.employeeId ?? params.employeeid ?? null;

  if (!runId || !employeeId) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Run id and employee id are required in the route." },
      { status: 400 }
    );
  }

  const result = await loadPayslipPayload(supabase, String(runId), String(employeeId));
  return NextResponse.json(result.body, { status: result.status });
}