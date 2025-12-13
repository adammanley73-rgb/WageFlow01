/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\lib\services\absenceService.ts

import { getAdmin } from "@lib/admin";
import { getSspDailyRate } from "@/lib/statutory/sspRates";

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
  qualifyingDays: string[]; // ISO date strings (Mon–Fri within run & spell)
  payableDays: string[]; // after first 3 qualifying days in the linked chain
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
};

/**
 * Fetch sickness absences for a company that may affect a payroll run.
 *
 * Previous behaviour only fetched absences overlapping the run itself.
 * That broke SSP linking rules because earlier spells inside the 8-week
 * window were invisible.
 *
 * New behaviour:
 * - Fetch all sickness absences that end within a 12-month look-back window
 *   before the run start and start on or before the run end.
 * - GetSspPlansForRun will then apply the 8-week linking rules.
 */
export async function fetchSicknessAbsencesForRun(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<SicknessAbsenceRow[]> {
  const admin = await getAdmin();
  if (!admin) {
    throw new Error("Admin client not available");
  }
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
 * Helper: is this date a qualifying day (Mon–Fri) under the current simplification?
 */
function isWeekday(date: Date): boolean {
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  return day >= 1 && day <= 5;
}

/**
 * Legacy helper: compute SSP day plan for a single sickness absence within a given payroll run.
 *
 * This keeps the old behaviour for any callers that still use it directly.
 * It applies waiting days within the spell only and ignores linked prior history.
 *
 * The main engine now uses getSspPlansForRun, which applies the 8-week
 * linking rules across multiple absences.
 */
export function computeSspDayPlanForAbsence(
  absence: SicknessAbsenceRow,
  runStart: string,
  runEnd: string
): SspDayPlanForAbsence {
  // Convert input strings to Date objects
  const runStartDate = new Date(runStart);
  const runEndDate = new Date(runEnd);

  const sicknessStart = new Date(absence.first_day);
  const sicknessEnd = new Date(
    absence.last_day_actual || absence.last_day_expected
  );

  // Effective overlap of sickness with this run
  const effectiveStart = maxDate(runStartDate, sicknessStart);
  const effectiveEnd = minDate(runEndDate, sicknessEnd);

  const qualifyingDays: string[] = [];

  // If there is no overlap, return empty sets
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

  // Walk day by day through the overlapping period
  for (
    let d = new Date(effectiveStart.getTime());
    d <= effectiveEnd;
    d = addDays(d, 1)
  ) {
    if (isWeekday(d)) {
      qualifyingDays.push(toIsoDate(d));
    }
  }

  // First 3 qualifying days are waiting days; the rest are payable
  const payableDays =
    qualifyingDays.length > 3 ? qualifyingDays.slice(3) : [];

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

/**
 * Internal: compute SSP plan for an employee across all relevant absences,
 * applying the 8-week linking rules and only returning days that fall
 * inside the given payroll run.
 *
 * Rules:
 * - Qualifying days are Monday–Friday.
 * - Absence spells are sorted by start date.
 * - If the gap between the end of one spell and the start of the next is
 *   more than 56 days, a new PIW chain starts and waiting days reset.
 * - Across a linked chain, the first 3 qualifying days are waiting days
 *   (unpaid). Further qualifying days in the chain are payable until the
 *   SSP limit is hit.
 * - For the run, we include only qualifying/payable days that fall inside
 *   [runStart, runEnd], but earlier qualifying days still consume waiting.
 */
function computeSspPlanForEmployeeWithHistory(
  employeeId: string,
  absences: SicknessAbsenceRow[],
  runStart: string,
  runEnd: string
): SspPlanByEmployee {
  const runStartDate = new Date(runStart);
  const runEndDate = new Date(runEnd);

  const sorted = [...absences].sort((a, b) => {
    const aStart = new Date(a.first_day).getTime();
    const bStart = new Date(b.first_day).getTime();
    if (aStart === bStart) {
      const aEnd = new Date(
        a.last_day_actual || a.last_day_expected
      ).getTime();
      const bEnd = new Date(
        b.last_day_actual || b.last_day_expected
      ).getTime();
      return aEnd - bEnd;
    }
    return aStart - bStart;
  });

  const plansForRun: SspDayPlanForAbsence[] = [];
  let totalQualifyingDays = 0;
  let totalPayableDays = 0;

  let chainEndDate: Date | null = null;
  let waitingDaysUsedInChain = 0;

  for (const absence of sorted) {
    const sicknessStartDate = new Date(absence.first_day);
    const sicknessEndDate = new Date(
      absence.last_day_actual || absence.last_day_expected
    );

    // Decide if this absence links to the previous PIW chain
    if (chainEndDate) {
      const gapDays = diffInDays(chainEndDate, sicknessStartDate);
      if (gapDays > 56) {
        // New chain: reset waiting days
        waitingDaysUsedInChain = 0;
      }
    }

    const qualifyingInRun: string[] = [];
    const payableInRun: string[] = [];

    // Walk every day of this absence, because earlier days may consume waiting
    for (
      let d = new Date(sicknessStartDate.getTime());
      d <= sicknessEndDate;
      d = addDays(d, 1)
    ) {
      if (!isWeekday(d)) {
        continue;
      }

      const isWithinRun = d >= runStartDate && d <= runEndDate;

      let isPayable = false;
      if (waitingDaysUsedInChain >= 3) {
        isPayable = true;
      } else {
        waitingDaysUsedInChain += 1;
      }

      if (isWithinRun) {
        const iso = toIsoDate(d);
        qualifyingInRun.push(iso);
        if (isPayable) {
          payableInRun.push(iso);
        }
      }
    }

    if (qualifyingInRun.length > 0) {
      const plan: SspDayPlanForAbsence = {
        absenceId: absence.id,
        employeeId: absence.employee_id,
        runStart,
        runEnd,
        sicknessStart: absence.first_day,
        sicknessEnd: absence.last_day_actual || absence.last_day_expected,
        qualifyingDays: qualifyingInRun,
        payableDays: payableInRun,
      };

      plansForRun.push(plan);
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
 *
 * New behaviour:
 * - Uses a wider absence fetch window.
 * - Groups by employee.
 * - For each employee, applies 8-week linking rules and 3 shared waiting
 *   days per linked chain, not per run.
 */
export async function getSspPlansForRun(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<SspPlanByEmployee[]> {
  const absences = await fetchSicknessAbsencesForRun(
    companyId,
    startDate,
    endDate
  );

  if (!absences || absences.length === 0) {
    return [];
  }

  const byEmployee: Record<string, SicknessAbsenceRow[]> = {};

  for (const absence of absences) {
    const empId = absence.employee_id;
    if (!byEmployee[empId]) {
      byEmployee[empId] = [];
    }
    byEmployee[empId].push(absence);
  }

  const plans: SspPlanByEmployee[] = [];

  for (const [employeeId, empAbsences] of Object.entries(byEmployee)) {
    const plan = computeSspPlanForEmployeeWithHistory(
      employeeId,
      empAbsences,
      startDate,
      endDate
    );
    if (plan.totalQualifyingDays > 0) {
      plans.push(plan);
    }
  }

  return plans;
}

/**
 * Compute SSP amounts per employee for a run.
 *
 * - Uses getSspPlansForRun to get totalPayableDays per employee.
 * - Multiplies payable days by a daily rate.
 * - If dailyRateOverride is provided, it is used (for tests),
 *   otherwise we fall back to getSspDailyRate().
 */
export async function getSspAmountsForRun(
  companyId: string,
  startDate: string,
  endDate: string,
  dailyRateOverride?: number
): Promise<SspAmountForEmployee[]> {
  const plans = await getSspPlansForRun(companyId, startDate, endDate);
  const dailyRate =
    typeof dailyRateOverride === "number" && dailyRateOverride > 0
      ? dailyRateOverride
      : getSspDailyRate();

  return plans.map((plan) => {
    const sspAmount = plan.totalPayableDays * dailyRate;

    return {
      employeeId: plan.employeeId,
      totalQualifyingDays: plan.totalQualifyingDays,
      totalPayableDays: plan.totalPayableDays,
      dailyRate,
      sspAmount,
      absences: plan.absences,
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
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Utility: format a Date as YYYY-MM-DD (UTC-ish, good enough for our use).
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
