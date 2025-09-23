// tests/paye.test.ts
// Run with: npx vitest run

import { describe, it, expect } from 'vitest';
import { computePAYE } from '../lib/payroll/paye';

describe('PAYE v1 monthly engine', () => {
  it('1257L cumulative, month 1, basic salary', () => {
    const result = computePAYE({
      grossForPeriod: 2000,
      taxCode: '1257L',
      period: 1,
      ytdTaxableBeforeThisPeriod: 0,
      ytdTaxPaidBeforeThisPeriod: 0,
    });
    expect(result.taxThisPeriod).toBeGreaterThanOrEqual(0);
    expect(result.slices.length).toBeGreaterThan(0);
  });

  it('1257L cumulative, month 6, mid-year check', () => {
    const result = computePAYE({
      grossForPeriod: 3000,
      taxCode: '1257L',
      period: 6,
      ytdTaxableBeforeThisPeriod: 15000,
      ytdTaxPaidBeforeThisPeriod: 1000,
    });
    expect(result.taxThisPeriod).toBeGreaterThan(0);
  });

  it('1257L M1 (non-cumulative), monthly allowance only', () => {
    const result = computePAYE({
      grossForPeriod: 2000,
      taxCode: '1257L M1',
      period: 1,
    });
    expect(result.taxThisPeriod).toBeGreaterThan(0);
    expect(result.periodFacts.monthlyAllowance).toBeCloseTo(1047.5, 0); // 12570/12
  });

  it('BR (basic rate all)', () => {
    const result = computePAYE({
      grossForPeriod: 2000,
      taxCode: 'BR',
      period: 1,
    });
    expect(result.taxThisPeriod).toBeCloseTo(400, 0); // 20% of 2000
    expect(result.slices[0].label).toBe('basic');
  });

  it('D0 (higher rate all)', () => {
    const result = computePAYE({
      grossForPeriod: 2000,
      taxCode: 'D0',
      period: 1,
    });
    expect(result.taxThisPeriod).toBeCloseTo(800, 0); // 40% of 2000
    expect(result.slices[0].label).toBe('higher');
  });
});
