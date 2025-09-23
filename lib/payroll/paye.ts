// lib/payroll/paye.ts
// PAYE v1 monthly engine (rUK bands). No NI here. Node 20 + TS.
// Supports: 1257L cumulative, 1257L W1/M1, BR, D0.
// Year: default tax year bands/allowances for 2025/26 (same as 2024/25).
// Personal Allowance tapers above £100,000 toward £125,140 (handled).

export type TaxCodeKind = 'STD' | 'BR' | 'D0';
export type Basis = 'CUMULATIVE' | 'NON_CUMULATIVE'; // NON_CUMULATIVE = W1/M1

export interface PayeInputs {
  grossForPeriod: number;               // this month’s gross taxable pay
  taxCode: string;                      // e.g. "1257L", "1257L M1", "BR", "D0"
  period: number;                       // 1..12 within the tax year for monthly payroll
  ytdTaxableBeforeThisPeriod?: number;  // cumulative taxable pay before this period (only used for CUMULATIVE)
  ytdTaxPaidBeforeThisPeriod?: number;  // cumulative tax paid before this period (only used for CUMULATIVE)
  taxYear?: number;                     // starting year of tax year, e.g. 2025 for 2025/26. Default auto from today.
}

export interface BandSlice {
  rate: number;          // 0.20, 0.40, 0.45
  amount: number;        // amount taxed at this rate in this calculation
  tax: number;           // amount * rate
  label: 'basic' | 'higher' | 'additional';
}

export interface PayeResult {
  codeParsed: {
    kind: TaxCodeKind;
    basis: Basis;
    allowanceAnnual: number;  // before taper
  };
  periodFacts: {
    period: number;
    allowanceToDate: number;  // cumulative allowance used in calc
    basicBandToDate: number;  // cumulative band ceilings
    higherBandToDate: number;
    monthlyAllowance: number; // single-period allowance used if NON_CUMULATIVE
    monthlyBasicBand: number;
    monthlyHigherBand: number;
  };
  taxableThisPeriod: number;   // period gross minus period allowance used in calc basis
  taxThisPeriod: number;       // rounded to 2dp
  taxToDate?: number;          // for cumulative
  slices: BandSlice[];         // breakdown for the period calculation
}

const TWO_DP = (n: number) => Math.round(n * 100) / 100;

// rUK constants (England, Wales, NI). Scotland not handled in v1.
export interface TaxYearConfig {
  personalAllowanceAnnual: number; // £12,570
  basicLimitAnnual: number;        // basic rate band size £37,700
  higherLimitAnnual: number;       // to £125,140 total income where additional starts
  basicRate: number;               // 0.20
  higherRate: number;              // 0.40
  additionalRate: number;          // 0.45
  additionalThresholdAnnual: number; // £125,140
  taperStartAnnual: number;          // £100,000
  taperEndAnnual: number;            // £125,140
}

export const DEFAULT_CONFIG_2025_26: TaxYearConfig = {
  personalAllowanceAnnual: 12570,
  basicLimitAnnual: 37700,
  higherLimitAnnual: 125140, // not directly used as a band size; used as additional threshold
  basicRate: 0.20,
  higherRate: 0.40,
  additionalRate: 0.45,
  additionalThresholdAnnual: 125140,
  taperStartAnnual: 100000,
  taperEndAnnual: 125140,
};

function chooseConfig(_taxYear?: number): TaxYearConfig {
  // If you want per-year switching later, inspect taxYear here.
  return DEFAULT_CONFIG_2025_26;
}

function parseCode(raw: string): { kind: TaxCodeKind; basis: Basis; allowanceAnnual: number } {
  const code = raw.trim().toUpperCase().replace(/\s+/g, ' ');
  // Basis
  const basis: Basis = /\b(W1|M1)\b/.test(code) ? 'NON_CUMULATIVE' : 'CUMULATIVE';

  // BR
  if (code.startsWith('BR')) {
    return { kind: 'BR', basis, allowanceAnnual: 0 };
  }
  // D0
  if (code.startsWith('D0')) {
    return { kind: 'D0', basis, allowanceAnnual: 0 };
  }
  // Standard numeric + L (e.g., 1257L)
  const m = code.match(/^(\d{1,4})L(?:\s+(?:W1|M1))?$/);
  if (m) {
    const num = parseInt(m[1], 10);
    // HMRC rule: allowance = codeNumber * 10
    const allowance = num * 10;
    return { kind: 'STD', basis, allowanceAnnual: allowance };
  }
  // Fallback: treat as BR if unknown
  return { kind: 'BR', basis, allowanceAnnual: 0 };
}

// Personal allowance taper for high income
function taperedAllowance(allowanceAnnual: number, totalIncomeAnnualToDate: number, cfg: TaxYearConfig): number {
  if (totalIncomeAnnualToDate <= cfg.taperStartAnnual) return allowanceAnnual;
  if (totalIncomeAnnualToDate >= cfg.taperEndAnnual) return 0;
  const excess = totalIncomeAnnualToDate - cfg.taperStartAnnual;
  const reduction = Math.floor(excess / 2); // £1 allowance lost per £2 income
  const tapered = Math.max(0, allowanceAnnual - reduction);
  return tapered;
}

function cumulativeProRata(valueAnnual: number, period: number): number {
  return (valueAnnual * period) / 12;
}

function monthlyProRata(valueAnnual: number): number {
  return valueAnnual / 12;
}

// Progressive tax given a taxable amount and cumulative band ceilings
function calcSlicesProgressive(
  taxableAmount: number,
  basicBandLimit: number,
  higherBandLimit: number,
  cfg: TaxYearConfig
): { tax: number; slices: BandSlice[] } {
  const slices: BandSlice[] = [];
  let remaining = Math.max(0, taxableAmount);
  let taxed = 0;

  // Basic slice up to basicBandLimit
  const basicAmt = Math.min(remaining, Math.max(0, basicBandLimit));
  if (basicAmt > 0) {
    const t = TWO_DP(basicAmt * cfg.basicRate);
    slices.push({ rate: cfg.basicRate, amount: TWO_DP(basicAmt), tax: t, label: 'basic' });
    taxed += t;
    remaining -= basicAmt;
  }

  // Higher slice up to higherBandLimit - basicBandLimit
  const higherBandSpan = Math.max(0, higherBandLimit - basicBandLimit);
  const higherAmt = Math.min(remaining, higherBandSpan);
  if (higherAmt > 0) {
    const t = TWO_DP(higherAmt * cfg.higherRate);
    slices.push({ rate: cfg.higherRate, amount: TWO_DP(higherAmt), tax: t, label: 'higher' });
    taxed += t;
    remaining -= higherAmt;
  }

  // Additional rate for anything above higherBandLimit
  if (remaining > 0) {
    const t = TWO_DP(remaining * cfg.additionalRate);
    slices.push({ rate: cfg.additionalRate, amount: TWO_DP(remaining), tax: t, label: 'additional' });
    taxed += t;
    remaining = 0;
  }

  return { tax: TWO_DP(taxed), slices };
}

export function computePAYE(inputs: PayeInputs): PayeResult {
  const {
    grossForPeriod,
    taxCode,
    period,
    ytdTaxableBeforeThisPeriod = 0,
    ytdTaxPaidBeforeThisPeriod = 0,
    taxYear,
  } = inputs;

  if (period < 1 || period > 12) throw new Error('period must be 1..12 for monthly payroll');

  const cfg = chooseConfig(taxYear);
  const parsed = parseCode(taxCode);

  // Pre-calc monthly and cumulative figures
  const monthlyAllowanceBase = monthlyProRata(
    parsed.kind === 'STD' ? parsed.allowanceAnnual : 0
  );
  const monthlyBasicBand = monthlyProRata(cfg.basicLimitAnnual);
  const monthlyHigherBand = monthlyProRata(cfg.additionalThresholdAnnual);

  // For cumulative we also need cumulative allowances and band ceilings to date
  // We also apply taper based on annualised income to date for STD.
  let allowanceToDate = 0;
  if (parsed.kind === 'STD') {
    if (parsed.basis === 'CUMULATIVE') {
      const grossToDate = ytdTaxableBeforeThisPeriod + grossForPeriod; // using taxable proxy as gross to date
      const annualisedIncomeToDate = (grossToDate * 12) / period;
      const taperedAnnual = taperedAllowance(parsed.allowanceAnnual, annualisedIncomeToDate, cfg);
      allowanceToDate = cumulativeProRata(taperedAnnual, period);
    } else {
      const annualisedIncomeThisMonth = grossForPeriod * 12;
      const taperedAnnual = taperedAllowance(parsed.allowanceAnnual, annualisedIncomeThisMonth, cfg);
      // For W1/M1, use monthly slice of tapered allowance
      allowanceToDate = monthlyProRata(taperedAnnual);
    }
  } else {
    allowanceToDate = 0; // BR, D0
  }

  const basicBandToDate = cumulativeProRata(cfg.basicLimitAnnual, parsed.basis === 'CUMULATIVE' ? period : 1);
  const higherBandToDate = cumulativeProRata(cfg.additionalThresholdAnnual, parsed.basis === 'CUMULATIVE' ? period : 1);

  // Strategy by code
  if (parsed.kind === 'BR') {
    const taxable = Math.max(0, grossForPeriod);
    const tax = TWO_DP(taxable * cfg.basicRate);
    return {
      codeParsed: parsed,
      periodFacts: {
        period,
        allowanceToDate: 0,
        basicBandToDate,
        higherBandToDate,
        monthlyAllowance: 0,
        monthlyBasicBand,
        monthlyHigherBand,
      },
      taxableThisPeriod: TWO_DP(taxable),
      taxThisPeriod: tax,
      slices: [{ rate: cfg.basicRate, amount: TWO_DP(taxable), tax, label: 'basic' }],
    };
  }

  if (parsed.kind === 'D0') {
    const taxable = Math.max(0, grossForPeriod);
    const tax = TWO_DP(taxable * cfg.higherRate);
    return {
      codeParsed: parsed,
      periodFacts: {
        period,
        allowanceToDate: 0,
        basicBandToDate,
        higherBandToDate,
        monthlyAllowance: 0,
        monthlyBasicBand,
        monthlyHigherBand,
      },
      taxableThisPeriod: TWO_DP(taxable),
      taxThisPeriod: tax,
      slices: [{ rate: cfg.higherRate, amount: TWO_DP(taxable), tax, label: 'higher' }],
    };
  }

  // STD (e.g., 1257L)
  if (parsed.basis === 'NON_CUMULATIVE') {
    // W1/M1: single-period calc
    const periodAllowance = allowanceToDate; // already monthly tapered if needed
    const taxable = Math.max(0, grossForPeriod - periodAllowance);
    const { tax, slices } = calcSlicesProgressive(
      taxable,
      monthlyBasicBand,
      monthlyHigherBand,
      cfg
    );
    return {
      codeParsed: parsed,
      periodFacts: {
        period,
        allowanceToDate: TWO_DP(periodAllowance),
        basicBandToDate: monthlyBasicBand,
        higherBandToDate: monthlyHigherBand,
        monthlyAllowance: TWO_DP(periodAllowance),
        monthlyBasicBand,
        monthlyHigherBand,
      },
      taxableThisPeriod: TWO_DP(taxable),
      taxThisPeriod: tax,
      slices,
    };
  } else {
    // CUMULATIVE: tax to date minus tax paid YTD
    const grossToDate = ytdTaxableBeforeThisPeriod + grossForPeriod;
    const taxableToDate = Math.max(0, grossToDate - allowanceToDate);

    const { tax: taxToDate, slices } = calcSlicesProgressive(
      taxableToDate,
      basicBandToDate,
      higherBandToDate,
      cfg
    );

    let taxThisPeriod = TWO_DP(taxToDate - (ytdTaxPaidBeforeThisPeriod ?? 0));
    if (taxThisPeriod < 0) taxThisPeriod = 0;

    // For a useful breakdown, also compute period-only taxable used within progressive bands
    // Approximation: recompute period-only using delta of cumulative ceilings vs previous period.
    // This keeps slices meaningful without requiring prior-period slices.
    const prevAllowanceToDate = cumulativeProRata(
      // apply taper using annualised income up to previous period
      (() => {
        const prevPeriod = Math.max(1, period - 1);
        if (period === 1) return taperedAllowance(parsed.allowanceAnnual, (grossToDate * 12) / period, cfg);
        const prevAnnualised = (ytdTaxableBeforeThisPeriod * 12) / prevPeriod;
        return taperedAllowance(parsed.allowanceAnnual, prevAnnualised, cfg);
      })(),
      Math.max(0, period - 1)
    );
    const prevTaxableToDate = Math.max(0, (ytdTaxableBeforeThisPeriod) - prevAllowanceToDate);

    const prevBasicToDate = cumulativeProRata(cfg.basicLimitAnnual, Math.max(0, period - 1));
    const prevHigherToDate = cumulativeProRata(cfg.additionalThresholdAnnual, Math.max(0, period - 1));

    const { tax: prevTax } = calcSlicesProgressive(prevTaxableToDate, prevBasicToDate, prevHigherToDate, cfg);
    // Period decomposition by difference method
    const periodOnlyTaxableApprox = Math.max(0, taxableToDate - prevTaxableToDate);
    const periodSlicesApprox = decomposeByBandsDelta(
      prevBasicToDate, prevHigherToDate,
      basicBandToDate, higherBandToDate,
      periodOnlyTaxableApprox, cfg
    );

    return {
      codeParsed: parsed,
      periodFacts: {
        period,
        allowanceToDate: TWO_DP(allowanceToDate),
        basicBandToDate,
        higherBandToDate,
        monthlyAllowance: monthlyAllowanceBase, // informational
        monthlyBasicBand,
        monthlyHigherBand,
      },
      taxableThisPeriod: TWO_DP(Math.max(0, grossForPeriod - Math.max(0, allowanceToDate - prevAllowanceToDate))),
      taxThisPeriod,
      taxToDate,
      slices: periodSlicesApprox.slices.length ? periodSlicesApprox.slices : slices, // fallback to cumulative slices if needed
    };
  }
}

// Break down the period-only taxable amount into bands using movement in cumulative ceilings.
function decomposeByBandsDelta(
  prevBasic: number,
  prevHigher: number,
  currBasic: number,
  currHigher: number,
  periodTaxable: number,
  cfg: TaxYearConfig
): { slices: BandSlice[] } {
  let remaining = Math.max(0, periodTaxable);
  const slices: BandSlice[] = [];

  // Portion available in basic band this period
  const basicSpan = Math.max(0, currBasic - prevBasic);
  const basicAmt = Math.min(remaining, basicSpan);
  if (basicAmt > 0) {
    const t = TWO_DP(basicAmt * cfg.basicRate);
    slices.push({ rate: cfg.basicRate, amount: TWO_DP(basicAmt), tax: t, label: 'basic' });
    remaining -= basicAmt;
  }

  // Portion available in higher band this period
  const higherSpan = Math.max(0, (currHigher - currBasic) - (prevHigher - prevBasic));
  // More simply, the incremental higher ceiling is (currHigher - prevHigher) minus what spilled into basic.
  const higherIncrement = Math.max(0, (currHigher - prevHigher) - basicAmt);
  const higherAmt = Math.min(remaining, Math.max(higherSpan, higherIncrement));
  if (higherAmt > 0) {
    const t = TWO_DP(higherAmt * cfg.higherRate);
    slices.push({ rate: cfg.higherRate, amount: TWO_DP(higherAmt), tax: t, label: 'higher' });
    remaining -= higherAmt;
  }

  // Anything remaining is additional
  if (remaining > 0) {
    const t = TWO_DP(remaining * cfg.additionalRate);
    slices.push({ rate: cfg.additionalRate, amount: TWO_DP(remaining), tax: t, label: 'additional' });
    remaining = 0;
  }

  return { slices };
}

// Convenience: compute NET for callers that want it here.
// You can ignore this if you’ll add NET in calculatePay later.
export function computeNetFromGrossAndTax(grossForPeriod: number, taxThisPeriod: number): number {
  return TWO_DP(grossForPeriod - taxThisPeriod);
}
