// lib/payroll/types.ts
// Minimal type surface to satisfy Preview build. Expand as real calc lands.

export type ISODate = string;

export type PayFrequency =
  | "weekly"
  | "fortnightly"
  | "fourweekly"
  | "monthly"
  | "flex_monthly"
  | "quarterly";

export type NiCategory =
  | "A" | "B" | "C" | "H" | "J" | "M" | "Z"
  | "A0" | "A1" | "A2" | "A3"; // keep loose for preview

export type StudentLoanPlan = "none" | "plan1" | "plan2" | "plan4" | "plan5" | "pgl";

export type EarningsItem = {
  code: string;          // e.g. "BASIC", "OT1"
  description?: string;
  amount: number;        // positive GBP
  taxable?: boolean;     // defaults true
  nicable?: boolean;     // defaults true
};

export type DeductionItem = {
  code: string;          // e.g. "PENSION", "ATTACH"
  description?: string;
  amount: number;        // positive GBP
  preTax?: boolean;      // for pension salary sacrifice etc.
  preNI?: boolean;
};

export type CalcInput = {
  employeeId?: string;
  companyId?: string;
  periodId?: string;
  payDate?: ISODate;
  frequency: PayFrequency;

  taxCode?: string;          // e.g. "1257L", "0T"
  niCategory?: NiCategory;   // e.g. "A"
  studentLoan?: StudentLoanPlan;

  earnings: EarningsItem[];
  deductions?: DeductionItem[];

  // optional year-to-date for calc engines that need context
  ytd?: Partial<CalcYTD>;
};

export type CalcLine = {
  code: string;          // e.g. "TAX", "EE_NI", "ER_NI", "BASIC"
  description?: string;
  amount: number;        // signed; positives add to pay, negatives deduct
  unit?: "GBP" | "HOURS" | "DAYS" | string;
  meta?: Record<string, unknown>;
};

export type CalcLines = CalcLine[];

export type CalcTotals = {
  gross: number;         // total gross for the period
  tax: number;           // PAYE tax this period
  eeNi: number;          // employee NI
  erNi: number;          // employer NI
  pensionEE?: number;
  pensionER?: number;
  otherDeductions?: number;
  net: number;           // take-home pay
  employerCost: number;  // gross + ER on-costs
};

export type CalcYTD = {
  gross: number;
  tax: number;
  eeNi: number;
  erNi: number;
  pensionEE?: number;
  pensionER?: number;
  otherDeductions?: number;
};

export type CalcResult = {
  input: CalcInput;
  lines: CalcLines;
  totals: CalcTotals;
  ytd?: CalcYTD;
};
