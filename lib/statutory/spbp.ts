// Statutory Parental Bereavement Pay (SPBP) calculator for UK payroll demo.
// Uses AWE from awe.ts and rates from rates.ts.
//
// Rules covered (simplified for product demo):
// - Employee can take 1 or 2 weeks of SPBP (consecutive for the demo; you can
//   split in the UI later if you want).
// - Each week pays min(90% of AWE, statutory family weekly rate for that week’s start).
// - Eligibility: service >= 26 weeks at the end of the relevant (qualifying) week
//   and AWE >= LEL.
// - Rate cap is looked up by the week start date to handle April changes mid-claim.
// - Rounding: 2dp.
//
// This module mirrors SPP but with a different label and the same weekly cap.

import { calcAWEforFamily, type PayItem, type AweResult } from './awe';
import { familyWeeklyRate, lowerEarningsLimitWeekly } from './rates';

export type ISODate = string; // yyyy-mm-dd

export interface SpbpInput {
  payments: PayItem[];              // pay items used for AWE
  relevantWeekSaturday: ISODate;    // Saturday of the relevant week used for AWE
  payStartDate: ISODate;            // first day SPBP is to be paid
  serviceWeeksAtRelevantWeek: number; // completed weeks of continuous service at relevant week
  weeksChosen: 1 | 2;               // length of SPBP claim in weeks
}

export interface SpbpWeek {
  weekNo: number;     // 1..weeksChosen
  startDate: ISODate; // inclusive
  endDate: ISODate;   // inclusive
  gross: number;      // payable amount for this SPBP week
  capApplied: boolean;
}

export interface SpbpResult {
  eligible: boolean;
  reasons: string[];
  awe: number;
  lelWeekly: number;
  weeklyAt90pct: number; // 90% AWE
  schedule: SpbpWeek[];
  total: number;
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
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate SPBP for 1 or 2 weeks.
 */
export function calculateSPBP(input: SpbpInput): SpbpResult {
  const {
    payments,
    relevantWeekSaturday,
    payStartDate,
    serviceWeeksAtRelevantWeek,
    weeksChosen,
  } = input;

  // 1) AWE from relevant period ending on the relevant week Saturday
  const rp = calcAWEforFamily(payments, relevantWeekSaturday);
  const awe = round2(rp.awe);
  const ninety = round2(awe * 0.9);

  // 2) Eligibility
  const lel = lowerEarningsLimitWeekly();
  const reasons: string[] = [];
  if (serviceWeeksAtRelevantWeek < 26) {
    reasons.push('Service less than 26 weeks at the relevant week.');
  }
  if (awe < lel) {
    reasons.push(`Average weekly earnings below LEL (£${lel.toFixed(2)}).`);
  }
  const eligible = reasons.length === 0;

  // 3) Schedule
  const weeks = weeksChosen === 2 ? 2 : 1;
  const schedule: SpbpWeek[] = [];
  let total = 0;

  for (let i = 0; i < weeks; i++) {
    const weekNo = i + 1;
    const start = addDays(payStartDate, i * 7);
    const end = addDays(start, 6);
    const cap = familyWeeklyRate(undefined, d(start));
    const gross = round2(Math.min(ninety, cap));
    const capApplied = ninety > cap;

    schedule.push({ weekNo, startDate: start, endDate: end, gross, capApplied });
    total += gross;
  }

  return {
    eligible,
    reasons,
    awe,
    lelWeekly: lel,
    weeklyAt90pct: ninety,
    schedule,
    total: round2(total),
    relevantPeriod: rp,
  };
}

/**
 * Weekly SPBP for a given start date (helper for UIs).
 */
export function spbpWeeklyOnDate(awe: number, weekStartDate: ISODate): number {
  const ninety = round2(awe * 0.9);
  const cap = familyWeeklyRate(undefined, d(weekStartDate));
  return round2(Math.min(ninety, cap));
}

// Example local test (do not import in app code):
// const res = calculateSPBP({
//   payments: [
//     { paidOn: '2025-01-31', gross: 3200 },
//     { paidOn: '2025-02-28', gross: 3200 },
//     { paidOn: '2025-03-31', gross: 3200 },
//     { paidOn: '2025-04-30', gross: 3200 },
//   ],
//   relevantWeekSaturday: '2025-05-10',
//   payStartDate: '2025-06-15',
//   serviceWeeksAtRelevantWeek: 55,
//   weeksChosen: 2,
// });
// console.log(res.eligible, res.total, res.schedule);
