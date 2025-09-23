'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

/**
 * Bank Details (Wizard)
 * Matches the Classic Dashboard template:
 * - Gradient page background
 * - White header banner with 64px logo and large title
 * - Uniform nav chips on the right
 * - Single grey card (neutral-300 with neutral-400 ring) with centered section title
 * - Manrope for all text, uniform action button widths
 */

const NAV_CHIP =
  'w-32 text-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const BTN_PRIMARY =
  'w-44 inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-white';
const BTN_SECONDARY =
  'w-32 inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-800';
const CARD =
  'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';

function canonSortCode(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export default function BankDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [accountName, setAccountName] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;

    const sort = canonSortCode(sortCode);
    const acct = accountNumber.replace(/\D/g, '').slice(0, 8);

    if (!accountName.trim() || sort.length !== 8 || acct.length < 6) {
      alert('Enter a name, a valid sort code, and an account number.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/employees/${id}/bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: id,
          account_name: accountName.trim(),
          sort_code: sort,
          account_number: acct,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || 'Failed to save bank details');
      }

      router.push(`/dashboard/employees/${id}/wizard/emergency`);
    } catch (err: any) {
      alert(err?.message || 'Failed to save bank details');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-300 via-teal-400 to-blue-600 font-[var(--font-manrope,inherit)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header banner */}
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow"
              width={64}
              height={64}
              priority
            />
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">
              Bank Details
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            <a href="/dashboard" className={NAV_CHIP}>Dashboard</a>
            <a href="/dashboard/employees" className={NAV_CHIP}>Employees</a>
            <a href="/dashboard/payroll" className={NAV_CHIP}>Payroll</a>
            <a href="/dashboard/absence" className={NAV_CHIP}>Absence</a>
          </nav>
        </div>

        {/* Card */}
        <form onSubmit={onSubmit} className={CARD}>
          <h2 className="text-lg font-semibold text-center mb-4">Bank Details</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Account name</label>
              <input
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="e.g. J Bloggs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sort code</label>
              <input
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                value={sortCode}
                onChange={e => setSortCode(canonSortCode(e.target.value))}
                placeholder="00-00-00"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Account number</label>
              <input
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="12345678"
                inputMode="numeric"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <a href={`/dashboard/employees/${id}/edit`} className={BTN_SECONDARY}>
                Cancel
              </a>
              <button type="submit" className={BTN_PRIMARY} disabled={busy}>
                {busy ? 'Saving…' : 'Save and continue'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
