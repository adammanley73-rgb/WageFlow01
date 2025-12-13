/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\lib\statutory\sspRates.ts
//
// Single source of truth for Statutory Sick Pay (SSP) rates.
// The rest of the engine should import from here, not hard-code numbers.

/**
 * Configuration for SSP for the current tax year.
 *
 * NOTE:
 * - If/when HMRC changes the SSP rate, update this object.
 * - Qualifying days per week is 5 under the standard Mon–Fri pattern.
 */
export const SSP_CONFIG_2025_26 = {
  taxYear: "2025-26",
  weeklyRate: 118.75, // £ per week
  qualifyingDaysPerWeek: 5,
};

/**
 * Return the SSP weekly rate for the current tax year.
 * If you ever add multiple years, this can accept a date / tax year.
 */
export function getSspWeeklyRate(): number {
  return SSP_CONFIG_2025_26.weeklyRate;
}

/**
 * Return the SSP daily rate for the standard Mon–Fri pattern.
 *
 * For 2025–26:
 *   weeklyRate = 118.75
 *   qualifyingDaysPerWeek = 5
 *   dailyRate = 118.75 / 5 = 23.75
 *
 * We round to 2 decimal places to avoid floating-point noise leaking
 * into payslip output.
 */
export function getSspDailyRate(): number {
  const { weeklyRate, qualifyingDaysPerWeek } = SSP_CONFIG_2025_26;
  if (!qualifyingDaysPerWeek || qualifyingDaysPerWeek <= 0) {
    throw new Error("SSP config mis-configured: qualifyingDaysPerWeek must be > 0");
  }
  const raw = weeklyRate / qualifyingDaysPerWeek;
  return Math.round(raw * 100) / 100;
}
