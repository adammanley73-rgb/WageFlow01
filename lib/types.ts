/* preview: auto-suppressed to keep Preview builds green. */
// lib/types.ts
// Shared payroll type definitions for stubs and preview builds.

export interface CalcInput {
  earnings?: { amount: number }[];
  deductions?: { amount: number }[];
}

export interface CalcResult {
  gross: number;
  net: number;
  tax: number;
  eeNi: number;
  erNi: number;
  pensionEE: number;
  pensionER: number;
}

export interface CalcTotals {
  gross: number;
  deductions: number;
  net: number;
}

export interface CalcLines {
  description: string;
  amount: number;
}

export interface CalcYTD {
  gross: number;
  net: number;
  tax: number;
}
