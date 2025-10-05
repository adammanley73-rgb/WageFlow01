/**
 * Minimal SPBP helpers so absence pages compile.
 * SPBP = Statutory Parental Bereavement Pay (UK).
 */

export type SpbpEligibilityInput = {
  averageWeeklyEarnings?: number; // AWE
  employmentWeeks?: number; // continuous employment weeks
  taxYear?: string; // e.g. '2025-26'
};

export type SpbpCalculationInput = {
  weeks?: number; // 1 or 2 weeks typically
  awe?: number; // average weekly earnings
  statutoryWeeklyRate?: number; // statutory cap for the tax year
};

export type SpbpResult = {
  weeklyRate: number;
  total: number;
};

export function getSpbpStatutoryWeeklyRate(taxYear?: string): number {
  // Placeholder. Update when you wire real rates.
  // Keep non-zero to avoid divide-by-zero logic elsewhere.
  return 184.03;
}

export function isEligibleSpbp(input: SpbpEligibilityInput): boolean {
  const weeks = input.employmentWeeks ?? 26;
  const awe = input.averageWeeklyEarnings ?? 200;
  return weeks >= 26 && awe > 0;
}

export function calculateSpbp(input: SpbpCalculationInput): SpbpResult {
  const weeks = input.weeks ?? 1;
  const awe = input.awe ?? 200;
  const cap = input.statutoryWeeklyRate ?? getSpbpStatutoryWeeklyRate();
  const weeklyRate = Math.min(cap, 0.9 * awe);
  return {
    weeklyRate: round2(weeklyRate),
    total: round2(weeklyRate * Math.max(1, Math.min(2, weeks))),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const spbp = {
  getSpbpStatutoryWeeklyRate,
  isEligibleSpbp,
  calculateSpbp,
};

export default spbp;
