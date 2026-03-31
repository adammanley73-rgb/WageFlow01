// C:\Projects\wageflow01\lib\payroll\extraPayItems.ts

export type ExtraPayCode =
  | "OT125"
  | "OT150"
  | "OT175"
  | "OT200"
  | "BONUS"
  | "COMM"
  | "BACKPAY"
  | "ALLOW_TAX"
  | "ALLOW_NONTAX";

export type ExtraPayBucket =
  | "overtime_1_25_pay"
  | "overtime_1_50_pay"
  | "overtime_1_75_pay"
  | "overtime_2_00_pay"
  | "bonus_pay"
  | "commission_pay"
  | "backpay_pay"
  | "taxable_allowances"
  | "nontaxable_allowances";

export type ExtraPayDefinition = {
  code: ExtraPayCode;
  label: string;
  bucket: ExtraPayBucket;
  taxableForPaye: boolean;
  nicEarnings: boolean;
  pensionable: boolean;
  aeQualifying: boolean;
};

export const EXTRA_PAY_DEFINITIONS: ExtraPayDefinition[] = [
  {
    code: "OT125",
    label: "OT x 1.25",
    bucket: "overtime_1_25_pay",
    taxableForPaye: true,
    nicEarnings: true,
    pensionable: true,
    aeQualifying: true,
  },
  {
    code: "OT150",
    label: "OT x 1.5",
    bucket: "overtime_1_50_pay",
    taxableForPaye: true,
    nicEarnings: true,
    pensionable: true,
    aeQualifying: true,
  },
  {
    code: "OT175",
    label: "OT x 1.75",
    bucket: "overtime_1_75_pay",
    taxableForPaye: true,
    nicEarnings: true,
    pensionable: true,
    aeQualifying: true,
  },
  {
    code: "OT200",
    label: "OT x 2",
    bucket: "overtime_2_00_pay",
    taxableForPaye: true,
    nicEarnings: true,
    pensionable: true,
    aeQualifying: true,
  },
  {
    code: "BONUS",
    label: "Bonus",
    bucket: "bonus_pay",
    taxableForPaye: true,
    nicEarnings: true,
    pensionable: true,
    aeQualifying: true,
  },
  {
    code: "COMM",
    label: "Commission",
    bucket: "commission_pay",
    taxableForPaye: true,
    nicEarnings: true,
    pensionable: true,
    aeQualifying: true,
  },
  {
    code: "BACKPAY",
    label: "Backpay",
    bucket: "backpay_pay",
    taxableForPaye: true,
    nicEarnings: true,
    pensionable: true,
    aeQualifying: true,
  },
  {
    code: "ALLOW_TAX",
    label: "Taxable allowance",
    bucket: "taxable_allowances",
    taxableForPaye: true,
    nicEarnings: true,
    pensionable: true,
    aeQualifying: true,
  },
  {
    code: "ALLOW_NONTAX",
    label: "Non-taxable allowance",
    bucket: "nontaxable_allowances",
    taxableForPaye: false,
    nicEarnings: false,
    pensionable: false,
    aeQualifying: false,
  },
];

export const EXTRA_PAY_CODES: ExtraPayCode[] = EXTRA_PAY_DEFINITIONS.map((x) => x.code);

export const EXTRA_PAY_CODE_SET = new Set<string>(EXTRA_PAY_CODES);

export const EXTRA_PAY_BUCKET_BY_CODE: Record<ExtraPayCode, ExtraPayBucket> =
  EXTRA_PAY_DEFINITIONS.reduce(
    (acc, def) => {
      acc[def.code] = def.bucket;
      return acc;
    },
    {} as Record<ExtraPayCode, ExtraPayBucket>
  );

export function isExtraPayCode(value: unknown): value is ExtraPayCode {
  return EXTRA_PAY_CODE_SET.has(String(value ?? "").trim().toUpperCase());
}

export function getExtraPayDefinition(code: unknown): ExtraPayDefinition | null {
  const upper = String(code ?? "").trim().toUpperCase();
  return EXTRA_PAY_DEFINITIONS.find((x) => x.code === upper) ?? null;
}

export function getEditableExtraPayTypesForUi() {
  return EXTRA_PAY_DEFINITIONS.map((x) => ({
    code: x.code,
    label: x.label,
  }));
}
