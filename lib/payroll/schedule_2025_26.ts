// lib/payroll/schedule_2025_26.ts
// UK tax year 2025/2026 schedule generator (6 Apr 2025 .. 5 Apr 2026)
//
// Exports:
// - weeklyRuns:      52 items labelled "wk 1" .. "wk 52"
// - fortnightlyRuns: 26 items labelled "wk N-N+1"
// - fourWeeklyRuns:  13 items labelled "wk N-N+3"
// - monthlyRuns:     12 items labelled "Mth 1" .. "Mth 12"
// - allRuns:         everything together if you need to seed a table
//
// Notes
// - Weeks are Sunday..Saturday, starting Sun 2025-04-06.
// - Tax months are from the 6th to the 5th.
// - Labels use a hyphen, not an en dash, to keep things ASCII-clean.

export type Frequency = 'weekly' | 'fortnightly' | 'fourweekly' | 'monthly';

export type Run = {
  frequency: Frequency;
  run_number: string;          // e.g. "wk 1", "wk 7-8", "Mth 3"
  period_start: string;        // ISO date (YYYY-MM-DD)
  period_end: string;          // ISO date (YYYY-MM-DD)
  tax_week?: number;           // for weekly/paired ranges this is the first week number
  tax_month?: number;          // 1..12 for monthly
};

const TAX_YEAR_START = new Date(2025, 3, 6); // 6 Apr 2025
const TAX_YEAR_END   = new Date(2026, 3, 5); // 5 Apr 2026

// ---------- public exports ----------

export const weeklyRuns: Run[] = genWeekly(TAX_YEAR_START, 52);

export const fortnightlyRuns: Run[] = groupWeeks(weeklyRuns, 2, 'fortnightly');

export const fourWeeklyRuns: Run[] = groupWeeks(weeklyRuns, 4, 'fourweekly');

export const monthlyRuns: Run[] = genMonthly(TAX_YEAR_START, 12);

export const allRuns: Run[] = [
  ...weeklyRuns,
  ...fortnightlyRuns,
  ...fourWeeklyRuns,
  ...monthlyRuns,
];

// ---------- generators ----------

function genWeekly(start: Date, count: number): Run[] {
  const out: Run[] = [];
  for (let i = 0; i < count; i++) {
    const wk = i + 1;
    const s = addDays(start, i * 7);
    const e = addDays(s, 6);
    out.push({
      frequency: 'weekly',
      run_number: `wk ${wk}`,
      period_start: iso(s),
      period_end: iso(e),
      tax_week: wk,
    });
  }
  return out;
}

function groupWeeks(weeks: Run[], size: 2 | 4, frequency: 'fortnightly' | 'fourweekly'): Run[] {
  const out: Run[] = [];
  for (let i = 0; i < weeks.length; i += size) {
    const chunk = weeks.slice(i, i + size);
    if (chunk.length === 0) continue;
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const n1 = first.tax_week ?? (i + 1);
    const n2 = Math.min(n1 + (size - 1), 52);
    out.push({
      frequency,
      run_number: size === 2 ? `wk ${n1}-${n2}` : `wk ${n1}-${n2}`,
      period_start: first.period_start,
      period_end: last.period_end,
      tax_week: n1,
    });
  }
  return out;
}

function genMonthly(taxStart: Date, months: number): Run[] {
  const out: Run[] = [];
  for (let m = 0; m < months; m++) {
    const s = addMonthsKeepingDay(taxStart, m);               // 6th of month m
    const e = addDays(addMonthsKeepingDay(taxStart, m + 1), -1); // 5th of next month
    out.push({
      frequency: 'monthly',
      run_number: `Mth ${m + 1}`,
      period_start: iso(s),
      period_end: iso(e),
      tax_month: m + 1,
    });
  }
  return out;
}

// ---------- date helpers ----------

function addDays(d: Date, days: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + days);
  return x;
}

// Keep the day-of-month equal to the tax start's DOM (6th).
function addMonthsKeepingDay(d: Date, months: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setMonth(x.getMonth() + months);
  return x;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------- quick sanity checks (leave commented) ----------
// console.table(weeklyRuns.slice(0, 3));
// console.table(weeklyRuns.slice(-3));
// console.table(monthlyRuns);
// console.table(fortnightlyRuns);
// console.table(fourWeeklyRuns);
