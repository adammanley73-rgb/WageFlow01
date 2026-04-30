// lib/payroll/naming.ts
// Run labels based on the UK tax year.
// Tax year starts 6 April and ends 5 April.
// Tax months run from the 6th to the 5th.
// Weeks are 7 day blocks from the tax year start, clamped to 52.
//
// Labels:
// weekly:       "wk N"
// fortnightly:  "wk N-M"
// fourweekly:   "wk N-M"
// monthly:      "Mth M"

export type Frequency = "weekly" | "fortnightly" | "fourweekly" | "four_weekly" | "monthly";

export function labelForRun(opts: {
  frequency: Frequency;
  periodStart: Date | string;
  periodEnd?: Date | string;
  taxYearStart?: Date | string;
}): string {
  const start = toDate(opts.periodStart);
  const taxStart = opts.taxYearStart ? toDate(opts.taxYearStart) : ukTaxYearStartFor(start);

  switch (opts.frequency) {
    case "weekly": {
      const w = clamp52(taxWeekNumber(start, taxStart));
      return `wk ${w}`;
    }

    case "fortnightly": {
      const w1 = clamp52(taxWeekNumber(start, taxStart));
      const w2 = clamp52(w1 + 1);
      return w1 === w2 ? `wk ${w1}` : `wk ${w1}-${w2}`;
    }

    case "fourweekly":
    case "four_weekly": {
      const w1 = clamp52(taxWeekNumber(start, taxStart));
      const w2 = clamp52(w1 + 3);
      return w1 === w2 ? `wk ${w1}` : `wk ${w1}-${w2}`;
    }

    case "monthly": {
      const m = clamp12(taxMonthNumber(start, taxStart));
      return `Mth ${m}`;
    }
  }
}

export function ukTaxYearStartFor(d: Date | string): Date {
  const dt = toDate(d);
  const y = dt.getFullYear();
  const candidate = new Date(y, 3, 6);

  return dt >= candidate ? candidate : new Date(y - 1, 3, 6);
}

export function taxWeekNumber(d: Date | string, taxStart: Date | string): number {
  const date = toDate(d);
  const start = toDate(taxStart);
  const diffDays = Math.floor((stripTime(date).getTime() - stripTime(start).getTime()) / DAY_MS);
  const week = Math.floor(diffDays / 7) + 1;

  return week < 1 ? 1 : week;
}

export function taxMonthNumber(d: Date | string, taxStart: Date | string): number {
  const date = toDate(d);
  const start = toDate(taxStart);

  let months = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());

  if (date.getDate() < start.getDate()) {
    months -= 1;
  }

  const month = months + 1;

  if (month < 1) return 1;
  if (month > 12) return 12;

  return month;
}

function toDate(d: Date | string): Date {
  if (d instanceof Date) {
    return stripTime(d);
  }

  const value = String(d ?? "").trim();

  if (!value) {
    throw new Error("Invalid date: empty value");
  }

  const isoDateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDateOnlyMatch) {
    const year = Number(isoDateOnlyMatch[1]);
    const month = Number(isoDateOnlyMatch[2]);
    const day = Number(isoDateOnlyMatch[3]);

    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      throw new Error(`Invalid date: ${value}`);
    }

    return parsed;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return stripTime(parsed);
}

function clamp52(n: number): number {
  if (n < 1) return 1;
  if (n > 52) return 52;

  return n;
}

function clamp12(n: number): number {
  if (n < 1) return 1;
  if (n > 12) return 12;

  return n;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;
