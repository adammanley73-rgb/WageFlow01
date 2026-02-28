'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  defaultHoursPerWeek?: number;
  defaultAnnualSalary?: number;
  defaultTaxCode?: string;
};

const WEEKS_PER_YEAR = 52.1429; // your rule: 365 / 7

export default function EmploymentFields({
  defaultHoursPerWeek = 37.5,
  defaultAnnualSalary = 0,
  defaultTaxCode = '1257L',
}: Props) {
  // local state so we can auto-calc hourly_rate
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(defaultHoursPerWeek);
  const [annualSalary, setAnnualSalary] = useState<number>(defaultAnnualSalary);
  const [payFrequency, setPayFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [hasP45, setHasP45] = useState<boolean>(false);
  const [starterDecl, setStarterDecl] = useState<'A' | 'B' | 'C'>('A');

  // derive hourly rate from annual salary and hours per week
  const hourlyRate = useMemo(() => {
    const h = Number(hoursPerWeek);
    const s = Number(annualSalary);
    if (!h || !s || h <= 0 || s <= 0) return 0;
    const rate = s / (WEEKS_PER_YEAR * h);
    // two decimals, numeric value
    return Math.round(rate * 100) / 100;
  }, [annualSalary, hoursPerWeek]);

  // keep numeric inputs sane
  function toNumber(value: string) {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : 0;
  }

  useEffect(() => {
    // make sure payFrequency is always one of the allowed values
    if (payFrequency !== 'monthly' && payFrequency !== 'weekly') {
      setPayFrequency('monthly');
    }
  }, [payFrequency]);

  return (
    <div className="grid gap-6">
      {/* Employment block */}
      <fieldset className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">Employment</legend>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="employee_number">
              Employee number
            </label>
            <input
              id="employee_number"
              name="employee_number"
              type="text"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              placeholder="00001"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="job_title">
              Job title
            </label>
            <input
              id="job_title"
              name="job_title"
              type="text"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              placeholder="Director"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="department">
              Department
            </label>
            <input
              id="department"
              name="department"
              type="text"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              placeholder="HQ"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="start_date">
              Start date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="pay_frequency">
              Pay frequency
            </label>
            <select
              id="pay_frequency"
              name="pay_frequency"
              value={payFrequency}
              onChange={(e) => setPayFrequency(e.target.value as 'monthly' | 'weekly')}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="hours_per_week">
              Hours per week
            </label>
            <input
              id="hours_per_week"
              name="hours_per_week"
              type="number"
              step="0.01"
              min="0"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(toNumber(e.target.value))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              placeholder="37.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="annual_salary">
              Annual salary (£)
            </label>
            <input
              id="annual_salary"
              name="annual_salary"
              type="number"
              step="0.01"
              min="0"
              value={annualSalary}
              onChange={(e) => setAnnualSalary(toNumber(e.target.value))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              placeholder="52000"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="hourly_rate">
              Hourly rate (£) auto
            </label>
            <input
              id="hourly_rate"
              name="hourly_rate"
              type="number"
              step="0.01"
              min="0"
              value={Number.isFinite(hourlyRate) ? hourlyRate : 0}
              readOnly
              className="rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-700 outline-none"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="tax_code">
              Tax code
            </label>
            <input
              id="tax_code"
              name="tax_code"
              type="text"
              defaultValue={defaultTaxCode}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              placeholder="1257L"
            />
          </div>
        </div>
      </fieldset>

      {/* P45 / Starter Declaration */}
      <fieldset className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">
          P45 / New Starter Declaration
        </legend>

        <div className="flex items-center gap-3">
          <input
            id="has_p45"
            name="has_p45"
            type="checkbox"
            className="h-4 w-4 accent-[#1e40af]"
            checked={hasP45}
            onChange={(e) => setHasP45(e.target.checked)}
          />
          <label htmlFor="has_p45" className="text-sm text-neutral-800">
            Employee has a P45 from previous employer
          </label>
        </div>

        {!hasP45 && (
          <div className="grid gap-2">
            <p className="text-sm text-neutral-700">New starter declaration</p>
            <div className="flex flex-wrap gap-4">
              {(['A', 'B', 'C'] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="starter_declaration"
                    value={opt}
                    checked={starterDecl === opt}
                    onChange={() => setStarterDecl(opt)}
                    className="h-4 w-4 accent-[#1e40af]"
                  />
                  <span>Option {opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {hasP45 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-neutral-700" htmlFor="p45_tax_code">
                P45 tax code
              </label>
              <input
                id="p45_tax_code"
                name="p45_tax_code"
                type="text"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
                placeholder="1257L"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-neutral-700" htmlFor="p45_pay_to_date">
                P45 pay to date (£)
              </label>
              <input
                id="p45_pay_to_date"
                name="p45_pay_to_date"
                type="number"
                step="0.01"
                min="0"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              />
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}

