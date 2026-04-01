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

type SspPackMeta = {
  packDateUsed: string;
  taxYear: string;
  label: string;
  packId: string;
  weeklyFlat: number;
  qualifyingDaysPerWeek: number;
  waitingDays: number;
  payableFromDay: number;
  requiresLel: boolean;
  lowEarnerPercentCapEnabled: boolean;
  lowEarnerPercent: number | null;
};

type AweInfo = {
  aweWeekly: number;
  totalGrossInWindow: number;
  runCount: number;
  windowStart: string;
  windowEnd: string;
};

export type SspDayPlanForAbsence = {
  absenceId: string;
  employeeId: string;
  runStart: string;
  runEnd: string;
  sicknessStart: string;
  sicknessEnd: string;
  qualifyingDays: string[]; // ISO date strings (Mon-Fri within run & spell)
  payableDays: string[]; // transition-aware payable SSP days
  dailyRate: number | null;
  sspAmount: number;
  warnings?: string[];
};

export type SspPlanByEmployee = {
  employeeId: string;
  absences: SspDayPlanForAbsence[];
  totalQualifyingDays: number;
  totalPayableDays: number;
};

export type SspAmountForEmployee = {
  employeeId: string;
  totalQualifyingDays: number;
  totalPayableDays: number;
  dailyRate: number;
  sspAmount: number;
  absences: SspDayPlanForAbsence[];

  dailyRateSource: "override" | "compliance_pack";
  packMeta?: SspPackMeta;
  awe?: AweInfo | null;
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

type ExtractedSspSettings = {
  weeklyFlat: number;
  waitingDays: number;
  payableFromDay: number;
  requiresLel: boolean;
  lowEarnerPercentCapEnabled: boolean;
  lowEarnerPercent: number | null;
};

const SSP_REFORM_DATE = "2026-04-06";
const SSP_TRANSITION_PROTECTED_FLAT_MIN_AWE = 125.0;
const SSP_TRANSITION_PROTECTED_FLAT_MAX_AWE = 154.05;

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function parseIsoDateOnlyToUtc(iso: string): Date {
  const s = String(iso || "").trim();
  if (!isIsoDate(s)) throw new Error("Bad date: " + s);
  const [y, m, d] = s.split("-").map((p) => parseInt(p, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function toIsoDateOnlyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUtc(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function addDaysIso(iso: string, days: number): string {
  return toIsoDateOnlyUtc(addDaysUtc(parseIsoDateOnlyToUtc(iso), days));
}

function diffInDaysUtc(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function isWeekdayUtc(date: Date): boolean {
  const day = date.getUTCDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  return day >= 1 && day <= 5;
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

  const lookbackStart = addDaysIso(startDate, -365);

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

function extractSspSettingsFromPack(pack: CompliancePack): ExtractedSspSettings {
  const cfg = pack?.config ?? {};
  const ssp = cfg?.ssp ?? {};
  const rates = cfg?.rates ?? {};

  const weeklyFlat = Number(rates?.ssp_weekly_flat);
  if (!Number.isFinite(weeklyFlat) || weeklyFlat <= 0) {
    throw new Error(`Compliance pack ${pack.tax_year} missing/invalid rates.ssp_weekly_flat`);
  }

  const waitingDaysRaw = Number(ssp?.waiting_days);
  const waitingDays =
    Number.isFinite(waitingDaysRaw) && waitingDaysRaw >= 0 && waitingDaysRaw <= 7 ? waitingDaysRaw : 3;

  const payableFromDayRaw = Number(ssp?.payable_from_day);
  const payableFromDay =
    Number.isFinite(payableFromDayRaw) && payableFromDayRaw >= 1 && payableFromDayRaw <= 8
      ? payableFromDayRaw
      : waitingDays === 0
        ? 1
        : waitingDays + 1;

  const requiresLel = Boolean(ssp?.requires_lel);
  const lowEarnerPercentCapEnabled = Boolean(ssp?.low_earner_percent_cap_enabled);

  const lowEarnerPercentRaw = ssp?.low_earner_percent;
  const lowEarnerPercent =
    lowEarnerPercentRaw === null || lowEarnerPercentRaw === undefined
      ? null
      : Number(lowEarnerPercentRaw);

  return {
    weeklyFlat,
    waitingDays,
    payableFromDay,
    requiresLel,
    lowEarnerPercentCapEnabled,
    lowEarnerPercent,
  };
}

function buildPackMeta(packDateUsed: string, pack: CompliancePack, cfg: ExtractedSspSettings): SspPackMeta {
  return {
    packDateUsed,
    taxYear: pack.tax_year,
    label: pack.label,
    packId: pack.id,
    weeklyFlat: cfg.weeklyFlat,
    qualifyingDaysPerWeek: 5,
    waitingDays: cfg.waitingDays,
    payableFromDay: cfg.payableFromDay,
    requiresLel: cfg.requiresLel,
    lowEarnerPercentCapEnabled: cfg.lowEarnerPercentCapEnabled,
    lowEarnerPercent: cfg.lowEarnerPercent,
  };
}

async function computeAweWeeklyForSspCap(
  companyId: string,
  employeeId: string,
  referenceEndIso: string
): Promise<AweInfo> {
  if (!isIsoDate(referenceEndIso)) {
    throw new Error("AWE referenceEndIso must be YYYY-MM-DD");
  }

  const admin = await getAdmin();
  if (!admin) throw new Error("Admin client not available");
  const { client } = admin;

  const windowEnd = referenceEndIso;
  const windowStart = addDaysIso(windowEnd, -55);

  const { data: runs, error: runsErr } = await client
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

  const { data: pres, error: presErr } = await client
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

function hasPayablePreReform(plan: SspDayPlanForAbsence) {
  return plan.payableDays.some((day) => day < SSP_REFORM_DATE);
}

function buildSingleAbsencePlanWithTransition(
  absence: SicknessAbsenceRow,
  runStart: string,
  runEnd: string,
  waitingDaysUsedInChainBeforeAbsence: number,
  waitingDaysTarget: number
): {
  plan: SspDayPlanForAbsence;
  waitingDaysUsedInChainAfterAbsence: number;
} {
  const runStartDate = parseIsoDateOnlyToUtc(runStart);
  const runEndDate = parseIsoDateOnlyToUtc(runEnd);
  const sicknessStartDate = parseIsoDateOnlyToUtc(absence.first_day);
  const sicknessEndDate = parseIsoDateOnlyToUtc(absence.last_day_actual || absence.last_day_expected);

  const qualifyingAllDays: string[] = [];
  for (let dd = new Date(sicknessStartDate.getTime()); dd <= sicknessEndDate; dd = addDaysUtc(dd, 1)) {
    if (isWeekdayUtc(dd)) qualifyingAllDays.push(toIsoDateOnlyUtc(dd));
  }

  const qualifiesForRestartTransition =
    (absence.first_day === "2026-04-04" || absence.first_day === "2026-04-05") &&
    String(absence.last_day_actual || absence.last_day_expected) >= SSP_REFORM_DATE &&
    qualifyingAllDays.length >= 4;

  let waitingDaysUsed = waitingDaysUsedInChainBeforeAbsence;
  const qualifyingDaysInRun: string[] = [];
  const payableDaysInRun: string[] = [];

  for (const dayIso of qualifyingAllDays) {
    const day = parseIsoDateOnlyToUtc(dayIso);
    const isWithinRun = day >= runStartDate && day <= runEndDate;
    const isPreReform = dayIso < SSP_REFORM_DATE;

    let isPayable = false;

    if (qualifiesForRestartTransition) {
      isPayable = true;
    } else if (isPreReform) {
      if (waitingDaysUsed >= waitingDaysTarget) {
        isPayable = true;
      } else {
        waitingDaysUsed += 1;
      }
    } else {
      isPayable = true;
    }

    if (isWithinRun) {
      qualifyingDaysInRun.push(dayIso);
      if (isPayable) payableDaysInRun.push(dayIso);
    }
  }

  return {
    plan: {
      absenceId: absence.id,
      employeeId: absence.employee_id,
      runStart,
      runEnd,
      sicknessStart: absence.first_day,
      sicknessEnd: absence.last_day_actual || absence.last_day_expected,
      qualifyingDays: qualifyingDaysInRun,
      payableDays: payableDaysInRun,
      dailyRate: null,
      sspAmount: 0,
    },
    waitingDaysUsedInChainAfterAbsence: waitingDaysUsed,
  };
}

/**
 * Legacy helper retained for compatibility.
 * For transition-aware linked-spell behaviour, use getSspPlansForRun.
 */
export function computeSspDayPlanForAbsence(
  absence: SicknessAbsenceRow,
  runStart: string,
  runEnd: string,
  waitingDaysTarget: number = 3
): SspDayPlanForAbsence {
  return buildSingleAbsencePlanWithTransition(absence, runStart, runEnd, 0, waitingDaysTarget).plan;
}

function computeSspPlanForEmployeeWithHistory(
  employeeId: string,
  absences: SicknessAbsenceRow[],
  runStart: string,
  runEnd: string,
  waitingDaysTarget: number
): SspPlanByEmployee {
  const sorted = [...absences].sort((a, b) => {
    const aStart = parseIsoDateOnlyToUtc(a.first_day).getTime();
    const bStart = parseIsoDateOnlyToUtc(b.first_day).getTime();
    if (aStart === bStart) {
      const aEnd = parseIsoDateOnlyToUtc(a.last_day_actual || a.last_day_expected).getTime();
      const bEnd = parseIsoDateOnlyToUtc(b.last_day_actual || b.last_day_expected).getTime();
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
    const sicknessStartDate = parseIsoDateOnlyToUtc(absence.first_day);
    const sicknessEndDate = parseIsoDateOnlyToUtc(absence.last_day_actual || absence.last_day_expected);

    if (chainEndDate) {
      const gapDays = diffInDaysUtc(chainEndDate, sicknessStartDate);
      if (gapDays > 56) {
        waitingDaysUsedInChain = 0;
      }
    }

    const built = buildSingleAbsencePlanWithTransition(
      absence,
      runStart,
      runEnd,
      waitingDaysUsedInChain,
      target
    );

    waitingDaysUsedInChain = built.waitingDaysUsedInChainAfterAbsence;

    if (built.plan.qualifyingDays.length > 0) {
      plansForRun.push(built.plan);
      totalQualifyingDays += built.plan.qualifyingDays.length;
      totalPayableDays += built.plan.payableDays.length;
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
 * This is now pack-driven by endDate and transition-aware for April 2026 reform rules.
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
 * This is pack-driven and transition-aware for April 2026 SSP reform.
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

  const endPack = await getCompliancePackForDate(endDate);
  const endCfg = extractSspSettingsFromPack(endPack);
  const packMeta = buildPackMeta(endDate, endPack, endCfg);

  const plans = await getSspPlansForRun(companyId, startDate, endDate);

  const packCache = new Map<string, { pack: CompliancePack; cfg: ExtractedSspSettings }>();
  packCache.set(endDate, { pack: endPack, cfg: endCfg });

  async function getPackForDay(dayIso: string) {
    const cached = packCache.get(dayIso);
    if (cached) return cached;

    const pack = await getCompliancePackForDate(dayIso);
    const cfg = extractSspSettingsFromPack(pack);
    const value = { pack, cfg };
    packCache.set(dayIso, value);
    return value;
  }

  const results: SspAmountForEmployee[] = [];

  for (const plan of plans) {
    const warnings: string[] = [];
    let awe: AweInfo | null = null;

    const earliestSicknessStart = [...plan.absences]
      .map((a) => a.sicknessStart)
      .filter((d) => isIsoDate(d))
      .sort((a, b) => a.localeCompare(b))[0] || null;

    const needsAwe =
      !dailyRateOverride &&
      plan.absences.some((a) => a.payableDays.some((day) => day >= SSP_REFORM_DATE)) &&
      endCfg.lowEarnerPercentCapEnabled &&
      safeNumber(endCfg.lowEarnerPercent) !== null &&
      Number(endCfg.lowEarnerPercent) > 0 &&
      Number(endCfg.lowEarnerPercent) < 1;

    if (needsAwe && earliestSicknessStart) {
      const referenceEnd = addDaysIso(earliestSicknessStart, -1);
      try {
        awe = await computeAweWeeklyForSspCap(companyId, plan.employeeId, referenceEnd);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        warnings.push(`SSP AWE calculation failed. Flat rate SSP used. (${msg})`);
        awe = null;
      }
    }

    const absencesWithAmounts: SspDayPlanForAbsence[] = [];
    let totalAmount = 0;

    for (const absence of plan.absences) {
      let absenceWarnings: string[] = [];
      let absenceAmount = 0;

      if (typeof dailyRateOverride === "number" && dailyRateOverride > 0) {
        absenceAmount = round2(absence.payableDays.length * round2(dailyRateOverride));
        absencesWithAmounts.push({
          ...absence,
          dailyRate: round2(dailyRateOverride),
          sspAmount: absenceAmount,
        });
        totalAmount = round2(totalAmount + absenceAmount);
        continue;
      }

      const protectedFlatRateForOngoingPreReformAbsence =
        absence.sicknessStart < SSP_REFORM_DATE &&
        hasPayablePreReform(absence) &&
        awe !== null &&
        awe.aweWeekly >= SSP_TRANSITION_PROTECTED_FLAT_MIN_AWE &&
        awe.aweWeekly <= SSP_TRANSITION_PROTECTED_FLAT_MAX_AWE;

      let rateDaysUsed: number[] = [];
      for (const payableDay of absence.payableDays) {
        const { cfg } = await getPackForDay(payableDay);

        let weeklyRateUsed = round2(cfg.weeklyFlat);
        const lowPct = safeNumber(cfg.lowEarnerPercent);
        const dayIsPostReform = payableDay >= SSP_REFORM_DATE;

        if (
          dayIsPostReform &&
          cfg.lowEarnerPercentCapEnabled &&
          lowPct !== null &&
          lowPct > 0 &&
          lowPct < 1
        ) {
          if (protectedFlatRateForOngoingPreReformAbsence) {
            weeklyRateUsed = round2(cfg.weeklyFlat);
          } else if (awe && awe.aweWeekly > 0) {
            weeklyRateUsed = round2(Math.min(cfg.weeklyFlat, awe.aweWeekly * lowPct));
          } else {
            absenceWarnings.push(
              "SSP low-earner cap is enabled but AWE could not be derived from pay history in the 8-week window. Flat rate SSP used."
            );
          }
        }

        const dailyRateForDay = round2(weeklyRateUsed / qualifyingDaysPerWeek);
        rateDaysUsed.push(dailyRateForDay);
        absenceAmount = round2(absenceAmount + dailyRateForDay);
      }

      const distinctRates = Array.from(new Set(rateDaysUsed.map((x) => x.toFixed(4))));
      if (distinctRates.length > 1) {
        absenceWarnings.push("SSP daily rate changed within this run due to April 2026 transition rules.");
      }

      const averageDailyRate =
        absence.payableDays.length > 0 ? round2(absenceAmount / absence.payableDays.length) : 0;

      const mergedWarnings = [...absenceWarnings];
      absencesWithAmounts.push({
        ...absence,
        dailyRate: averageDailyRate || null,
        sspAmount: round2(absenceAmount),
        ...(mergedWarnings.length ? { warnings: mergedWarnings } : {}),
      });

      if (protectedFlatRateForOngoingPreReformAbsence) {
        warnings.push(
          "Employee was already receiving SSP before 6 April 2026 and remains on the same sickness absence, so the protected flat-rate transition rule was applied instead of reducing to 80% of AWE."
        );
      }

      for (const w of absenceWarnings) {
        if (!warnings.includes(w)) warnings.push(w);
      }

      totalAmount = round2(totalAmount + absenceAmount);
    }

    const totalPayableDays = absencesWithAmounts.reduce((sum, a) => sum + a.payableDays.length, 0);
    const averageDailyRate = totalPayableDays > 0 ? round2(totalAmount / totalPayableDays) : 0;

    results.push({
      employeeId: plan.employeeId,
      totalQualifyingDays: plan.totalQualifyingDays,
      totalPayableDays: plan.totalPayableDays,
      dailyRate: averageDailyRate,
      sspAmount: round2(totalAmount),
      absences: absencesWithAmounts,
      dailyRateSource: typeof dailyRateOverride === "number" && dailyRateOverride > 0 ? "override" : "compliance_pack",
      packMeta,
      awe,
      ...(warnings.length ? { warnings: Array.from(new Set(warnings)) } : {}),
    });
  }

  return results;
}
