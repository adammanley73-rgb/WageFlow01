// C:\Users\adamm\Projects\wageflow01\app\api\payroll\[id]\payslip\[employeeId]\route.ts
/* @ts-nocheck */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSspAmountsForRun } from "@/lib/services/absenceService";
import { calculatePay } from "@/lib/payroll/calculatePay";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("payslip route: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

type RouteParams = {
  params: {
    id?: string;
    runId?: string;
    employeeId?: string;
    employeeid?: string;
  };
};

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

function normaliseSide(value: any): "earning" | "deduction" {
  const s = typeof value === "string" ? value.toLowerCase().trim() : "";
  return s === "deduction" ? "deduction" : "earning";
}

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function isIsoDate(s: any): boolean {
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

function safeNumber(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function pickEarliestSicknessStart(sspForEmployee: any): string | null {
  const abs = Array.isArray(sspForEmployee?.absences) ? sspForEmployee.absences : [];
  const starts = abs
    .map((a: any) => String(a?.sicknessStart || ""))
    .filter((s: string) => isIsoDate(s))
    .sort((a: string, b: string) => a.localeCompare(b));
  return starts.length ? starts[0] : null;
}

/**
 * Approx AWE for SSP cap:
 * - Uses payroll_runs.period_end as the "pay date proxy" for history.
 * - Looks back 8 weeks (56 days) ending the day before first sickness.
 * - AWE = total gross from matching runs / 8.
 *
 * This is good enough for the reform cap behaviour wiring.
 * If you later store explicit pay_date per run and/or need exact relevant period rules,
 * we can tighten it further.
 */
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
  const windowStart = addDaysIso(windowEnd, -55); // inclusive 56-day window

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
    return {
      aweWeekly: 0,
      totalGrossInWindow: 0,
      runCount: 0,
      windowStart,
      windowEnd,
    };
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

async function loadPayslipPayload(runId: string, employeeId: string) {
  const supabase = createAdminClient();

  // 1) Load the run row
  const { data: runRow, error: runError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError || !runRow) {
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

  const companyId = runRow["company_id"];
  const frequency = runRow["frequency"] ?? null;
  const periodStart = runRow["period_start"] ?? runRow["pay_period_start"] ?? null;
  const periodEnd = runRow["period_end"] ?? runRow["pay_period_end"] ?? null;

  // 1b) Compute SSP amounts for this run + employee using the absence SSP engine
  let sspForEmployee: any = null;

  if (companyId && periodStart && periodEnd) {
    try {
      const sspEmployeesRaw = await getSspAmountsForRun(companyId, periodStart, periodEnd);
      const sspEmployees = Array.isArray(sspEmployeesRaw) ? sspEmployeesRaw : [];
      sspForEmployee =
        sspEmployees.find((e: any) => String(e.employeeId) === String(employeeId)) ?? null;

      if (sspForEmployee) {
        console.log("payslip route: SSP engine result", {
          runId,
          employeeId,
          totalQualifyingDays: sspForEmployee.totalQualifyingDays,
          totalPayableDays: sspForEmployee.totalPayableDays,
          dailyRate: sspForEmployee.dailyRate,
          sspAmount: sspForEmployee.sspAmount,
          packMeta: sspForEmployee.packMeta ? { taxYear: sspForEmployee.packMeta.taxYear } : null,
        });
      }
    } catch (err) {
      console.error("payslip route: error computing SSP amounts", err);
    }
  }

  // 2) Load the payroll_run_employees row for this run + employee
  const { data: preRow, error: preError } = await supabase
    .from("payroll_run_employees")
    .select(
      "id, run_id, employee_id, gross_pay, net_pay, tax, ni_employee, ni_employer, pay_after_leaving"
    )
    .eq("run_id", runId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (preError || !preRow) {
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

  const preId = preRow["id"] as string;

  // 2b) Collect ALL payroll_run_employee ids for this run + employee
  let preIds: string[] = [preId];

  const { data: allPreRows, error: allPreError } = await supabase
    .from("payroll_run_employees")
    .select("id")
    .eq("run_id", runId)
    .eq("employee_id", employeeId);

  if (!allPreError && Array.isArray(allPreRows) && allPreRows.length > 0) {
    const ids = allPreRows
      .map((r: any) => r.id)
      .filter((v: any) => typeof v === "string");
    if (ids.length > 0) {
      preIds = ids;
    }
  }

  // 3) Load the company
  const { data: companyRow, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !companyRow) {
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

  // 4) Load the employee
  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError || !employeeRow) {
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

  // 4b) Determine tax code from new starter or P45 data
  let starterTaxCode: string | null = null;
  try {
    const { data: starterRow, error: starterError } = await supabase
      .from("employee_starters")
      .select("p45_provided, p45_present, starter_declaration, p45_tax_code")
      .eq("employee_id", employeeId)
      .maybeSingle();

    let row = starterRow;
    if (!row && !starterError) {
      const { data: legacyRow, error: legacyError } = await supabase
        .from("employee_starter_details")
        .select("p45_provided, p45_present, starter_declaration, p45_tax_code")
        .eq("employee_id", employeeId)
        .maybeSingle();
      if (legacyRow && !legacyError) {
        row = legacyRow;
      }
    }

    if (row) {
      const p45Provided = row.p45_provided ?? row.p45_present ?? false;
      if (p45Provided) {
        const code = (row.p45_tax_code || "").trim();
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

  // 5) Load pay elements from payroll_run_pay_elements (source of truth)
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

  const elementRows: any[] = Array.isArray(rawElementRows) ? rawElementRows : [];

  // Lookup pay_element_types by id
  const typeById: Record<string, any> = {};

  if (elementRows.length > 0) {
    const typeIds = Array.from(
      new Set(
        elementRows
          .map((r: any) => r["pay_element_type_id"])
          .filter((v: any) => typeof v === "string" && v.length > 0)
      )
    );

    if (typeIds.length > 0) {
      const { data: typeRows, error: typeError } = await supabase
        .from("pay_element_types")
        .select(
          "id, code, name, side, taxable_for_paye, nic_earnings, pensionable_default, ae_qualifying_default, is_salary_sacrifice_type"
        )
        .in("id", typeIds);

      if (typeError) {
        console.error("payslip route: pay element types error", typeError);
      }

      if (typeRows) {
        for (const t of typeRows as any[]) {
          if (t.id) typeById[String(t.id)] = t;
        }
      }
    }
  }

  for (const row of elementRows) {
    const master = typeById[String(row["pay_element_type_id"])] ?? null;

    const baseTaxable =
      typeof master?.["taxable_for_paye"] === "boolean" ? master["taxable_for_paye"] : true;
    const baseNi =
      typeof master?.["nic_earnings"] === "boolean" ? master["nic_earnings"] : true;
    const basePensionable =
      typeof master?.["pensionable_default"] === "boolean" ? master["pensionable_default"] : true;
    const baseAe =
      typeof master?.["ae_qualifying_default"] === "boolean" ? master["ae_qualifying_default"] : true;

    const taxableForPaye =
      typeof row["taxable_for_paye_override"] === "boolean" ? row["taxable_for_paye_override"] : baseTaxable;
    const nicEarnings =
      typeof row["nic_earnings_override"] === "boolean" ? row["nic_earnings_override"] : baseNi;
    const pensionable =
      typeof row["pensionable_override"] === "boolean" ? row["pensionable_override"] : basePensionable;
    const aeQualifying =
      typeof row["ae_qualifying_override"] === "boolean" ? row["ae_qualifying_override"] : baseAe;

    const normalised: NormalisedPayElement = {
      id: row["id"],
      typeId: master?.["id"] ?? "",
      code: master?.["code"] ?? "",
      name: master?.["name"] ?? "",
      side: normaliseSide(master?.["side"]),
      amount: Number(row["amount"] ?? 0),
      taxableForPaye,
      nicEarnings,
      pensionable,
      aeQualifying,
      isSalarySacrificeType: Boolean(master?.["is_salary_sacrifice_type"] ?? false),
      description: row["description_override"] ?? master?.["name"] ?? null,
    };

    elements.push(normalised);
  }

  // 6) SSP injection and April 2026 reform cap (if enabled in Compliance Pack)
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
      const referenceEnd = firstSick ? addDaysIso(firstSick, -1) : (isIsoDate(periodEnd) ? periodEnd : null);

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
          warnings.push(`SSP low-earner cap is enabled but AWE calculation failed. Flat rate SSP used. (${String(msg)})`);
        }
      } else {
        warnings.push(
          "SSP low-earner cap is enabled but reference date could not be determined. Flat rate SSP used."
        );
      }
    }

    const sspElem = elements.find((e) => {
      const code = (e.code || "").toUpperCase();
      const name = (e.name || "").toLowerCase();
      const desc = (e.description || "").toLowerCase();
      return (
        code === "SSP" ||
        code === "SSP1" ||
        name.includes("statutory sick") ||
        desc.includes("statutory sick")
      );
    });

    const descBase = `Statutory Sick Pay for ${payable} day${payable === 1 ? "" : "s"} sickness (${qualifying} qualifying day${qualifying === 1 ? "" : "s"} in this period)`;

    const descCap = lowCapEnabled
      ? capApplied
        ? `, low-earner cap applied`
        : `, low-earner cap checked`
      : "";

    const descRate = Number.isFinite(effectiveDailyRate) && effectiveDailyRate > 0 ? `, daily rate £${effectiveDailyRate.toFixed(2)}` : "";

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
    };

    console.log("payslip route: SSP element adjusted", {
      runId,
      employeeId,
      payable,
      dailyRateUsed: effectiveDailyRate,
      amount: effectiveAmount,
      capEnabled: lowCapEnabled,
      capApplied,
    });
  }

  // 7) Totals and flags, including final tax code resolution
  const rawTaxCode = (employeeRow["tax_code"] || "").trim();
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
      tax === 0 &&
      Number.isFinite(grossStored) &&
      grossStored > 0 &&
      frequency === "monthly" &&
      !!finalTaxCode;

    if (canAutoCalc) {
      try {
        const ytdTaxableBefore = Number(employeeRow["ytd_gross"] ?? 0);
        const ytdTaxPaidBefore = Number(employeeRow["ytd_tax"] ?? 0);

        const taxYear = (() => {
          const src = periodStart ?? `${new Date().getFullYear()}-04-06`;
          const yr = parseInt(String(src).slice(0, 4), 10);
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

        const taxThisPeriod = Number(payResult.tax ?? 0);

        if (Number.isFinite(taxThisPeriod)) {
          tax = taxThisPeriod;
          deductions = tax + deductionElementsTotal;
          net = grossStored - deductions;
        }
      } catch (err) {
        const msg = err && typeof err === "object" && "message" in err ? (err as any).message : err;
        console.error("payslip route: PAYE auto calc failed", {
          runId,
          employeeId,
          error: String(msg),
        });

        gross = grossStored;
        net = netStored;
        deductions = grossStored - netStored;
      }
    } else {
      // fallback: use stored totals
    }
  }

  const payAfterLeaving =
    typeof preRow["pay_after_leaving"] === "boolean" ? preRow["pay_after_leaving"] : false;

  const firstName = employeeRow["first_name"] ?? "";
  const lastName = employeeRow["last_name"] ?? "";
  const fullName =
    firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Unnamed employee";

  const niNumber =
    employeeRow["ni_number"] ?? employeeRow["national_insurance_number"] ?? null;

  const companyPayload = {
    id: companyRow["id"],
    name: companyRow["name"] ?? null,
    tradingName: companyRow["trading_name"] ?? null,
    hmrcPayeReference: companyRow["hmrc_paye_reference"] ?? null,
    raw: companyRow,
  };

  const initialTaxCode = rawTaxCode || null;
  const computedTaxCode = finalTaxCode;

  const employeePayload = {
    id: employeeRow["id"],
    firstName,
    lastName,
    fullName,
    employeeNumber: employeeRow["employee_number"] ?? null,
    email: employeeRow["email"] ?? null,
    niNumber,
    taxCode: computedTaxCode,
    raw: employeeRow,
  };

  const runPayload = {
    id: runRow["id"],
    runNumber: runRow["run_number"] ?? runRow["run_name"] ?? null,
    runName: runRow["run_name"] ?? null,
    frequency,
    periodStart,
    periodEnd,
    payDate: runRow["pay_date"] ?? null,
    status: runRow["status"] ?? runRow["workflow_status"] ?? null,
    raw: runRow,
  };

  const totalsPayload = {
    gross,
    deductions,
    net,
    tax,
    ni,
  };

  const flagsPayload = {
    payAfterLeaving,
    isLeaver:
      typeof employeeRow["status"] === "string"
        ? String(employeeRow["status"]).toLowerCase() === "leaver"
        : false,
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
    finalTaxCode: computedTaxCode,
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
        taxCode: computedTaxCode,
      },
    },
  } as const;
}

export async function GET(_req: Request, context: RouteParams) {
  const { params } = context;

  const runId = params.id ?? params.runId ?? null;
  const employeeId = params.employeeId ?? params.employeeid ?? null;

  if (!runId || !employeeId) {
    return NextResponse.json(
      {
        ok: false,
        error: "BAD_REQUEST",
        message: "Run id and employee id are required in the route.",
      },
      { status: 400 }
    );
  }

  const result = await loadPayslipPayload(runId, employeeId);
  return NextResponse.json(result.body, { status: result.status });
}
