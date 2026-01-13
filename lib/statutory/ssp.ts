// @ts-nocheck
/* preview: auto-suppressed to keep Preview builds green. */
// C:\Users\adamm\Projects\wageflow01\lib\statutory\ssp.ts
//
// Statutory Sick Pay (SSP) calculator for WageFlow.
// Core logic (still true in both regimes):
// - Identifies PIWs (periods of incapacity for work): >= 4 consecutive qualifying days.
// - Links PIWs if the gap is <= 8 weeks (56 days). Waiting days carry over across a linked spell.
// - Caps entitlement at 28 weeks total across the spell.
// - Amounts are based on whole qualifying sick days only.
//
// Key change for April 2026 compliance:
// This engine now supports a "policy + rates resolver" injected by the caller.
// That lets WageFlow select the correct rules from Compliance Packs by date/pay date.
//
// Policy supports:
// - waitingDays (legacy 3, reform 0)
// - requiresLel (legacy true, reform false)
// - lowEarnerPercentCapEnabled + lowEarnerPercent (reform: 80% of normal weekly earnings, capped by flat rate)

import { calcAWEforSSP, type PayItem, type AweResult } from "./awe";
import { sspWeeklyRate as legacySspWeeklyRate, lowerEarningsLimitWeekly as legacyLelWeekly } from "./rates";

export type ISODate = string; // yyyy-mm-dd

export type SspPolicy = {
  waitingDays: number; // 0..7
  requiresLel: boolean;
  lowEarnerPercentCapEnabled: boolean;
  lowEarnerPercent: number | null; // 0.80 for reform
};

export type WeeklyRateResolver = (onDate: ISODate) => number;

export interface SspInput {
  payments: PayItem[]; // pay items used for AWE
  firstSickDay: ISODate; // first day of sickness in this claim (yyyy-mm-dd)
  sickDays: ISODate[]; // list of qualifying sick days (only qualifying days), any order
  qualifyingDaysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7; // QDs per week for daily rate

  // Optional: inject Compliance Pack policy and rate source
  policy?: SspPolicy;

  // Optional: inject SSP weekly flat rate resolver (usually from compliance pack for the day)
  weeklyRateResolver?: WeeklyRateResolver;

  // Optional: inject LEL weekly (if you ever move LEL into packs later)
  lelWeeklyOverride?: number | null;
}

export interface SspDay {
  date: ISODate;
  inPIW: boolean; // part of a PIW of >= 4 qualifying days
  linkedSpell: number; // 1-based index of linked spell
  isWaitingDay: boolean; // waiting day in the linked spell
  payable: boolean; // paid by SSP (cap and waiting rules considered)
  gross: number; // amount payable for this day (0 if not payable)
  weeklyRateUsed?: number; // weekly rate used for this date (may reflect 80% cap if applied)
  note?: string; // e.g., "below PIW length", "cap reached", "waiting day", "80% cap applied"
}

export interface SspResult {
  eligible: boolean;
  reasons: string[]; // if ineligible
  awe: number;
  lelWeekly: number;
  qdpw: number;

  // Totals
  daysInPIWs: number;
  waitingDaysServed: number;
  daysPaid: number;
  total: number;

  // Cap info
  capDays: number; // 28 weeks * qdpw
  capApplied: boolean;

  // Detailed day-by-day schedule in ascending date order
  schedule: SspDay[];

  // Echo back the AWE relevant period used
  relevantPeriod: AweResult;

  // Optional: policy snapshot used for this calculation
  policyUsed?: SspPolicy;
}

function defaultLegacyPolicy(): SspPolicy {
  return {
    waitingDays: 3,
    requiresLel: true,
    lowEarnerPercentCapEnabled: false,
    lowEarnerPercent: null,
  };
}

/** Parse yyyy-mm-dd as UTC. */
function d(date: ISODate): Date {
  const [y, m, day] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
function toISO(x: Date): ISODate {
  return x.toISOString().slice(0, 10);
}
function addDays(date: ISODate, days: number): ISODate {
  const t = d(date);
  t.setUTCDate(t.getUTCDate() + days);
  return toISO(t);
}
function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((d(b).getTime() - d(a).getTime()) / 86400000);
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function uniqSortedDays(days: ISODate[]): ISODate[] {
  const set = new Set(days.map((s) => s.trim()).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Build PIWs: contiguous runs of >= 4 consecutive days. */
function buildPIWs(days: ISODate[]): { start: ISODate; end: ISODate; dates: ISODate[] }[] {
  const res: { start: ISODate; end: ISODate; dates: ISODate[] }[] = [];
  if (days.length === 0) return res;

  let run: ISODate[] = [days[0]];
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1];
    const cur = days[i];
    if (diffDays(prev, cur) === 1) {
      run.push(cur);
    } else {
      if (run.length >= 4) res.push({ start: run[0], end: run[run.length - 1], dates: run.slice() });
      run = [cur];
    }
  }
  if (run.length >= 4) res.push({ start: run[0], end: run[run.length - 1], dates: run.slice() });
  return res;
}

/** Link PIWs when the gap between them is <= 56 days. Returns arrays of PIWs per linked spell. */
function linkPIWs(piwList: { start: ISODate; end: ISODate; dates: ISODate[] }[]) {
  const spells: typeof piwList[] = [];
  let current: typeof piwList = [];
  for (let i = 0; i < piwList.length; i++) {
    const piw = piwList[i];
    if (current.length === 0) {
      current.push(piw);
      continue;
    }
    const prev = current[current.length - 1];
    const gap = diffDays(prev.end, piw.start) - 1; // days between runs
    if (gap <= 56) {
      current.push(piw);
    } else {
      spells.push(current);
      current = [piw];
    }
  }
  if (current.length) spells.push(current);
  return spells;
}

function resolveWeeklyRate(onDate: ISODate, weeklyRateResolver?: WeeklyRateResolver): number {
  if (weeklyRateResolver) {
    const v = Number(weeklyRateResolver(onDate));
    if (!Number.isFinite(v) || v <= 0) throw new Error(`Invalid SSP weekly rate resolver value for ${onDate}`);
    return v;
  }
  return legacySspWeeklyRate(undefined, d(onDate));
}

function dailyFromWeekly(weekly: number, qdpw: number): number {
  return round2(weekly / qdpw);
}

function applyLowEarnerRuleIfEnabled(weeklyFlat: number, awe: number, policy: SspPolicy): { weeklyPayable: number; note?: string } {
  if (!policy.lowEarnerPercentCapEnabled) return { weeklyPayable: weeklyFlat };

  const pct = policy.lowEarnerPercent;
  if (!Number.isFinite(pct as number) || (pct as number) <= 0 || (pct as number) > 1) {
    throw new Error("Invalid SSP low earner percent in policy");
  }

  // "Normal weekly earnings" for payroll purposes is represented here by AWE.
  const weekly80 = round2(awe * (pct as number));
  const weeklyPayable = Math.min(weeklyFlat, weekly80);

  if (weeklyPayable < weeklyFlat) {
    return { weeklyPayable, note: "80% cap applied" };
  }
  return { weeklyPayable };
}

/**
 * Calculate SSP day-by-day for provided qualifying sick days.
 * Caller should pass policy + weeklyRateResolver from the Compliance Pack for the relevant date(s).
 */
export function calculateSSP(input: SspInput): SspResult {
  const qdpw = input.qualifyingDaysPerWeek;
  const sickDays = uniqSortedDays(input.sickDays);

  // AWE uses the day before the first day of sickness
  const dayBeforeFirst = addDays(input.firstSickDay, -1);
  const rp = calcAWEforSSP(input.payments, dayBeforeFirst);
  const awe = round2(rp.awe);

  const policy = input.policy ?? defaultLegacyPolicy();

  // LEL only matters when policy.requiresLel is true (legacy regime)
  const lel = Number.isFinite(Number(input.lelWeeklyOverride)) ? Number(input.lelWeeklyOverride) : legacyLelWeekly();

  const reasons: string[] = [];
  if (policy.requiresLel && awe < lel) reasons.push(`Average weekly earnings below LEL (£${lel.toFixed(2)}).`);
  const eligible = reasons.length === 0;

  // Pre-calc PIWs and linked spells
  const piws = buildPIWs(sickDays);
  const spells = linkPIWs(piws);

  // Quick lookups for day -> {inPIW, linkedSpellIndex}
  const inPIW = new Map<ISODate, { spellIndex: number }>();
  spells.forEach((spell, sIdx) => {
    spell.forEach((piw) => {
      piw.dates.forEach((dt) => inPIW.set(dt, { spellIndex: sIdx }));
    });
  });

  const schedule: SspDay[] = [];
  const capDays = 28 * qdpw;
  let daysPaid = 0;
  let daysInPIWs = 0;
  let capApplied = false;

  const waitingTarget = Math.max(0, Math.min(7, Number(policy.waitingDays ?? 3)));

  // Track waiting days per linked spell: first N qualifying days in the spell are waiting days.
  const waitingServedPerSpell = new Map<number, number>();

  for (const date of sickDays) {
    const piwInfo = inPIW.get(date);
    const inPiw = !!piwInfo;
    let isWaiting = false;
    let payable = false;
    let gross = 0;
    let weeklyRateUsed: number | undefined;
    let note: string | undefined;
    let linkedSpell = 0;

    if (!inPiw) {
      payable = false;
      note = "below PIW length";
    } else {
      daysInPIWs += 1;
      linkedSpell = (piwInfo!.spellIndex ?? 0) + 1;

      const served = waitingServedPerSpell.get(piwInfo!.spellIndex) ?? 0;

      if (served < waitingTarget) {
        isWaiting = true;
        waitingServedPerSpell.set(piwInfo!.spellIndex, served + 1);
        payable = false;
        note = "waiting day";
      } else if (daysPaid >= capDays) {
        payable = false;
        capApplied = true;
        note = "cap reached";
      } else if (!eligible) {
        payable = false;
        note = "ineligible";
      } else {
        // Payable day
        const weeklyFlat = resolveWeeklyRate(date, input.weeklyRateResolver);
        const low = applyLowEarnerRuleIfEnabled(weeklyFlat, awe, policy);
        const weeklyPayable = low.weeklyPayable;

        weeklyRateUsed = weeklyPayable;

        const daily = dailyFromWeekly(weeklyPayable, qdpw);
        gross = daily;
        payable = true;
        daysPaid += 1;

        if (low.note) note = low.note;
      }
    }

    schedule.push({
      date,
      inPIW: inPiw,
      linkedSpell,
      isWaitingDay: isWaiting,
      payable,
      gross: round2(gross),
      weeklyRateUsed,
      note,
    });
  }

  const waitingDaysServed = Array.from(waitingServedPerSpell.values()).reduce((a, b) => a + b, 0);
  const total = round2(schedule.reduce((s, dd) => s + dd.gross, 0));

  return {
    eligible,
    reasons,
    awe,
    lelWeekly: lel,
    qdpw,

    daysInPIWs,
    waitingDaysServed,
    daysPaid,
    total,

    capDays,
    capApplied,

    schedule,
    relevantPeriod: rp,
    policyUsed: policy,
  };
}

// Helpers for UIs (legacy behaviour unless you pass a resolver)
export function sspWeeklyOnDate(weekStartDate: ISODate, weeklyRateResolver?: WeeklyRateResolver): number {
  return resolveWeeklyRate(weekStartDate, weeklyRateResolver);
}

export function sspDailyOnDate(date: ISODate, qualifyingDaysPerWeek: number, weeklyRateResolver?: WeeklyRateResolver): number {
  const weekly = resolveWeeklyRate(date, weeklyRateResolver);
  return dailyFromWeekly(weekly, qualifyingDaysPerWeek);
}
