// lib/payroll/calculatePay.ts
// Integrates PAYE v1 monthly engine into pay calculation.

import { computePAYE, computeNetFromGrossAndTax, PayeInputs, PayeResult } from './paye';

export interface CalculatePayInputs {
  grossForPeriod: number;
  taxCode: string; // e.g. "1257L", "1257L M1", "BR", "D0"
  period: number; // 1..12 for monthly
  ytdTaxableBeforeThisPeriod?: number;
  ytdTaxPaidBeforeThisPeriod?: number;
  taxYear?: number;
}

export interface CalculatePayResult {
  gross: number;
  tax: number;
  net: number;
  paye: PayeResult;
}

export function calculatePay(inputs: CalculatePayInputs): CalculatePayResult {
  const payeInputs: PayeInputs = {
    grossForPeriod: inputs.grossForPeriod,
    taxCode: inputs.taxCode,
    period: inputs.period,
    ytdTaxableBeforeThisPeriod: inputs.ytdTaxableBeforeThisPeriod ?? 0,
    ytdTaxPaidBeforeThisPeriod: inputs.ytdTaxPaidBeforeThisPeriod ?? 0,
    taxYear: inputs.taxYear,
  };

  const paye = computePAYE(payeInputs);
  const tax = paye.taxThisPeriod;
  const net = computeNetFromGrossAndTax(inputs.grossForPeriod, tax);

  return {
    gross: inputs.grossForPeriod,
    tax,
    net,
    paye,
  };
}
