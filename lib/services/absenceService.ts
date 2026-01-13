/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\lib\services\absenceService.ts

import { getAdmin } from "@lib/admin";

// Shape of a row from the absences table that we care about
export type SicknessAbsenceRow = {
  id: string;
  company_id: string;
  employee_id: string;
  type: string;
  first_day: string; // ISO date
  last_day_expected: string; // ISO date
  last_day_actual: string | null; // ISO date or null
  reference_notes?: string | null;
  created_at?: string | null;
};

// Result of working out qualifying vs payable SSP days
export type SspDayPlanForAbsence = {
  absenceId: string;
  employeeId: string;
  runStart: string;
  runEnd: string;
  sicknessStart: string;
  sicknessEnd: string;
  qualifyingDays: string[]; // ISO date strings (Mon-Fri within run & spell)
  payableDays: string[]; // after waiting days in the linked chain
};

// Grouped SSP view per employee for a run
export type SspPlanByEmployee = {
  employeeId: string;
  absences: SspDayPlanForAbsence[];
  totalQualifyingDays: number;
  totalPayableDays: number;
};

// Final SSP amount per employee for a run
export type SspAmountForEmployee = {
  employeeId: string;
  totalQualifyingDays: number;
  totalPayableDays: number;
  dailyRate: number;
  sspAmount: number;
  absences: SspDayPlanForAbsence[];

  dailyRateSource: "override" | "compliance_pack";
  packMeta?: {
    packDateUsed: string;
    taxYear: string;
    label: string;
    packId: string;
    weeklyFlat: number;
    qualifyingDaysPerWeek: number;
    waitingDays: number;
    requiresLel: boolean;
    lowEarnerPercentCapEnabled: boolean;
    lowEarnerPercent: number | null;
  };

  warnings?: string[];
};

type CompliancePack = {
  id: string;
  label: string;
  tax_year: string;
  effective_from: string;
  effective_to: string;
  status: string;
  config: any;
};

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Fetch sickness absences for a company that may affect a payroll run.
 *
 * New behaviour:
 * - Fetch all sickness absences that end within a 12-month look-back window
 *   before the run start and start on or before the run end.
 * - getSspPlansForRun will then apply the 8-week linking rules.
 */
export async function fetchSicknessAbsencesForRun(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<SicknessAbsenceRow[]> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Admin client not available");
  const { client } = admin;

  const runStartDate = new Date(startDate);
  const lookbackStartDate = addDays(runStartDate, -365); // 1 year look-back
  const lookbackStart = toIsoDate(lookbackStartDate);

  const { data, error } = await client
    .from("absences")
    .select(
      `
      id,
      company_id,
      employee_id,
      type,
      first_day,
      last_day_expected,
      last_day_actual,
      reference_notes,
      created_at
    `
    )
    .eq("company_id", companyId)
    .eq("type", "sickness")
    .lte("first_day", endDate)
    .gte("last_day_expected", lookbackStart)
    .order("first_day", { ascending: true });

  if (error) {
    throw new Error(`Error fetching sickness absences: ${error.message}`);
  }

  return (data || []) as SicknessAbsenceRow[];
}

/**
 * Helper: is this date a qualifying day (Mon-Fri) under the current simplification?
 */
function isWeekday(date: Date): boolean {
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  return day >= 1 && day <= 5;
}

async function getCompliancePackForDate(packDate: string): Promise<CompliancePack> {
  if (!isIsoDate(packDate)) throw new Error("Invalid packDate. Expected YYYY-MM-DD.");

  const admin = await getAdmin();
  if (!admin) throw new Error("Admin client not available");
  const { client } = admin;

  const { data, error } = await client.rpc("get_compliance_pack_for_date", {
    p_pay_date: packDate,
  });

  if (error) throw new Error(`Compliance pack RPC failed: ${error.message}`);

  const pack = Array.isArray(data) ? data[0] : data;
  if (!pack?.id) throw new Error(`No compliance pack found for ${packDate}`);

  return pack as CompliancePack;
}

function extractSspSettingsFromPack(pack: CompliancePack) {
  const cfg = pack?.config ?? {};
  const ssp = cfg?.ssp ?? {};
  const rates = cfg?.rates ?? {};

  const weeklyFlat = Number(rates?.ssp_weekly_flat);
  if (!Number.isFinite(weeklyFlat) || weeklyFlat <= 0) {
    throw new Error(`Compliance pack ${pack.tax_year} missing/invalid rates.ssp_weekly_flat`);
  }

  const waitingDays = Number(ssp?.waiting_days);
  const requiresLel = Boolean(ssp?.requires_lel);
  const lowEarnerPercentCapEnabled = Boolean(ssp?.low_earner_percent_cap_enabled);

  const lowEarnerPercentRaw = ssp?.low_earner_percent;
  const lowEarnerPercent =
    lowEarnerPercentRaw === null || lowEarnerPercentRaw === undefined
      ? null
      : Number(lowEarnerPercentRaw);

  const waitingDaysSafe =
    Number.isFinite(waitingDays) && waitingDays >= 0 && waitingDays <= 7 ? waitingDays : 3;

  return {
    weeklyFlat,
    waitingDays: waitingDaysSafe,
    requiresLel,
    lowEarnerPercentCapEnabled,
    lowEarnerPercent,
  };
}

/**
 * Legacy helper: compute SSP day plan for a single sickness absence within a given payroll run.
 * Waiting days are configurable for pack-driven rules.
 */
export function computeSspDayPlanForAbsence(
  absence: SicknessAbsenceRow,
  runStart: string,
  runEnd: string,
  waitingDaysTarget: number = 3
): SspDayPlanForAbsence {
  const runStartDate = new Date(runStart);
  const runEndDate = new Date(runEnd);

  const sicknessStart = new Date(absence.first_day);
  const sicknessEnd = new Date(absence.last_day_actual || absence.last_day_expected);

  const effectiveStart = maxDate(runStartDate, sicknessStart);
  const effectiveEnd = minDate(runEndDate, sicknessEnd);

  const qualifyingDays: string[] = [];

  if (effectiveEnd < effectiveStart) {
    return {
      absenceId: absence.id,
      employeeId: absence.employee_id,
      runStart,
      runEnd,
      sicknessStart: absence.first_day,
      sicknessEnd: absence.last_day_actual || absence.last_day_expected,
      qualifyingDays: [],
      payableDays: [],
    };
  }

  for (let dd = new Date(effectiveStart.getTime()); dd <= effectiveEnd; dd = addDays(dd, 1)) {
    if (isWeekday(dd)) qualifyingDays.push(toIsoDate(dd));
  }

  const target = Math.max(0, Math.min(7, Number(waitingDaysTarget)));
  const payableDays = qualifyingDays.length > target ? qualifyingDays.slice(target) : [];

  return {
    absenceId: absence.id,
    employeeId: absence.employee_id,
    runStart,
    runEnd,
    sicknessStart: absence.first_day,
    sicknessEnd: absence.last_day_actual || absence.last_day_expected,
    qualifyingDays,
    payableDays,
  };
}

function computeSspPlanForEmployeeWithHistory(
  employeeId: string,
  absences: SicknessAbsenceRow[],
  runStart: string,
  runEnd: string,
  waitingDaysTarget: number
): SspPlanByEmployee {
  const runStartDate = new Date(runStart);
  const runEndDate = new Date(runEnd);

  const sorted = [...absences].sort((a, b) => {
    const aStart = new Date(a.first_day).getTime();
    const bStart = new Date(b.first_day).getTime();
    if (aStart === bStart) {
      const aEnd = new Date(a.last_day_actual || a.last_day_expected).getTime();
      const bEnd = new Date(b.last_day_actual || b.last_day_expected).getTime();
      return aEnd - bEnd;
    }
    return aStart - bStart;
  });

  const plansForRun: SspDayPlanForAbsence[] = [];
  let totalQualifyingDays = 0;
  let totalPayableDays = 0;

  let chainEndDate: Date | null = null;
  let waitingDaysUsedInChain = 0;

  const target = Math.max(0, Math.min(7, Number(waitingDaysTarget)));

  for (const absence of sorted) {
    const sicknessStartDate = new Date(absence.first_day);
    const sicknessEndDate = new Date(absence.last_day_actual || absence.last_day_expected);

    if (chainEndDate) {
      const gapDays = diffInDays(chainEndDate, sicknessStartDate);
      if (gapDays > 56) {
        waitingDaysUsedInChain = 0;
      }
    }

    const qualifyingInRun: string[] = [];
    const payableInRun: string[] = [];

    for (let dd = new Date(sicknessStartDate.getTime()); dd <= sicknessEndDate; dd = addDays(dd, 1)) {
      if (!isWeekday(dd)) continue;

      const isWithinRun = dd >= runStartDate && dd <= runEndDate;

      let isPayable = false;
      if (waitingDaysUsedInChain >= target) {
        isPayable = true;
      } else {
        waitingDaysUsedInChain += 1;
      }

      if (isWithinRun) {
        const iso = toIsoDate(dd);
        qualifyingInRun.push(iso);
        if (isPayable) payableInRun.push(iso);
      }
    }

    if (qualifyingInRun.length > 0) {
      plansForRun.push({
        absenceId: absence.id,
        employeeId: absence.employee_id,
        runStart,
        runEnd,
        sicknessStart: absence.first_day,
        sicknessEnd: absence.last_day_actual || absence.last_day_expected,
        qualifyingDays: qualifyingInRun,
        payableDays: payableInRun,
      });

      totalQualifyingDays += qualifyingInRun.length;
      totalPayableDays += payableInRun.length;
    }

    if (!chainEndDate || sicknessEndDate > chainEndDate) {
      chainEndDate = sicknessEndDate;
    }
  }

  return {
    employeeId,
    absences: plansForRun,
    totalQualifyingDays,
    totalPayableDays,
  };
}

/**
 * Compute SSP plans per employee for a run.
 * This is now pack-driven by endDate.
 */
export async function getSspPlansForRun(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<SspPlanByEmployee[]> {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw new Error("Invalid startDate/endDate. Expected YYYY-MM-DD.");
  }

  const absences = await fetchSicknessAbsencesForRun(companyId, startDate, endDate);
  if (!absences || absences.length === 0) return [];

  const pack = await getCompliancePackForDate(endDate);
  const sspCfg = extractSspSettingsFromPack(pack);

  const byEmployee: Record<string, SicknessAbsenceRow[]> = {};
  for (const absence of absences) {
    const empId = absence.employee_id;
    if (!byEmployee[empId]) byEmployee[empId] = [];
    byEmployee[empId].push(absence);
  }

  const plans: SspPlanByEmployee[] = [];

  for (const [empId, empAbsences] of Object.entries(byEmployee)) {
    const plan = computeSspPlanForEmployeeWithHistory(empId, empAbsences, startDate, endDate, sspCfg.waitingDays);
    if (plan.totalQualifyingDays > 0) plans.push(plan);
  }

  return plans;
}

/**
 * Compute SSP amounts per employee for a run.
 * This is now pack-driven by endDate.
 *
 * Notes.
 * - Qualifying days are Mon-Fri here, so qualifyingDaysPerWeek is fixed to 5.
 * - Low-earner 80% cap needs earnings data per employee. This service does not have it yet.
 *   We return a warning when the pack enables it, so you can finish the final wiring next.
 */
export async function getSspAmountsForRun(
  companyId: string,
  startDate: string,
  endDate: string,
  dailyRateOverride?: number
): Promise<SspAmountForEmployee[]> {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw new Error("Invalid startDate/endDate. Expected YYYY-MM-DD.");
  }

  const qualifyingDaysPerWeek = 5;

  const pack = await getCompliancePackForDate(endDate);
  const sspCfg = extractSspSettingsFromPack(pack);

  const plans = await getSspPlansForRun(companyId, startDate, endDate);

  let dailyRate: number;
  let dailyRateSource: "override" | "compliance_pack";
  let packMeta: any = null;

  if (typeof dailyRateOverride === "number" && dailyRateOverride > 0) {
    dailyRate = round2(dailyRateOverride);
    dailyRateSource = "override";
  } else {
    dailyRate = round2(sspCfg.weeklyFlat / qualifyingDaysPerWeek);
    dailyRateSource = "compliance_pack";
    packMeta = {
      packDateUsed: endDate,
      taxYear: pack.tax_year,
      label: pack.label,
      packId: pack.id,
      weeklyFlat: sspCfg.weeklyFlat,
      qualifyingDaysPerWeek,
      waitingDays: sspCfg.waitingDays,
      requiresLel: sspCfg.requiresLel,
      lowEarnerPercentCapEnabled: sspCfg.lowEarnerPercentCapEnabled,
      lowEarnerPercent: sspCfg.lowEarnerPercent,
    };
  }

  return plans.map((plan) => {
    const sspAmount = round2(plan.totalPayableDays * dailyRate);

    const warnings: string[] = [];
    if (packMeta?.lowEarnerPercentCapEnabled) {
      warnings.push(
        "Compliance pack enables low-earner SSP cap (e.g. 80% rule). This run-level preview uses flat-rate daily SSP only. Next step is to wire earnings-based cap into SSP amounts."
      );
    }

    return {
      employeeId: plan.employeeId,
      totalQualifyingDays: plan.totalQualifyingDays,
      totalPayableDays: plan.totalPayableDays,
      dailyRate,
      sspAmount,
      absences: plan.absences,
      dailyRateSource,
      ...(packMeta ? { packMeta } : {}),
      ...(warnings.length ? { warnings } : {}),
    };
  });
}

/**
 * Utility: return the later of two dates (by value).
 */
function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

/**
 * Utility: return the earlier of two dates (by value).
 */
function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

/**
 * Utility: add N days to a date, returning a new Date.
 */
function addDays(date: Date, days: number): Date {
  const dd = new Date(date.getTime());
  dd.setDate(dd.getDate() + days);
  return dd;
}

/**
 * Utility: format a Date as YYYY-MM-DD.
 */
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Utility: difference in whole days from a to b.
 */
function diffInDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}
