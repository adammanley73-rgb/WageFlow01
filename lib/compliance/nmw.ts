/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\lib\compliance\nmw.ts
//
// National Minimum Wage / National Living Wage helper.
// Uses HMRC published rates.
// Source: "National Minimum Wage and National Living Wage rates" on GOV.UK.

/**
 * NMW bands we care about.
 *
 * 21_AND_OVER  -> National Living Wage
 * 18_TO_20     -> NMW 18 to 20
 * UNDER_18     -> NMW under 18
 * APPRENTICE   -> Apprentice rate (under 19 OR 19+ in first year)
 */
export type NmwBand = "21_AND_OVER" | "18_TO_20" | "UNDER_18" | "APPRENTICE";

type NmwRateSet = {
  effectiveFrom: string; // YYYY-MM-DD
  bands: {
    "21_AND_OVER": number;
    "18_TO_20": number;
    "UNDER_18": number;
    "APPRENTICE": number;
  };
};

/**
 * HMRC rates by effective date.
 *
 * Current published values (all hourly):
 *
 * From 1 April 2024
 *  - 21 and over: £11.44
 *  - 18 to 20: £8.60
 *  - Under 18: £6.40
 *  - Apprentice: £6.40
 *
 * From 1 April 2025
 *  - 21 and over: £12.21
 *  - 18 to 20: £10.00
 *  - Under 18: £7.55
 *  - Apprentice: £7.55
 *
 * From 1 April 2026
 *  - 21 and over: £12.71
 *  - 18 to 20: £10.85
 *  - Under 18: £8.00
 *  - Apprentice: £8.00
 */
const NMW_RATE_TABLE: NmwRateSet[] = [
  {
    effectiveFrom: "2024-04-01",
    bands: {
      "21_AND_OVER": 11.44,
      "18_TO_20": 8.6,
      "UNDER_18": 6.4,
      "APPRENTICE": 6.4,
    },
  },
  {
    effectiveFrom: "2025-04-01",
    bands: {
      "21_AND_OVER": 12.21,
      "18_TO_20": 10,
      "UNDER_18": 7.55,
      "APPRENTICE": 7.55,
    },
  },
  {
    effectiveFrom: "2026-04-01",
    bands: {
      "21_AND_OVER": 12.71,
      "18_TO_20": 10.85,
      "UNDER_18": 8,
      "APPRENTICE": 8,
    },
  },
];

/**
 * Context needed to decide which NMW rate should apply.
 *
 * referenceDate       -> usually the employment start date or pay period start
 * ageYears            -> age at the reference date
 * isApprentice        -> true if this worker is on an apprenticeship
 * apprenticeshipYear  -> 1 for first year, 2+ afterwards
 */
export type NmwContext = {
  referenceDate?: string | Date | null;
  ageYears: number;
  isApprentice: boolean;
  apprenticeshipYear?: number | null;
};

/**
 * Internal: normalise a date input.
 */
function normaliseDate(value?: string | Date | null): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
}

/**
 * Find the correct rate set for a given reference date.
 * Picks the latest entry whose effectiveFrom <= referenceDate.
 */
export function getNmwRateSetForDate(
  referenceDate?: string | Date | null
): NmwRateSet {
  const ref = normaliseDate(referenceDate);
  let chosen = NMW_RATE_TABLE[0];

  for (const entry of NMW_RATE_TABLE) {
    const eff = new Date(entry.effectiveFrom + "T00:00:00Z");
    if (eff.getTime() <= ref.getTime()) {
      chosen = entry;
    }
  }

  return chosen;
}

/**
 * Decide which NMW band applies using HMRC apprentice rules.
 *
 * Apprentice rate applies if:
 *  - aged under 19, OR
 *  - aged 19 or over and in the first year of their apprenticeship.
 *
 * Otherwise band is based on age:
 *  - 21_AND_OVER for age >= 21
 *  - 18_TO_20 for age 18 to 20
 *  - UNDER_18 for age < 18
 */
export function getNmwBandForEmployee(ctx: NmwContext): NmwBand {
  const age = Number.isFinite(ctx.ageYears) ? ctx.ageYears : 0;
  const isApprentice = !!ctx.isApprentice;
  const apprenticeshipYear =
    typeof ctx.apprenticeshipYear === "number"
      ? ctx.apprenticeshipYear
      : null;

  if (isApprentice) {
    const apprenticeRateApplies =
      age < 19 || (age >= 19 && apprenticeshipYear === 1);
    if (apprenticeRateApplies) {
      return "APPRENTICE";
    }
  }

  if (age >= 21) return "21_AND_OVER";
  if (age >= 18) return "18_TO_20";
  return "UNDER_18";
}

/**
 * Returns the NMW hourly rate that applies for the given context.
 */
export function getNmwRate(ctx: NmwContext): number {
  const band = getNmwBandForEmployee(ctx);
  const rateSet = getNmwRateSetForDate(ctx.referenceDate);
  return rateSet.bands[band];
}

/**
 * Simple age calculation from dates.
 * Used later when wiring into the New Employee form.
 */
export function calculateAgeYears(
  dateOfBirth: string | Date | null,
  referenceDate?: string | Date | null
): number {
  if (!dateOfBirth) return 0;

  const dob =
    dateOfBirth instanceof Date ? dateOfBirth : new Date(String(dateOfBirth));
  if (Number.isNaN(dob.getTime())) return 0;

  const ref = normaliseDate(referenceDate);
  let age = ref.getFullYear() - dob.getFullYear();

  const refMonth = ref.getMonth();
  const refDay = ref.getDate();
  const dobMonth = dob.getMonth();
  const dobDay = dob.getDate();

  if (refMonth < dobMonth || (refMonth === dobMonth && refDay < dobDay)) {
    age = age - 1;
  }

  if (!Number.isFinite(age) || age < 0) return 0;
  return age;
}
