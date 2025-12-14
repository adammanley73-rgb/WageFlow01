// C:\Users\adamm\Projects\wageflow01\lib\payroll\holidayPay.ts

/**
V1 holiday pay rules

Uses WEEKS_PER_YEAR = 52.14285714 (your preferred constant)

Assumes a full time 5 day working week

Salaried:
dailyRate = annual_salary / (WEEKS_PER_YEAR * 5)
amount    = dailyRate * daysOfLeave

Hourly:
dailyRate = hourly_rate * hours_per_week / 5
amount    = dailyRate * daysOfLeave

Part time patterns, irregular calendars and company specific rules
will be handled in v2. This module is intentionally simple and explicit.
*/

export const WEEKS_PER_YEAR = 52.14285714;
export const DAYS_PER_WEEK = 5;

export type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";

export type HolidayPayEmployee = {
  // DB style (snake_case)
  annual_salary?: number | null;
  hourly_rate?: number | null;
  hours_per_week?: number | null;
  pay_basis?: "salaried" | "hourly" | "unknown" | string | null;

  // App style (camelCase)
  annualSalary?: number | null;
  hourlyRate?: number | null;
  hoursPerWeek?: number | null;
  payBasis?: "salaried" | "hourly" | "unknown" | string | null;
};

export type HolidayPayInputV1 = {
  employee: HolidayPayEmployee;
  frequency?: Frequency | string | null;
  daysOfLeave: number;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export type HolidayPayInputLegacy = {
  annualSalary?: number | null;
  hourlyRate?: number | null;
  hoursPerWeek?: number | null;
  daysOfLeave: number;
  frequency?: Frequency | string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export type HolidayPayInput = HolidayPayInputV1 | HolidayPayInputLegacy;

export type HolidayPayResult = {
  amount: number;
  dailyRate: number;
  meta: {
    basis: "salaried" | "hourly" | "unknown";
    weeksPerYear: number;
    daysPerWeek: number;
    rawAmount: number;
    daysOfLeave: number;
    frequency: string | null;
    periodStart: string | null;
    periodEnd: string | null;
  };
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundToCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function getEmployeeNumber(
  emp: HolidayPayEmployee,
  snakeKey: keyof HolidayPayEmployee,
  camelKey: keyof HolidayPayEmployee
): number | null {
  const snake = toNumber(emp[snakeKey]);
  if (snake !== null) return snake;
  const camel = toNumber(emp[camelKey]);
  return camel !== null ? camel : null;
}

export function calculateHolidayPay(input: HolidayPayInput): HolidayPayResult {
  const daysOfLeaveRaw = Number((input as any).daysOfLeave ?? 0);
  const daysOfLeave =
    Number.isFinite(daysOfLeaveRaw) && daysOfLeaveRaw > 0 ? daysOfLeaveRaw : 0;

  const frequency = (input as any).frequency ?? null;
  const periodStart = (input as any).periodStart ?? null;
  const periodEnd = (input as any).periodEnd ?? null;

  let annual: number | null = null;
  let hourly: number | null = null;
  let hoursPerWeek: number | null = null;

  if ((input as HolidayPayInputV1).employee) {
    const emp = (input as HolidayPayInputV1).employee;

    annual = getEmployeeNumber(emp, "annual_salary", "annualSalary");
    hourly = getEmployeeNumber(emp, "hourly_rate", "hourlyRate");
    hoursPerWeek = getEmployeeNumber(emp, "hours_per_week", "hoursPerWeek");
  } else {
    const legacy = input as HolidayPayInputLegacy;
    annual = toNumber(legacy.annualSalary);
    hourly = toNumber(legacy.hourlyRate);
    hoursPerWeek = toNumber(legacy.hoursPerWeek);
  }

  let basis: "salaried" | "hourly" | "unknown" = "unknown";
  let dailyRate = 0;

  if (daysOfLeave <= 0) {
    return {
      amount: 0,
      dailyRate: 0,
      meta: {
        basis,
        weeksPerYear: WEEKS_PER_YEAR,
        daysPerWeek: DAYS_PER_WEEK,
        rawAmount: 0,
        daysOfLeave,
        frequency,
        periodStart,
        periodEnd,
      },
    };
  }

  if (annual !== null && annual > 0) {
    basis = "salaried";
    dailyRate = annual / (WEEKS_PER_YEAR * DAYS_PER_WEEK);
  } else if (
    hourly !== null &&
    hourly > 0 &&
    hoursPerWeek !== null &&
    hoursPerWeek > 0
  ) {
    basis = "hourly";
    const weekly = hourly * hoursPerWeek;
    dailyRate = weekly / DAYS_PER_WEEK;
  } else {
    basis = "unknown";
    dailyRate = 0;
  }

  const rawAmount = dailyRate * daysOfLeave;
  const amount = roundToCents(rawAmount);

  return {
    amount,
    dailyRate,
    meta: {
      basis,
      weeksPerYear: WEEKS_PER_YEAR,
      daysPerWeek: DAYS_PER_WEEK,
      rawAmount,
      daysOfLeave,
      frequency,
      periodStart,
      periodEnd,
    },
  };
}
