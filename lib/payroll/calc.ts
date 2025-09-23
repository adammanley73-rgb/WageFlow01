import type { CalcInput, CalcResult, CalcTotals, CalcLines, CalcYTD } from './types';

/**
 * Placeholder kernel: sums items and returns zero deductions.
 * Replace with PAYE/NI/Loans/Pension engines as you implement them.
 */
export function calculatePay(input: CalcInput): CalcResult {
  const gross = (input.items || []).reduce((s, it) => s + (it.amount || 0), 0);

  const totals: CalcTotals = {
    gross,
    tax: 0,
    ee_ni: 0,
    er_ni: 0,
    student_loan: 0,
    pgl: 0,
    pension_emp: 0,
    pension_er: 0,
    net: gross,
  };

  const lines: CalcLines = [
    { code: 'BASIC', label: 'Basic pay', amount: gross },
    { code: 'TAX', label: 'Income tax', amount: 0 },
    { code: 'EE_NI', label: 'Employee NI', amount: 0 },
    { code: 'ER_NI', label: 'Employer NI', amount: 0 },
    { code: 'SL', label: 'Student loan', amount: 0 },
    { code: 'PGL', label: 'Postgraduate loan', amount: 0 },
    { code: 'PEN_EMP', label: 'Pension employee', amount: 0 },
    { code: 'PEN_ER', label: 'Pension employer', amount: 0 },
    { code: 'NET', label: 'Net pay', amount: totals.net },
  ];

  const ytdBase = {
    gross: Number(input.employee.ytd_gross || 0),
    tax: Number(input.employee.ytd_tax || 0),
    ni_emp: Number(input.employee.ytd_ni_emp || 0),
    ni_er: Number(input.employee.ytd_ni_er || 0),
    pension_emp: Number(input.employee.ytd_pension_emp || 0),
    pension_er: Number(input.employee.ytd_pension_er || 0),
  };

  const ytd: CalcYTD = {
    gross: ytdBase.gross + totals.gross,
    tax: ytdBase.tax + totals.tax,
    ni_emp: ytdBase.ni_emp + totals.ee_ni,
    ni_er: ytdBase.ni_er + totals.er_ni,
    pension_emp: ytdBase.pension_emp + totals.pension_emp,
    pension_er: ytdBase.pension_er + totals.pension_er,
  };

  return {
    lines,
    totals,
    ytd,
    meta: { rule_version: '0.0.1-stub', frequency: input.frequency },
  };
}
