'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

const NAV_CHIP =
  'w-32 text-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const CARD =
  'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';
const BTN_PRIMARY =
  'w-44 inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-white';
const BTN_SECONDARY =
  'w-32 inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-800';

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ni_number: string | null;
  pay_type: 'salary' | 'hourly' | string | null;
  frequency: 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly' | string | null;
  annual_salary: number | null;
  hours_per_week: number | null;
};

export default function EditEmployeeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [ni, setNi] = useState('');
  const [payType, setPayType] = useState<'Salary' | 'Hourly'>('Salary');
  const [freq, setFreq] =
    useState<'Weekly' | 'Fortnightly' | 'Four-weekly' | 'Monthly'>('Monthly');
  const [annual, setAnnual] = useState<string>('30000');
  const [hours, setHours] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/employees/${id}/details`, { method: 'GET' });
        const j = (await res.json()) as { data?: Employee; error?: string };
        if (!res.ok) throw new Error(j.error || 'Failed to load employee');
        if (cancelled) return;
        const e = j.data!;
        setFirst(e.first_name || '');
        setLast(e.last_name || '');
        setEmail(e.email || '');
        setNi((e.ni_number || '').toUpperCase());
        setPayType((e.pay_type === 'hourly' ? 'Hourly' : 'Salary') as any);
        const f =
          e.frequency === 'weekly'
            ? 'Weekly'
            : e.frequency === 'fortnightly'
              ? 'Fortnightly'
              : e.frequency === 'four_weekly'
                ? 'Four-weekly'
                : 'Monthly';
        setFreq(f as any);
        setAnnual(String(e.annual_salary ?? ''));
        setHours(e.hours_per_week != null ? String(e.hours_per_week) : '');
      } catch (e: any) {
        setErr(e?.message || 'Failed to load employee');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const eqHourly = useMemo(() => {
    const a = Number(annual) || 0;
    const h = Number(hours) || 0;
    if (!a || !h) return '';
    const hourly = a / (52.14285714 * h);
    return hourly.toFixed(2);
  }, [annual, hours]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/employees/${id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: first.trim(),
          last_name: last.trim(),
          email: email.trim(),
          ni_number: ni.replace(/\s+/g, '').toUpperCase(),
          pay_type: payType,
          frequency: freq,
          annual_salary: Number(annual),
          hours_per_week: hours ? Number(hours) : null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to save');
      router.push(`/dashboard/employees/${id}/edit`);
    } catch (e: any) {
      setErr(e?.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-300 via-teal-400 to-blue-600 font-[var(--font-manrope,inherit)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header banner */}
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image src="/WageFlowLogo.png" alt="WageFlow" width={64} height={64} priority />
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">Edit Details</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            <a href="/dashboard" className={NAV_CHIP}>Dashboard</a>
            <a href="/dashboard/employees" className={NAV_CHIP}>Employees</a>
            <a href="/dashboard/payroll" className={NAV_CHIP}>Payroll</a>
            <a href="/dashboard/absence" className={NAV_CHIP}>Absence</a>
          </nav>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <section className={CARD}>
            <h2 className="text-lg font-semibold text-center mb-4">Personal</h2>
            {err && <div className="mb-3 rounded-md bg-red-100 text-red-800 px-3 py-2">{err}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First name</label>
                <input className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                       value={first} onChange={e => setFirst(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last name</label>
                <input className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                       value={last} onChange={e => setLast(e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                       value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">NI number</label>
                <input className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white uppercase"
                       value={ni} onChange={e => setNi(e.target.value.toUpperCase())}
                       placeholder="QQ123456C" />
              </div>
            </div>
          </section>

          <section className={CARD}>
            <h2 className="text-lg font-semibold text-center mb-4">Employment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pay type</label>
                <select className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                        value={payType} onChange={e => setPayType(e.target.value as any)}>
                  <option>Salary</option>
                  <option>Hourly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Annual Salary (£)</label>
                <input inputMode="decimal" className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                       value={annual} onChange={e => setAnnual(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pay frequency</label>
                <select className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                        value={freq} onChange={e => setFreq(e.target.value as any)}>
                  <option>Monthly</option>
                  <option>Weekly</option>
                  <option>Fortnightly</option>
                  <option>Four-weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hours per week</label>
                <input inputMode="decimal" className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                       value={hours} onChange={e => setHours(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Equivalent Hourly Rate (£)</label>
                <input className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                       value={eqHourly} readOnly placeholder="Auto calculated" />
                <p className="text-xs text-neutral-700 mt-1">Annual / (52.14285714 × hours)</p>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pb-4">
            <a href={`/dashboard/employees/${id}/edit`} className={BTN_SECONDARY}>Cancel</a>
            <button type="submit" className={BTN_PRIMARY} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
