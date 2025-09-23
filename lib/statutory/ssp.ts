// Statutory Sick Pay (SSP) calculator for the WageFlow demo.
// - Identifies PIWs (periods of incapacity for work): >= 4 consecutive qualifying days.
// - Links PIWs if the gap is <= 8 weeks (56 days). Waiting days carry over across a linked spell.
// - First 3 qualifying days in the linked spell are waiting days (unpaid).
// - Pays SSP for remaining qualifying days in PIWs at: SSP weekly rate for that date / qualifyingDaysPerWeek.
// - Caps entitlement at 28 weeks total across the spell.
// - Partial-day sickness is recorded in your UI, but SSP amounts are based on qualifying whole days only.
// - Eligibility: AWE >= LEL using the day before first sickness as the reference end.
//
// Inputs are deliberately simple for the demo:
//   - sickDays[] must already contain only "qualifying days" that the employee was sick.
//     If you pass non-qualifying days, they will be treated as qualifying for pay purposes.
//
// Rounding: 2dp conventional.

import { calcAWEforSSP, type PayItem, type AweResult } from './awe';
import { sspWeeklyRate, lowerEarningsLimitWeekly } from './rates';

export type ISODate = string; // yyyy-mm-dd

export interface SspInput {
  payments: PayItem[];          // pay items used for AWE
  firstSickDay: ISODate;        // first day of sickness in this claim (yyyy-mm-dd)
  sickDays: ISODate[];          // list of qualifying sick days (only qualifying days), any order
  qualifyingDaysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7; // QDs per week for daily rate
}

export interface SspDay {
  date: ISODate;
  inPIW: boolean;               // part of a PIW of >= 4 qualifying days
  linkedSpell: number;          // 1-based index of linked spell
  isWaitingDay: boolean;        // one of the first 3 QDs in the linked spell
  payable: boolean;             // paid by SSP (cap and waiting rules considered)
  gross: number;                // amount payable for this day (0 if not payable)
  weeklyRateUsed?: number;      // SSP weekly rate used for this date
  note?: string;                // e.g., "below PIW length", "cap reached"
}

export interface SspResult {
  eligible: boolean;
  reasons: string[];            // if ineligible
  awe: number;
  lelWeekly: number;
  qdpw: number;

  // Totals
  daysInPIWs: number;
  waitingDaysServed: number;
  daysPaid: number;
  total: number;

  // Cap info
  capDays: number;              // 28 weeks * qdpw
  capApplied: boolean;

  // Detailed day-by-day schedule in ascending date order
  schedule: SspDay[];

  // Echo back the AWE relevant period used
  relevantPeriod: AweResult;
}

/** Parse yyyy-mm-dd as UTC. */
function d(date: ISODate): Date {
  const [y, m, day] = date.split('-').map(Number);
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
  const set = new Set(days.map(s => s.trim()).filter(Boolean));
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

/** Daily SSP rate on a given date. */
function sspDailyRate(onDate: ISODate, qdpw: number): number {
  const weekly = sspWeeklyRate(undefined, d(onDate));
  return round2(weekly / qdpw);
}

/**
 * Calculate SSP day-by-day for provided qualifying sick days.
 */
export function calculateSSP(input: SspInput): SspResult {
  const qdpw = input.qualifyingDaysPerWeek;
  const sickDays = uniqSortedDays(input.sickDays);

  // AWE uses the day before the first day of sickness
  const dayBeforeFirst = addDays(input.firstSickDay, -1);
  const rp = calcAWEforSSP(input.payments, dayBeforeFirst);
  const awe = round2(rp.awe);
  const lel = lowerEarningsLimitWeekly();

  const reasons: string[] = [];
  if (awe < lel) reasons.push(`Average weekly earnings below LEL (£${lel.toFixed(2)}).`);
  const eligible = reasons.length === 0;

  // Pre-calc PIWs and linked spells
  const piws = buildPIWs(sickDays);
  const spells = linkPIWs(piws);

  // Quick lookups for day -> {inPIW, linkedSpellIndex}
  const inPIW = new Map<ISODate, { spellIndex: number }>();
  spells.forEach((spell, sIdx) => {
    spell.forEach(piw => {
      piw.dates.forEach(dt => inPIW.set(dt, { spellIndex: sIdx }));
    });
  });

  const schedule: SspDay[] = [];
  const capDays = 28 * qdpw;
  let daysPaid = 0;
  let daysInPIWs = 0;
  let capApplied = false;

  // Track waiting days per linked spell: first 3 qualifying days in the spell are waiting days.
  // We track served counts per spell index.
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
      // Not part of a PIW: not payable by SSP.
      isWaiting = false;
      payable = false;
      note = 'below PIW length';
    } else {
      daysInPIWs += 1;
      linkedSpell = (piwInfo!.spellIndex ?? 0) + 1;

      const served = waitingServedPerSpell.get(piwInfo!.spellIndex) ?? 0;
      if (served < 3) {
        isWaiting = true;
        waitingServedPerSpell.set(piwInfo!.spellIndex, served + 1);
        payable = false;
        note = 'waiting day';
      } else if (daysPaid >= capDays) {
        payable = false;
        isWaiting = false;
        capApplied = true;
        note = 'cap reached';
      } else {
        // Payable day
        const weekly = sspWeeklyRate(undefined, d(date));
        weeklyRateUsed = weekly;
        const daily = sspDailyRate(date, qdpw);
        gross = daily;
        payable = true;
        daysPaid += 1;
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
  const total = round2(schedule.reduce((s, d) => s + d.gross, 0));

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
  };
}

// Helpers for UIs
export function sspWeeklyOnDate(weekStartDate: ISODate): number {
  return sspWeeklyRate(undefined, d(weekStartDate));
}

export function sspDailyOnDate(date: ISODate, qualifyingDaysPerWeek: number): number {
  return sspDailyRate(date, qualifyingDaysPerWeek);
}

// Example local test (do not import in app code):
// const res = calculateSSP({
//   payments: [
//     { paidOn: '2025-01-31', gross: 520 },
//     { paidOn: '2025-02-28', gross: 520 },
//     { paidOn: '2025-03-31', gross: 520 },
//     { paidOn: '2025-04-30', gross: 520 },
//   ],
//   firstSickDay: '2025-06-03',
//   sickDays: ['2025-06-03','2025-06-04','2025-06-05','2025-06-06','2025-06-10','2025-06-11','2025-06-12','2025-06-13'],
//   qualifyingDaysPerWeek: 5,
// });
// console.log(res.eligible, res.total, res.daysPaid, res.schedule.slice(0,6));
