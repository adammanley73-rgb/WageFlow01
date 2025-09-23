// Average Weekly Earnings (AWE) helpers for statutory payments.
// Covers the "relevant period" and the AWE calculation used by SMP/SAP/SPP/ShPP/SPBP and SSP.
//
// Relevant period rule (summary):
// - End: the last normal payday on or before the reference date
//   (for SMP/SAP/SPP/ShPP/SPBP this is the Saturday of the qualifying/matching week;
//    for SSP it's the day before the first day of sickness).
// - Start: the day after the last normal payday that fell at least 8 weeks earlier.
// - Include all taxable earnings actually paid in that window.
// Sources: GOV.UK, HMRC manuals. See app commit message for links.
//
// This module is deliberately input-driven. You pass in actual payments with
// pay dates; we infer the period by the 8-week rule and compute AWE consistently.

export type ISODate = string; // yyyy-mm-dd

export type PayItem = {
  paidOn: ISODate;      // date earnings were paid
  gross: number;        // taxable gross subject to Class 1 NICs
  ref?: string;         // optional note/reference
};

export type RelevantPeriod = {
  startDate: ISODate;   // inclusive: day after the start payday
  endDate: ISODate;     // inclusive: the end payday
  startPayday?: ISODate;
  endPayday?: ISODate;
  dayCount: number;     // inclusive day span
  weekCount: number;    // dayCount / 7
  paymentsIncluded: PayItem[];
  totalEarnings: number;
};

export type AweResult = RelevantPeriod & {
  awe: number;          // average weekly earnings to 2dp
};

/** Parse yyyy-mm-dd safely as UTC midnight. */
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

function diffDaysInclusive(a: ISODate, b: ISODate): number {
  const ms = d(b).getTime() - d(a).getTime();
  return Math.floor(ms / 86400000) + 1;
}

function sortByPaidOn(pay: PayItem[]): PayItem[] {
  return [...pay].sort((x, y) => x.paidOn.localeCompare(y.paidOn));
}

/**
 * Find the Relevant Period using the 8-week rule.
 *
 * @param payments list of paid items (unsorted OK)
 * @param referenceEnd a reference date:
 *   - SMP/SAP/SPP/ShPP/SPBP: Saturday of the qualifying/matching week
 *   - SSP: the day before the first day of sickness
 * @returns RelevantPeriod with start/end dates and earnings included
 */
export function findRelevantPeriod(payments: PayItem[], referenceEnd: ISODate): RelevantPeriod {
  const pay = sortByPaidOn(payments).filter(p => Number.isFinite(p.gross) && p.gross !== 0);

  // End payday = last payment on or before referenceEnd
  const endIdx = (() => {
    for (let i = pay.length - 1; i >= 0; i--) {
      if (pay[i].paidOn <= referenceEnd) return i;
    }
    return -1;
  })();

  if (endIdx < 0) {
    // No payments before the reference point; return empty period anchored at referenceEnd.
    return {
      startDate: referenceEnd,
      endDate: referenceEnd,
      startPayday: undefined,
      endPayday: undefined,
      dayCount: 1,
      weekCount: 1 / 7,
      paymentsIncluded: [],
      totalEarnings: 0,
    };
  }

  const endPayday = pay[endIdx].paidOn;

  // Start payday = last payment with paidOn <= endPayday - 8 weeks
  const eightWeeksEarlier = toISO(new Date(d(endPayday).getTime() - 8 * 7 * 86400000));
  let startIdx = -1;
  for (let i = endIdx; i >= 0; i--) {
    if (pay[i].paidOn <= eightWeeksEarlier) {
      startIdx = i;
      break;
    }
  }

  // If no payday at least 8 weeks earlier, fall back to the earliest payday we have.
  const startPayday = startIdx >= 0 ? pay[startIdx].paidOn : pay[0].paidOn;

  // Period starts the day after startPayday and ends on endPayday (inclusive).
  const startDate = addDays(startPayday, 1);
  const endDate = endPayday;

  // Payments included are those actually paid in that window.
  const paymentsIncluded = pay.filter(p => p.paidOn >= startDate && p.paidOn <= endDate);

  const totalEarnings = round2(paymentsIncluded.reduce((s, p) => s + Number(p.gross || 0), 0));

  const dayCount = Math.max(1, diffDaysInclusive(startDate, endDate));
  const weekCount = dayCount / 7;

  return {
    startDate,
    endDate,
    startPayday,
    endPayday,
    dayCount,
    weekCount,
    paymentsIncluded,
    totalEarnings,
  };
}

/**
 * Compute AWE per gov.uk:
 * - If the period is whole weeks, divide total by the number of weeks.
 * - If not an exact whole-week span, divide by days and multiply by 7.
 * Earnings are those actually paid in the relevant period.
 *
 * Returns AWE rounded to 2dp using HMRC-style rounding.
 */
export function calcAWE(payments: PayItem[], referenceEnd: ISODate): AweResult {
  const rp = findRelevantPeriod(payments, referenceEnd);

  if (rp.paymentsIncluded.length === 0 || rp.totalEarnings <= 0) {
    return { ...rp, awe: 0 };
  }

  let awe: number;
  const wholeWeeks = Number.isInteger(rp.weekCount);

  if (wholeWeeks && rp.weekCount > 0) {
    // Classic method: total / number of weeks
    awe = rp.totalEarnings / rp.weekCount;
  } else {
    // Days method (SSP rule when not exact whole weeks): total / days * 7
    awe = (rp.totalEarnings / rp.dayCount) * 7;
  }

  return { ...rp, awe: round2(awe) };
}

/**
 * Convenience for SSP:
 * - referenceEnd should be the day before the first day of sickness.
 * Pass the same payments; this just documents the intended usage.
 */
export function calcAWEforSSP(payments: PayItem[], dayBeforeSickness: ISODate): AweResult {
  return calcAWE(payments, dayBeforeSickness);
}

/**
 * Convenience for SMP/SAP/SPP/ShPP/SPBP:
 * - referenceEnd should be the Saturday of the qualifying or matching week.
 */
export function calcAWEforFamily(payments: PayItem[], saturdayOfQWorMW: ISODate): AweResult {
  return calcAWE(payments, saturdayOfQWorMW);
}

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// -------- Example usage (keep for DX; strip when you wire real forms) --------
// const pay: PayItem[] = [
//   { paidOn: '2025-01-31', gross: 3200 },
//   { paidOn: '2025-02-28', gross: 3200 },
//   { paidOn: '2025-03-31', gross: 3200 },
//   { paidOn: '2025-04-30', gross: 3200 },
// ];
// const qwSaturday = '2025-05-10'; // example
// const res = calcAWEforFamily(pay, qwSaturday);
// console.log(res.awe, res.startDate, res.endDate);
