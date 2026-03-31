// C:\Projects\wageflow01\lib\payroll\extraPayBuckets.ts

import { EXTRA_PAY_BUCKET_BY_CODE, type ExtraPayBucket } from "@/lib/payroll/extraPayItems";

export type ExtraPayTotals = {
  overtime_1_25_pay: number;
  overtime_1_50_pay: number;
  overtime_1_75_pay: number;
  overtime_2_00_pay: number;
  overtime_pay: number;
  bonus_pay: number;
  commission_pay: number;
  backpay_pay: number;
  taxable_allowances: number;
  nontaxable_allowances: number;
  other_earnings: number;
};

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function createEmptyExtraPayTotals(): ExtraPayTotals {
  return {
    overtime_1_25_pay: 0,
    overtime_1_50_pay: 0,
    overtime_1_75_pay: 0,
    overtime_2_00_pay: 0,
    overtime_pay: 0,
    bonus_pay: 0,
    commission_pay: 0,
    backpay_pay: 0,
    taxable_allowances: 0,
    nontaxable_allowances: 0,
    other_earnings: 0,
  };
}

function addToBucket(totals: ExtraPayTotals, bucket: ExtraPayBucket, amount: number) {
  totals[bucket] = round2((totals[bucket] || 0) + amount);
}

export function applyExtraPayCodeToTotals(
  totals: ExtraPayTotals,
  codeRaw: unknown,
  amountRaw: unknown
): ExtraPayTotals {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  const amount = round2(Number(amountRaw ?? 0));

  if (!(amount > 0)) return totals;

  if (code === "COMMISSION") {
    addToBucket(totals, "commission_pay", amount);
    totals.overtime_pay = round2(
      totals.overtime_1_25_pay +
        totals.overtime_1_50_pay +
        totals.overtime_1_75_pay +
        totals.overtime_2_00_pay
    );
    return totals;
  }

  const mapped = EXTRA_PAY_BUCKET_BY_CODE[code as keyof typeof EXTRA_PAY_BUCKET_BY_CODE];

  if (mapped) {
    addToBucket(totals, mapped, amount);
  } else {
    totals.other_earnings = round2(totals.other_earnings + amount);
  }

  totals.overtime_pay = round2(
    totals.overtime_1_25_pay +
      totals.overtime_1_50_pay +
      totals.overtime_1_75_pay +
      totals.overtime_2_00_pay
  );

  return totals;
}

export function finaliseExtraPayTotals(totals: ExtraPayTotals): ExtraPayTotals {
  return {
    ...totals,
    overtime_1_25_pay: round2(totals.overtime_1_25_pay),
    overtime_1_50_pay: round2(totals.overtime_1_50_pay),
    overtime_1_75_pay: round2(totals.overtime_1_75_pay),
    overtime_2_00_pay: round2(totals.overtime_2_00_pay),
    overtime_pay: round2(
      totals.overtime_1_25_pay +
        totals.overtime_1_50_pay +
        totals.overtime_1_75_pay +
        totals.overtime_2_00_pay
    ),
    bonus_pay: round2(totals.bonus_pay),
    commission_pay: round2(totals.commission_pay),
    backpay_pay: round2(totals.backpay_pay),
    taxable_allowances: round2(totals.taxable_allowances),
    nontaxable_allowances: round2(totals.nontaxable_allowances),
    other_earnings: round2(totals.other_earnings),
  };
}
