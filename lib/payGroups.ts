/* preview: auto-suppressed to keep Preview builds green. */
// lib/payGroups.ts
// Preloaded Pay Groups + helpers to suggest compliant hourly rates (UK, from 1 Apr 2025)

export type PayPeriod = 'Monthly' | 'Weekly' | 'Fortnightly';
export type RateType = 'salary' | 'hourly';

export type PayGroup = {
  id: string;
  name: 'Monthly Salaried' | 'Weekly Hourly' | 'Apprentices' | 'Casual Workers';
  rateType: RateType;
  defaultHoursPerWeek?: number;
  defaultPayPeriod: PayPeriod;
  note?: string;
};

// Preloaded groups
export const PAY_GROUPS: PayGroup[] = [
  {
    id: 'monthly-salaried',
    name: 'Monthly Salaried',
    rateType: 'salary',
    defaultHoursPerWeek: 37.5,
    defaultPayPeriod: 'Monthly',
    note: 'Salaried employees paid monthly.',
  },
  {
    id: 'weekly-hourly',
    name: 'Weekly Hourly',
    rateType: 'hourly',
    defaultHoursPerWeek: 37.5,
    defaultPayPeriod: 'Weekly',
    note: 'Hourly staff paid weekly. Uses age-based minimum wage.',
  },
  {
    id: 'apprentices',
    name: 'Apprentices',
    rateType: 'hourly',
    defaultHoursPerWeek: 37.5,
    defaultPayPeriod: 'Monthly',
    note: 'Apprentice rate if under 19, or 19+ in first year. Otherwise age rate.',
  },
  {
    id: 'casual-workers',
    name: 'Casual Workers',
    rateType: 'hourly',
    defaultHoursPerWeek: 0,
    defaultPayPeriod: 'Weekly',
    note: 'Ad hoc hours. Uses age-based minimum wage.',
  },
];

// ---------- 2025 statutory minimums (effective 1 Apr 2025) ----------
const NMW_21_PLUS = 12.21; // National Living Wage (21+)
const NMW_18_20 = 10.0;
const NMW_UNDER_18 = 7.55;
const APPRENTICE_RATE = 7.55;

/** Calculate age in years from an ISO date string (yyyy-mm-dd). Returns null if invalid. */
export function calcAge(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

/** Minimum hourly rate by age (2025). */
export function minWageByAge2025(age: number | null): number {
  if (age == null) return NMW_UNDER_18; // conservative low default until DOB entered
  if (age >= 21) return NMW_21_PLUS;
  if (age >= 18) return NMW_18_20;
  return NMW_UNDER_18;
}

/** Apprentice minimum hourly rate (2025). */
export function apprenticeRate2025(): number {
  return APPRENTICE_RATE;
}

/**
 * Suggest a compliant hourly rate for the selected group.
 * - Apprentices: if under 19 or (19+ and in first year) => apprentice rate; else age-based rate.
 * - Hourly groups (weekly hourly, casual): age-based rate.
 * - Salaried group returns null.
 */
export function suggestHourlyRate2025(params: {
  groupId: string;
  dob?: string | null;
  apprenticeFirstYear?: boolean;
}): number | null {
  const age = calcAge(params.dob ?? null);
  switch (params.groupId) {
    case 'apprentices': {
      const isUnder19 = age != null && age < 19;
      const inFirstYear = !!params.apprenticeFirstYear;
      if (isUnder19 || inFirstYear) return apprenticeRate2025();
      return minWageByAge2025(age);
    }
    case 'weekly-hourly':
    case 'casual-workers':
      return minWageByAge2025(age);
    case 'monthly-salaried':
    default:
      return null;
  }
}

/** Find group by id (safe). */
export function getGroup(id: string | undefined | null): PayGroup | undefined {
  return PAY_GROUPS.find((g) => g.id === id);
}
