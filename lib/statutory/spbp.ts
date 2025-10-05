/**
 * Stub SPBP helper for preview builds.
 * Exports calcSPBP to satisfy import.
 */
export type SpbpInput = {
  awe?: number;
  weeklyEarnings?: number;
  days?: number;
  taxYear?: string;
  startDate?: string;
};

export type SpbpResult = {
  eligible: boolean;
  dailyRate: number;
  days: number;
  gross: number;
  notes: string[];
};

export function calcSPBP(input: SpbpInput = {}): SpbpResult {
  const days =
    typeof input.days === 'number' && input.days > 0
      ? Math.min(10, input.days)
      : 10;
  const awe =
    typeof input.awe === 'number' && input.awe > 0
      ? input.awe
      : typeof input.weeklyEarnings === 'number' && input.weeklyEarnings > 0
      ? input.weeklyEarnings
      : NaN;
  const daily = Number.isFinite(awe) ? Math.min(awe / 7, 30) : 30;
  const gross = Number((daily * days).toFixed(2));
  return {
    eligible: true,
    dailyRate: Number(daily.toFixed(2)),
    days,
    gross,
    notes: [
      'preview-stub: eligibility forced true',
      `taxYear=${input.taxYear ?? 'unspecified'}`,
      `startDate=${input.startDate ?? 'ignored-in-preview'}`,
    ],
  };
}

const spbp = { calcSPBP };
export default spbp;
