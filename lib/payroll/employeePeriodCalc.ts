/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\lib\payroll\employeePeriodCalc.ts
//
// Helper to calculate a single employee's pay for one payroll run period,
// using either detailed pay elements or the stored DB totals.
//
// NOTE: This version only derives Gross, Deductions and Net.
// PAYE / NI engines are not wired here yet.

export type NormalisedPayElement = {
  id: string;
  typeId: string;
  code: string;
  name: string;
  side: "earning" | "deduction";
  amount: number;
  taxableForPaye: boolean;
  nicEarnings: boolean;
  pensionable: boolean;
  aeQualifying: boolean;
  isSalarySacrificeType: boolean;
  description: string | null;
};

export type EmployeePeriodCalcInput = {
  // payroll_runs row (kept for future PAYE / NI logic)
  run: any;

  // payroll_run_employees row
  runEmployee: any;

  // employees row (optional for now)
  employee: any | null;

  // Normalised pay elements for this payroll_run_employee_id
  elements: NormalisedPayElement[];
};

export type EmployeePeriodCalcResult = {
  gross: number;
  deductions: number;
  net: number;
  calculationSource: "elements" | "db";
};

function toNumber(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : value == null
      ? 0
      : Number(value);

  return Number.isFinite(n) ? n : 0;
}

/**
 * Calculate gross, deductions and net for an employee in a run.
 *
 * If pay elements are present, we:
 *   - sum all "earning" elements as gross
 *   - sum all "deduction" elements as deductions
 *   - net = gross - deductions
 *
 * If there are no elements, we fall back to the stored
 * payroll_run_employees.gross_pay / net_pay values.
 */
export function calculateEmployeePeriodPay(
  input: EmployeePeriodCalcInput
): EmployeePeriodCalcResult {
  const { runEmployee, elements } = input;

  const hasElements = Array.isArray(elements) && elements.length > 0;

  if (hasElements) {
    const gross = elements
      .filter((e) => e.side === "earning")
      .reduce((sum, e) => sum + toNumber(e.amount), 0);

    const deductions = elements
      .filter((e) => e.side === "deduction")
      .reduce((sum, e) => sum + toNumber(e.amount), 0);

    const net = gross - deductions;

    return {
      gross,
      deductions,
      net,
      calculationSource: "elements",
    };
  }

  // Fallback: use the DB totals if no elements exist
  const gross = toNumber(runEmployee?.gross_pay);
  const net = toNumber(
    runEmployee?.net_pay != null ? runEmployee.net_pay : gross
  );
  const deductions = gross - net;

  return {
    gross,
    deductions,
    net,
    calculationSource: "db",
  };
}
