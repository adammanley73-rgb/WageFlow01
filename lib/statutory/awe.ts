// C:\Projects\wageflow01\lib\statutory\awe.ts

// Pages use these shapes. Make them permissive.
export type PayItem = {
  paidOn?: string;
  gross?: number;
  ref?: string;
  date?: string;
  amount?: number;
  type?: string;
};

// Some statutory modules import this type name.
export type AweResult = {
  awe: number; // average weekly earnings (weekly)
  qualifyingWeekSaturday?: string;
  items?: PayItem[];
  warnings?: string[];
  debug?: Record<string, unknown> | null;
};

export function calculateAWE(_items: PayItem[] = []): number {
  return 0;
}

// Used by SAP, SMP, ShPP — returns a full AweResult so callers can access .awe
export function calcAWEforFamily(items: PayItem[] = [], qwSaturday?: string): AweResult {
  return {
    awe: 0,
    qualifyingWeekSaturday: qwSaturday,
    items,
    warnings: [],
    debug: null,
  };
}

// Used by SSP — separate function so SSP can pass a different reference date
export function calcAWEforSSP(items: PayItem[] = [], referenceDate?: string): AweResult {
  return {
    awe: 0,
    qualifyingWeekSaturday: referenceDate,
    items,
    warnings: [],
    debug: null,
  };
}

// Optional helper if any module wants a structured result directly by name
export function calcAWEforFamilyResult(items: PayItem[] = [], qwSaturday?: string): AweResult {
  return calcAWEforFamily(items, qwSaturday);
}