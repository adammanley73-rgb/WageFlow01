/* app/dashboard/employees/new/page.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageTemplate from '@/components/layout/PageTemplate';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  start_date: string;
  employment_type: string;
  salary: string;
  hourly_rate: string;
  hours_per_week: string;
  ni_number: string;
  pay_frequency: string;
}

type ActiveCompany = { id?: string; name?: string } | null;

export default function NewEmployeePage() {
  const router = useRouter();

  const [company, setCompany] = useState<ActiveCompany>(null);
  const [companyErr, setCompanyErr] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    email: '',
    job_title: '',
    start_date: '',
    employment_type: 'full_time',
    salary: '',
    hourly_rate: '',
    hours_per_week: '',
    ni_number: '',
    pay_frequency: 'monthly',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'fortnightly', label: 'Fortnightly' },
    { value: 'four_weekly', label: 'Four-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
  ];
  const employmentTypes = [
    { value: 'full_time', label: 'Full-time' },
    { value: 'part_time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
  ];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCompanyErr(null);
        const r = await fetch('/api/active-company', { cache: 'no-store' });
        if (r.status === 204) {
          if (alive) {
            setCompany(null);
            setCompanyErr('No active company selected. Use Company Selection first.');
          }
          return;
        }
        if (!r.ok) {
          throw new Error(`active-company ${r.status}`);
        }
        const j = await r.json().catch(() => ({}));
        if (alive) setCompany(j || null);
      } catch (e: any) {
        if (alive) setCompanyErr(String(e?.message || e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'ni_number' ? value.toUpperCase().replace(/\s+/g, '') : value,
    }));
  };

  async function ensureCompanyOrFail(): Promise<boolean> {
    try {
      const r = await fetch('/api/active-company', { cache: 'no-store' });
      if (r.status === 204) {
        setCompanyErr('No active company selected. Use Company Selection first.');
        return false;
      }
      if (!r.ok) throw new Error(`active-company ${r.status}`);
      const j = await r.json().catch(() => ({}));
      setCompany(j || null);
      return Boolean(j?.id);
    } catch (e: any) {
      setCompanyErr(String(e?.message || e));
      return false;
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Hard stop if no company is selected
    const ok = await ensureCompanyOrFail();
    if (!ok) return;

    setSaving(true);
    const payload = {
      name: [form.first_name, form.last_name].filter(Boolean).join(' ').trim(),
      email: form.email.trim() || null,
      job_title: form.job_title.trim() || null,
      start_date: form.start_date || null,
      employment_type: form.employment_type,
      salary: form.salary ? Number(form.salary) : null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      hours_per_week: form.hours_per_week ? Number(form.hours_per_week) : null,
      ni_number: form.ni_number.trim().toUpperCase() || null,
      pay_frequency: form.pay_frequency,
    };

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Try to read a body either way for better errors
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg = json?.error || `create failed ${res.status}`;
        throw new Error(msg);
      }

      const id = json?.id;
      if (!id) {
        throw new Error('create succeeded but no employee id returned');
      }

      // Success: jump straight into the wizard
      router.replace(`/dashboard/employees/${id}/wizard/starter`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create employee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTemplate title="Employees" currentSection="employees">
      <div className="rounded-2xl ring-1 border bg-neutral-300 ring-neutral-400 border-neutral-400 p-4">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">New employee</h2>

        {companyErr && (
          <div className="mb-3 rounded-md bg-yellow-100 px-3 py-2 text-sm text-yellow-900">
            {companyErr}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-700">First name</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700">Last name</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-neutral-700">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700">Job title</label>
              <input
                name="job_title"
                value={form.job_title}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700">Start date</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700">Employment type</label>
              <select
                name="employment_type"
                value={form.employment_type}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                {employmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-700">Salary (annual)</label>
              <input
                type="number"
                min="0"
                name="salary"
                value={form.salary}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700">Hourly rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="hourly_rate"
                value={form.hourly_rate}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700">Hours per week</label>
              <input
                type="number"
                min="0"
                step="0.1"
                name="hours_per_week"
                value={form.hours_per_week}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700">NI number</label>
              <input
                name="ni_number"
                value={form.ni_number}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 uppercase"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700">Pay frequency</label>
              <select
                name="pay_frequency"
                value={form.pay_frequency}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                {payOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Savingâ€¦' : 'Create employee'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/employees')}
              className="rounded-lg bg-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PageTemplate>
  );
}
