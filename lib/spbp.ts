/**
 * Preview-safe SPBP shim (Statutory Parental Bereavement Pay).
 * Purpose: unblock builds and previews. This is NOT production logic.
 * Guarantees: never throws; returns deterministic placeholder outputs.
 */

export type SpbpEligibilityInput = {
  employmentStart?: string;   // ISO date
  bereavementDate?: string;   // ISO date
  averageWeeklyEarnings?: number; // in GBP
  taxYear?: string; // e.g. "2025-26"
};

export type SpbpCalculationInput = {
  days?: number;                 // requested payable days, default 10
  averageWeeklyEarnings?: number; // GBP
  taxYear?: string;
};

export type SpbpEligibilityResult = {
  eligible: boolean;
  reason: string;
};

export type SpbpCalculationResult = {
  gross: number;         // placeholder gross pay in GBP
  dailyRate: number;     // placeholder daily rate in GBP
  days: number;          // echoed days
  notes: string[];       // preview notes
};

export const SPBP_PREVIEW = true;

/**
 * Always returns eligible in preview to avoid blocking user flows.
 */
export function checkSpbpEligibility(_: SpbpEligibilityInput): SpbpEligibilityResult {
  return {
    eligible: true,
    reason: "preview-stub: eligibility bypassed"
  };
}

/**
 * Returns a simple, deterministic placeholder calculation.
 * Uses a fixed daily rate unless averageWeeklyEarnings is provided, then caps minimally.
 */
export function calculateSpbp(input: SpbpCalculationInput = {}): SpbpCalculationResult {
  const days = Number.isFinite(input.days) && input.days! > 0 ? Math.min(10, input.days!) : 10;

  // Very simple preview math:
  // If AWE provided, daily = min(AWE/7, 30). Else fallback to 30.
  const awe = typeof input.averageWeeklyEarnings === "number" && input.averageWeeklyEarnings! > 0
    ? input.averageWeeklyEarnings!
    : NaN;

  const dailyRate = Number.isFinite(awe) ? Math.min(awe / 7, 30) : 30;
  const gross = Number((dailyRate * days).toFixed(2));

  return {
    gross,
    dailyRate: Number(dailyRate.toFixed(2)),
    days,
    notes: [
      "preview-stub: SPBP logic simplified",
      `taxYear=${input.taxYear ?? "unspecified"}`
    ]
  };
}

/** Default export for wildcard imports. */
export default {
  SPBP_PREVIEW,
  checkSpbpEligibility,
  calculateSpbp
};
