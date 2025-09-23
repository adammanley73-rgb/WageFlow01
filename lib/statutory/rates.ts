// Centralised statutory payment rates by tax year.
// 2024–25 and 2025–26 covered. Update annually in one place.

export type TaxYear = '2024-25' | '2025-26';

export type FamilyPaymentType =
  | 'SMP'   // Statutory Maternity Pay
  | 'SAP'   // Statutory Adoption Pay
  | 'SPP'   // Statutory Paternity Pay
  | 'ShPP'  // Shared Parental Pay
  | 'SPBP'  // Statutory Parental Bereavement Pay
  | 'SNCP'; // Statutory Neonatal Care Pay (same weekly rate banding)

export interface StatutoryRates {
  // Weekly rate for all “family” statutory payments when not using % of AWE
  familyWeekly: number;
  // Weekly rate for SSP
  sspWeekly: number;
  // NI Lower Earnings Limit used for statutory eligibility checks
  lelWeekly: number;
}

export const RATES: Record<TaxYear, StatutoryRates> = {
  '2024-25': {
    familyWeekly: 184.03, // SMP/SAP/SPP/ShPP/SPBP weekly rate
    sspWeekly: 116.75,
    lelWeekly: 123.0,
  },
  '2025-26': {
    familyWeekly: 187.18, // SMP/SAP/SPP/ShPP/SPBP/SNCP weekly rate
    sspWeekly: 118.75,
    lelWeekly: 125.0,
  },
};

// Determine tax year by UK tax-year boundary (6 April).
export function detectTaxYear(d: Date = new Date()): TaxYear {
  const year = d.getUTCFullYear();
  const isOnOrAfter6April = (m: number, day: number) =>
    (d.getUTCMonth() > 3) || (d.getUTCMonth() === 3 && d.getUTCDate() >= day);

  // If date is on/after 6 April of current calendar year, tax year is `${year}-${(year + 1) % 100}`
  // else it’s previous year.
  if (isOnOrAfter6April(3, 6)) {
    return (year === 2025 ? '2025-26' : '2024-25');
  } else {
    return (year - 1 === 2024 ? '2024-25' : '2024-25');
  }
}

// Get rates for an explicit or detected tax year.
export function getRates(taxYear?: TaxYear, onDate?: Date): StatutoryRates {
  const ty = taxYear ?? detectTaxYear(onDate);
  return RATES[ty];
}

// Convenience helpers
export function familyWeeklyRate(taxYear?: TaxYear, onDate?: Date): number {
  return getRates(taxYear, onDate).familyWeekly;
}

export function sspWeeklyRate(taxYear?: TaxYear, onDate?: Date): number {
  return getRates(taxYear, onDate).sspWeekly;
}

export function lowerEarningsLimitWeekly(taxYear?: TaxYear, onDate?: Date): number {
  return getRates(taxYear, onDate).lelWeekly;
}
