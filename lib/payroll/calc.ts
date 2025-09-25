// lib/payroll/calc.ts
// Self-contained preview stub: inline types to avoid import resolution errors.

export interface Earning {
  amount: number;
  code?: string;
  description?: string;
}

export interface Deduction {
  amount: number;
  code?: string;
  description?: string;
}

export interface CalcInput {
  earnings?: Earning[];
  deductions?: Deduction[];
  ytd?: {
    gross?: number;
    tax?: number;
    eeNi?: number;
    erNi?: number;
    pensionEE?: number;
    pensionER?: number;
    otherDeductions?: number;
  };
}

export interface CalcTotals {
  gross: number;
  tax: number;
  eeNi: number;
  erNi: number;
  pensionEE: number;
  pensionER: number;
  otherDeductions: number;
  net: number;
  employerCost: number;
}

export interface CalcLine {
  code: string;
  description?: string;
  amount: number;
  unit?: "GBP" | "HOURS" | "DAYS" | string;
}

export type CalcLines = CalcLine[];

export interface CalcYTD {
  gross: number;
  tax: number;
  eeNi: number;
  erNi: number;
  pensionEE?: number;
  pensionER?: number;
  otherDeductions?: number;
}

export interface CalcResult {
  input: CalcInput;
  lines: CalcLines;
  totals: CalcTotals;
  ytd: CalcYTD;
}

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function calculate(input: CalcInput): CalcResult {
  const earnings = input.earnings ?? [];
  const deductions = input.deductions ?? [];

  const gross = round2(earnings.reduce((s, e) => s + (e?.amount ?? 0), 0));
  const otherDeductions = round2(deductions.reduce((s, d) => s + (d?.amount ?? 0), 0));

  const tax = 0;
  const eeNi = 0;
  const erNi = 0;
  const pensionEE = 0;
  const pensionER = 0;

  const net = round2(gross - tax - eeNi - pensionEE - otherDeductions);
  const employerCost = round2(gross + erNi + pensionER);

  const totals: CalcTotals = {
    gross,
    tax,
    eeNi,
    erNi,
    pensionEE,
    pensionER,
    otherDeductions,
    net,
    employerCost
  };

  const lines: CalcLines = [
    ...earnings.map(e => ({
      code: e.code || "EARN",
      description: e.description || "Earnings",
      amount: round2(e.amount ?? 0),
      unit: "GBP"
    })),
    ...(otherDeductions
      ? [{ code: "OTHER_DEDUCTIONS", description: "Other deductions", amount: -otherDeductions, unit: "GBP" }]
      : []),
    ...(tax ? [{ code: "TAX", description: "PAYE tax", amount: -tax, unit: "GBP" }] : []),
    ...(eeNi ? [{ code: "EE_NI", description: "Employee NI", amount: -eeNi, unit: "GBP" }] : []),
    ...(erNi ? [{ code: "ER_NI", description: "Employer NI", amount: erNi, unit: "GBP" }] : [])
  ];

  const ytdIn = input.ytd ?? {};
  const ytd: CalcYTD = {
    gross: round2((ytdIn.gross ?? 0) + gross),
    tax: round2((ytdIn.tax ?? 0) + tax),
    eeNi: round2((ytdIn.eeNi ?? 0) + eeNi),
    erNi: round2((ytdIn.erNi ?? 0) + erNi),
    pensionEE: round2((ytdIn.pensionEE ?? 0) + pensionEE),
    pensionER: round2((ytdIn.pensionER ?? 0) + pensionER),
    otherDeductions: round2((ytdIn.otherDeductions ?? 0) + otherDeductions)
  };

  return { input, lines, totals, ytd };
}

export default calculate;
