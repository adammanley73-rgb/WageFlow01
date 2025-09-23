// Statutory Maternity Pay (SMP) calculator for UK payroll demo.
// Uses AWE from awe.ts and rates from rates.ts.
// Schedule = 39 weeks: first 6 at 90% AWE, next 33 at min(90% AWE, family weekly rate).
//
// Design notes
// - We calculate AWE using the qualifying week Saturday (QW) as the reference end.
// - Per-week statutory cap is looked up using the start date of that SMP week.
//   This automatically copes with rate changes each April.
// - Eligibility: service >= 26 weeks at QW and AWE >= LEL. We surface reasons if ineligible.
// - Rounding: 2 decimal places conventional rounding.
//
// Inputs are minimal on purpose for the demo. If you later wire full HR data,
// you can compute serviceWeeksAtQW and payStartDate from employment records.

import { calcAWEforFamily, type PayItem, type AweResult } from './awe';
import { familyWeeklyRate, lowerEarningsLimitWeekly } from './rates';

export type ISODate = string; // yyyy-mm-dd

export interface SmpInput {
  payments: PayItem[];              // pay items used for AWE
  qualifyingWeekSaturday: ISODate;  // Saturday of the qualifying week (15th week before EWC)
  payStartDate: ISODate;            // date SMP pay starts (usually when maternity leave starts)
  serviceWeeksAtQW: number;         // completed weeks of continuous service at QW
}

export interface SmpWeek {
  weekNo: number;       // 1..39
  startDate: ISODate;   // inclusive
  endDate: ISODate;     // inclusive
  gross: number;        // amount payable for this week
  capApplied: boolean;  // true if week 7..39 was capped by statutory family weekly rate
}

export interface SmpResult {
  eligible: boolean;
  reasons: string[];
  awe: number;
  lelWeekly: number;
  first6WeeksWeekly: number; // 90% AWE
  schedule: SmpWeek[];       // 39 weeks
  total: number;
  first6Total: number;
  remaining33Total: number;
  relevantPeriod: AweResult; // echo back the period used for AWE
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
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate SMP schedule and eligibility.
 * This does not consider contractual enhancements or KIT days.
 */
export function calculateSMP(input: SmpInput): SmpResult {
  const { payments, qualifyingWeekSaturday, payStartDate, serviceWeeksAtQW } = input;

  // 1) AWE from relevant period ending on QW Saturday
  const rp = calcAWEforFamily(payments, qualifyingWeekSaturday);
  const awe = round2(rp.awe);

  // 2) Eligibility
  const lel = lowerEarningsLimitWeekly();
  const reasons: string[] = [];
  if (serviceWeeksAtQW < 26) reasons.push('Service less than 26 weeks at the qualifying week.');
  if (awe < lel) reasons.push(`Average weekly earnings below LEL (£${lel.toFixed(2)}).`);
  const eligible = reasons.length === 0;

  // 3) Schedule (39 weeks)
  const pct90 = round2(awe * 0.9);
  const schedule: SmpWeek[] = [];

  let first6Total = 0;
  let remaining33Total = 0;

  for (let i = 0; i < 39; i++) {
    const weekNo = i + 1;
    const start = addDays(payStartDate, i * 7);
    const end = addDays(start, 6);

    let gross: number;
    let capApplied = false;

    if (weekNo <= 6) {
      gross = pct90;
    } else {
      const cap = familyWeeklyRate(undefined, d(start));
      const ninety = pct90;
      if (ninety > cap) {
        gross = round2(cap);
        capApplied = true;
      } else {
        gross = ninety;
      }
    }

    schedule.push({ weekNo, startDate: start, endDate: end, gross, capApplied });
    if (weekNo <= 6) first6Total += gross;
    else remaining33Total += gross;
  }

  const total = round2(first6Total + remaining33Total);

  return {
    eligible,
    reasons,
    awe,
    lelWeekly: lel,
    first6WeeksWeekly: pct90,
    schedule,
    total: round2(total),
    first6Total: round2(first6Total),
    remaining33Total: round2(remaining33Total),
    relevantPeriod: rp,
  };
}

/**
 * Quick helper to get the weekly SMP rate for a specific SMP week date.
 * Week 1..6: 90% AWE. Week 7..39: min(90% AWE, family weekly rate on that date).
 */
export function smpWeeklyOnDate(awe: number, weekStartDate: ISODate, weekNo: number): number {
  const pct90 = round2(awe * 0.9);
  if (weekNo <= 6) return pct90;
  const cap = familyWeeklyRate(undefined, d(weekStartDate));
  return round2(Math.min(pct90, cap));
}

// Example usage for local testing (do not import in app code):
// const res = calculateSMP({
//   payments: [
//     { paidOn: '2025-01-31', gross: 3200 },
//     { paidOn: '2025-02-28', gross: 3200 },
//     { paidOn: '2025-03-31', gross: 3200 },
//     { paidOn: '2025-04-30', gross: 3200 },
//   ],
//   qualifyingWeekSaturday: '2025-05-10',
//   payStartDate: '2025-07-01',
//   serviceWeeksAtQW: 52,
// });
// console.log(res.eligible, res.total, res.schedule[0], res.schedule[6]);
