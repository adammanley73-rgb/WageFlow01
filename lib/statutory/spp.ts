// Statutory Paternity Pay (SPP) calculator for UK payroll demo.
// Uses AWE from awe.ts and rates from rates.ts.
//
// Rules covered (simplified for product demo):
// - Choose 1 or 2 consecutive weeks of SPP.
// - Weekly amount = min(90% of AWE, statutory family weekly rate) for each week.
// - Eligibility: service >= 26 weeks at qualifying week (QW) and AWE >= LEL.
// - Rate cap is looked up by the week start date to handle April changes mid-claim.
// - Rounding: 2dp.
//
// This module is input-driven and UI-agnostic.

import { calcAWEforFamily, type PayItem, type AweResult } from './awe';
import { familyWeeklyRate, lowerEarningsLimitWeekly } from './rates';

export type ISODate = string; // yyyy-mm-dd

export interface SppInput {
  payments: PayItem[];              // pay items used for AWE
  qualifyingWeekSaturday: ISODate;  // Saturday of the qualifying week (15th week before EWC/placement)
  payStartDate: ISODate;            // first day SPP is to be paid
  serviceWeeksAtQW: number;         // completed weeks of continuous service at QW
  weeksChosen: 1 | 2;               // length of SPP claim in weeks
}

export interface SppWeek {
  weekNo: number;     // 1..weeksChosen
  startDate: ISODate; // inclusive
  endDate: ISODate;   // inclusive
  gross: number;      // payable amount for this SPP week
  capApplied: boolean;
}

export interface SppResult {
  eligible: boolean;
  reasons: string[];
  awe: number;
  lelWeekly: number;
  weeklyAt90pct: number; // 90% AWE
  schedule: SppWeek[];
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
 * Calculate SPP for 1 or 2 weeks.
 */
export function calculateSPP(input: SppInput): SppResult {
  const { payments, qualifyingWeekSaturday, payStartDate, serviceWeeksAtQW, weeksChosen } = input;

  // 1) AWE from relevant period ending on QW Saturday
  const rp = calcAWEforFamily(payments, qualifyingWeekSaturday);
  const awe = round2(rp.awe);
  const ninety = round2(awe * 0.9);

  // 2) Eligibility
  const lel = lowerEarningsLimitWeekly();
  const reasons: string[] = [];
  if (serviceWeeksAtQW < 26) reasons.push('Service less than 26 weeks at the qualifying week.');
  if (awe < lel) reasons.push(`Average weekly earnings below LEL (£${lel.toFixed(2)}).`);
  const eligible = reasons.length === 0;

  // 3) Schedule
  const schedule: SppWeek[] = [];
  let total = 0;

  for (let i = 0; i < weeksChosen; i++) {
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
 * Weekly SPP for a given start date (helper for UIs).
 */
export function sppWeeklyOnDate(awe: number, weekStartDate: ISODate): number {
  const ninety = round2(awe * 0.9);
  const cap = familyWeeklyRate(undefined, d(weekStartDate));
  return round2(Math.min(ninety, cap));
}

// Example local test (do not import in app code):
// const res = calculateSPP({
//   payments: [
//     { paidOn: '2025-01-31', gross: 3200 },
//     { paidOn: '2025-02-28', gross: 3200 },
//     { paidOn: '2025-03-31', gross: 3200 },
//     { paidOn: '2025-04-30', gross: 3200 },
//   ],
//   qualifyingWeekSaturday: '2025-05-10',
//   payStartDate: '2025-07-15',
//   serviceWeeksAtQW: 60,
//   weeksChosen: 2,
// });
// console.log(res.eligible, res.total, res.schedule);
