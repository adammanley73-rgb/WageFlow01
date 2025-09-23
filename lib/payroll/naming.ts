// lib/payroll/naming.ts
// Run labels based on the UK tax year.
// Tax year starts 6 April and ends 5 April. Tax months are 6th..5th.
// Weeks are 7 day blocks from the tax year start. We clamp to 52 by spec.
//
// Labels:
// - weekly:      "wk N"             N = 1..52
// - fortnightly: "wk N–M"           N..M = N..N+1, clamped to 52
// - fourweekly:  "wk N–M"           N..M = N..N+3, clamped to 52
// - monthly:     "Mth M"            M = 1..12 (tax month number)
//
// You can pass taxYearStart to force a specific year. If omitted, we compute
// the tax year for the periodStart.

export type Frequency = 'weekly' | 'fortnightly' | 'fourweekly' | 'monthly';

export function labelForRun(opts: {
  frequency: Frequency;
  periodStart: Date | string;
  periodEnd?: Date | string;             // reserved for future use
  taxYearStart?: Date | string;          // optional override
}): string {
  const start = toDate(opts.periodStart);
  const taxStart = opts.taxYearStart ? toDate(opts.taxYearStart) : ukTaxYearStartFor(start);

  switch (opts.frequency) {
    case 'weekly': {
      const w = clamp52(taxWeekNumber(start, taxStart));
      return `wk ${w}`;
    }
    case 'fortnightly': {
      const w1 = clamp52(taxWeekNumber(start, taxStart));
      const w2 = clamp52(w1 + 1);
      return w1 === w2 ? `wk ${w1}` : `wk ${w1}–${w2}`;
    }
    case 'fourweekly': {
      const w1 = clamp52(taxWeekNumber(start, taxStart));
      const w2 = clamp52(w1 + 3);
      return w1 === w2 ? `wk ${w1}` : `wk ${w1}–${w2}`;
    }
    case 'monthly': {
      const m = clamp12(taxMonthNumber(start, taxStart));
      return `Mth ${m}`;
    }
  }
}

// ---------- helpers ----------

function toDate(d: Date | string): Date {
  if (d instanceof Date) return d;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) throw new Error(`Invalid date: ${String(d)}`);
  return parsed;
}

// Compute the UK tax year start for a given date.
// If date >= 6 April of that calendar year, start is 6 Apr same year.
// Else start is 6 Apr previous year.
export function ukTaxYearStartFor(d: Date | string): Date {
  const dt = toDate(d);
  const y = dt.getFullYear();
  const candidate = new Date(y, 3, 6); // 6 April (month index 3)
  return dt >= candidate ? candidate : new Date(y - 1, 3, 6);
}

// Tax week number relative to taxStart, 1 based.
// Week 1 is taxStart..taxStart+6 days, Week 2 is next 7 days, etc.
export function taxWeekNumber(d: Date | string, taxStart: Date | string): number {
  const date = toDate(d);
  const start = toDate(taxStart);
  const diffDays = Math.floor((stripTime(date).getTime() - stripTime(start).getTime()) / DAY_MS);
  const week = Math.floor(diffDays / 7) + 1;
  return week < 1 ? 1 : week;
}

// Tax month number 1..12 where month 1 is 6 Apr..5 May.
export function taxMonthNumber(d: Date | string, taxStart: Date | string): number {
  const date = toDate(d);
  const start = toDate(taxStart);

  // months difference ignoring days
  let months = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());

  // if day-of-month is before the 6th, we are still in the previous tax month
  if (date.getDate() < start.getDate()) months -= 1;

  const m = months + 1; // 1 based
  if (m < 1) return 1;
  if (m > 12) return 12;
  return m;
}

function clamp52(n: number): number {
  return n < 1 ? 1 : n > 52 ? 52 : n;
}

function clamp12(n: number): number {
  return n < 1 ? 1 : n > 12 ? 12 : n;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ---------- examples ----------
// Week 1 of 2025/26 tax year starts 06/04/2025
// labelForRun({ frequency: 'weekly', periodStart: '2025-04-06' }) -> "wk 1"
// labelForRun({ frequency: 'fortnightly', periodStart: '2025-04-06' }) -> "wk 1–2"
// labelForRun({ frequency: 'fourweekly', periodStart: '2025-12-05' }) -> "wk 35–38" (example)
// labelForRun({ frequency: 'monthly', periodStart: '2025-05-10' }) -> "Mth 2"
