/* @ts-nocheck */
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

/**
 * Emergency Contact (Wizard)
 * Matches Classic Dashboard template:
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

function canonPhone(raw: string) {
  // Keep digits, allow leading + if present
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/\D/g, '');
  return plus + digits;
}

export default function EmergencyContactPage() {
  const { id } = (useParams() as any) ?? { id: "" };
  const router = useRouter();

  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;

    const name = contactName.trim();
    const rel = relationship.trim();
    const tel = canonPhone(phone);
    const mail = email.trim();

    if (!name) {
      alert('Contact name is required.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/employees/${id}/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: id,
          contact_name: name,
          relationship: rel || null,
          phone: tel || null,
          email: mail || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || 'Failed to save emergency contact');
      }

      router.push(`/dashboard/employees/${id}/edit`);
    } catch (err: any) {
      alert(err?.message || 'Failed to save emergency contact');
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
              Emergency Contact
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
          <h2 className="text-lg font-semibold text-center mb-4">Emergency Contact</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Contact name</label>
              <input
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="e.g. Jane Bloggs"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Relationship</label>
              <input
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                placeholder="e.g. Spouse, Parent, Friend"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+447700900123"
                  inputMode="tel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <a href={`/dashboard/employees/${id}/edit`} className={BTN_SECONDARY}>
                Cancel
              </a>
              <button type="submit" className={BTN_PRIMARY} disabled={busy}>
                {busy ? 'Savingâ€¦' : 'Save and finish'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

