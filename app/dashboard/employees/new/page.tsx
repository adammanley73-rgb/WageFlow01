'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/payroll', label: 'Payroll' },
  { href: '/dashboard/absence', label: 'Absence' },
];

const chip = 'w-32 text-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const card = 'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';
const btn = 'w-44 inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-white';
const btnGhost = 'w-32 inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-800';

export default function CreateEmployeePage() {
  const r = useRouter();

  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [ni, setNi] = useState('');
  const [payType, setPayType] = useState<'Salary' | 'Hourly'>('Salary');
  const [annual, setAnnual] = useState<string>('30000');
  const [hours, setHours] = useState<string>('37.5');
  const [freq, setFreq] = useState<'Monthly' | 'Weekly' | 'Fortnightly' | 'Four-weekly'>('Monthly');
  const [busy, setBusy] = useState(false);

  const eqHourly = (() => {
    const a = Number(annual) || 0;
    const h = Number(hours) || 0;
    if (!a || !h) return '';
    const hourly = a / (52.14285714 * h);
    return hourly.toFixed(2);
  })();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/employees/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: first.trim(),
          last_name: last.trim(),
          email: email.trim(),
          ni_number: ni.replace(/\s+/g, '').toUpperCase(),
          pay_type: payType,
          base_pay: 0,
          frequency: freq,
          annual_salary: Number(annual),
          hours_per_week: Number(hours),
        }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error || 'Failed to create employee');
      r.push(`/dashboard/employees/${json.id}/wizard/starter`);
    } catch (err: any) {
      alert(err?.message || 'Failed to create employee');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-300 via-teal-400 to-blue-600 font-[var(--font-manrope,inherit)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image src="/WageFlowLogo.png" alt="WageFlow" width={64} height={64} priority />
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">Create Employee</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            {NAV.map(n => (
              <a key={n.href} href={n.href} className={chip}>{n.label}</a>
            ))}
          </nav>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <section className={card}>
            <h2 className="text-lg font-semibold text-center mb-4">Personal</h2>
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
                  value={ni} onChange={e => setNi(e.target.value.toUpperCase())} placeholder="QQ123456C" />
              </div>
            </div>
          </section>

          <section className={card}>
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

          <section className={card}>
            <h2 className="text-lg font-semibold text-center mb-4">New Starter</h2>
            <p className="text-sm text-center text-neutral-800">P45 and Starter Declaration are recorded on the next step.</p>
          </section>

          <div className="flex items-center justify-end gap-3 pb-4">
            <a href="/dashboard/employees" className={btnGhost}>Cancel</a>
            <button type="submit" className={btn} disabled={busy}>
              {busy ? 'Saving…' : 'Save and continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
