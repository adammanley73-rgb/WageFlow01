// C:\Users\adamm\Projects\wageflow01\lib\payroll\holidayPay.ts
/* @ts-nocheck */

/**

V1 holiday pay rules

Uses WEEKS_PER_YEAR = 52.14285714

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

type HolidayPayInput = {
annualSalary?: number | null;
hourlyRate?: number | null;
hoursPerWeek?: number | null;
daysOfLeave: number;
frequency?: string | null;
periodStart?: string | null;
periodEnd?: string | null;
};

type HolidayPayResult = {
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

function toNumber(value: any): number | null {
if (value === null || value === undefined) return null;
const n = Number(value);
return Number.isFinite(n) ? n : null;
}

export function calculateHolidayPay(input: HolidayPayInput): HolidayPayResult {
const annual = toNumber(input.annualSalary);
const hourly = toNumber(input.hourlyRate);
const hoursPerWeek = toNumber(input.hoursPerWeek);
const daysOfLeaveRaw = Number(input.daysOfLeave ?? 0);
const daysOfLeave =
Number.isFinite(daysOfLeaveRaw) && daysOfLeaveRaw > 0
? daysOfLeaveRaw
: 0;

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
frequency: input.frequency ?? null,
periodStart: input.periodStart ?? null,
periodEnd: input.periodEnd ?? null,
},
};
}

if (annual && annual > 0) {
basis = "salaried";
dailyRate = annual / (WEEKS_PER_YEAR * DAYS_PER_WEEK);
} else if (hourly && hourly > 0 && hoursPerWeek && hoursPerWeek > 0) {
basis = "hourly";
const weekly = hourly * hoursPerWeek;
dailyRate = weekly / DAYS_PER_WEEK;
} else {
basis = "unknown";
dailyRate = 0;
}

const rawAmount = dailyRate * daysOfLeave;
const amount = Number.isFinite(rawAmount)
? Math.round(rawAmount * 100) / 100
: 0;

return {
amount,
dailyRate,
meta: {
basis,
weeksPerYear: WEEKS_PER_YEAR,
daysPerWeek: DAYS_PER_WEEK,
rawAmount,
daysOfLeave,
frequency: input.frequency ?? null,
periodStart: input.periodStart ?? null,
periodEnd: input.periodEnd ?? null,
},
};
}