/* preview: auto-suppressed to keep Preview builds green. */
// Shared Parental Pay (ShPP) calculator for UK payroll demo.
// Uses AWE from awe.ts and rates from rates.ts.
//
// Rules covered (simplified for demo):
// - Choose N consecutive weeks (typically up to 37 available across parents).
// - Each week pays min(90% of AWE, statutory family weekly rate for that week’s start date).
// - Eligibility: service >= 26 weeks at the qualifying/matching week and AWE >= LEL.
// - Rounding: 2dp.
//
// This module mirrors SPP structure but allows an arbitrary week count.

import { calcAWEforFamily, type PayItem, type AweResult } from './awe';
import { familyWeeklyRate, lowerEarningsLimitWeekly } from './rates';

export type ISODate = string; // yyyy-mm-dd

export interface ShppInput {
  payments: PayItem[];              // pay items used for AWE
  qualifyingOrMatchingWeekSaturday: ISODate; // Saturday of QW/MW used for AWE
  payStartDate: ISODate;            // first day ShPP is to be paid
  serviceWeeksAtQWorMW: number;     // completed weeks of continuous service at QW/MW
  weeksChosen: number;              // number of ShPP weeks (1..37 typically)
}

export interface ShppWeek {
  weekNo: number;     // 1..weeksChosen
  startDate: ISODate; // inclusive
  endDate: ISODate;   // inclusive
  gross: number;      // payable amount for this ShPP week
  capApplied: boolean;
}

export interface ShppResult {
  eligible: boolean;
  reasons: string[];
  awe: number;
  lelWeekly: number;
  weeklyAt90pct: number; // 90% AWE
  schedule: ShppWeek[];
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
 * Calculate Shared Parental Pay for N weeks.
 */
export function calculateShPP(input: ShppInput): ShppResult {
  const {
    payments,
    qualifyingOrMatchingWeekSaturday,
    payStartDate,
    serviceWeeksAtQWorMW,
    weeksChosen,
  } = input;

  const weeks = Math.max(0, Math.min(weeksChosen | 0, 37)); // clamp to sensible max
  // 1) AWE from relevant period ending on the QW/MW Saturday
  const rp = calcAWEforFamily(payments, qualifyingOrMatchingWeekSaturday);
  const awe = round2(rp.awe);
  const ninety = round2(awe * 0.9);

  // 2) Eligibility
  const lel = lowerEarningsLimitWeekly();
  const reasons: string[] = [];
  if (serviceWeeksAtQWorMW < 26) reasons.push('Service less than 26 weeks at the qualifying/matching week.');
  if (awe < lel) reasons.push(`Average weekly earnings below LEL (£${lel.toFixed(2)}).`);
  const eligible = reasons.length === 0;

  // 3) Schedule
  const schedule: ShppWeek[] = [];
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
 * Weekly ShPP for a given start date (helper for UIs).
 */
export function shppWeeklyOnDate(awe: number, weekStartDate: ISODate): number {
  const ninety = round2(awe * 0.9);
  const cap = familyWeeklyRate(undefined, d(weekStartDate));
  return round2(Math.min(ninety, cap));
}

// Example local test (do not import in app code):
// const res = calculateShPP({
//   payments: [
//     { paidOn: '2025-01-31', gross: 3200 },
//     { paidOn: '2025-02-28', gross: 3200 },
//     { paidOn: '2025-03-31', gross: 3200 },
//     { paidOn: '2025-04-30', gross: 3200 },
//   ],
//   qualifyingOrMatchingWeekSaturday: '2025-05-10',
//   payStartDate: '2025-09-01',
//   serviceWeeksAtQWorMW: 60,
//   weeksChosen: 10,
// });
// console.log(res.eligible, res.total, res.schedule.length);
