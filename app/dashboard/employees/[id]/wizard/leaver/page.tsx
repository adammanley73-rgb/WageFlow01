// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\wizard\leaver\page.tsx
/* @ts-nocheck */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const ACTION_BTN =
  'rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const CARD =
  'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';

type OtherLine = {
  description: string;
  amount: string;
};

type LeaverFormState = {
  leaving_date: string;
  final_pay_date: string;
  leaver_reason: string;
  pay_after_leaving: boolean;
  holiday_days: string;
  holiday_amount: string;
  other_earnings: OtherLine[];
  other_deductions: OtherLine[];
};

export default function LeaverWizardPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ''), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const redirectRef = React.useRef<any>(null);

  const [form, setForm] = useState<LeaverFormState>({
    leaving_date: '',
    final_pay_date: '',
    leaver_reason: '',
    pay_after_leaving: false,
    holiday_days: '',
    holiday_amount: '',
    other_earnings: [{ description: '', amount: '' }],
    other_deductions: [{ description: '', amount: '' }],
  });

  useEffect(() => {
    if (!id) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/employees/${id}/leaver`, {
          cache: 'no-store',
        });

        if (res.status === 404 || res.status === 204) {
          // No leaver data yet, keep defaults
          if (alive) setLoading(false);
          return;
        }

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `load ${res.status}`);
        }

        const leaver = json.leaver || {};

        if (!alive) return;

        const holidayDays =
          typeof leaver.holiday_days === 'number'
            ? String(leaver.holiday_days)
            : '';
        const holidayAmount =
          typeof leaver.holiday_amount === 'number'
            ? String(leaver.holiday_amount)
            : '';

        const otherEarningsRaw = Array.isArray(leaver.other_earnings)
          ? leaver.other_earnings
          : [];
        const otherDeductionsRaw = Array.isArray(leaver.other_deductions)
          ? leaver.other_deductions
          : [];

        const otherEarnings: OtherLine[] =
          otherEarningsRaw.length > 0
            ? otherEarningsRaw.map((l: any) => ({
                description: l?.description || '',
                amount:
                  typeof l?.amount === 'number'
                    ? String(l.amount)
                    : l?.amount || '',
              }))
            : [{ description: '', amount: '' }];

        const otherDeductions: OtherLine[] =
          otherDeductionsRaw.length > 0
            ? otherDeductionsRaw.map((l: any) => ({
                description: l?.description || '',
                amount:
                  typeof l?.amount === 'number'
                    ? String(l.amount)
                    : l?.amount || '',
              }))
            : [{ description: '', amount: '' }];

        setForm({
          leaving_date: leaver.leaving_date || '',
          final_pay_date: leaver.final_pay_date || '',
          leaver_reason: leaver.leaver_reason || '',
          pay_after_leaving: !!leaver.pay_after_leaving,
          holiday_days: holidayDays,
          holiday_amount: holidayAmount,
          other_earnings: otherEarnings,
          other_deductions: otherDeductions,
        });
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (redirectRef.current) {
        clearTimeout(redirectRef.current);
      }
    };
  }, []);

  function updateField<K extends keyof LeaverFormState>(key: K, value: LeaverFormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateOtherLine(
    key: 'other_earnings' | 'other_deductions',
    index: number,
    field: keyof OtherLine,
    value: string
  ) {
    setForm((prev) => {
      const list = [...prev[key]];
      if (!list[index]) {
        list[index] = { description: '', amount: '' };
      }
      list[index] = {
        ...list[index],
        [field]: value,
      };
      return { ...prev, [key]: list };
    });
  }

  function addOtherLine(key: 'other_earnings' | 'other_deductions') {
    setForm((prev) => ({
      ...prev,
      [key]: [...prev[key], { description: '', amount: '' }],
    }));
  }

  function removeOtherLine(key: 'other_earnings' | 'other_deductions', index: number) {
    setForm((prev) => {
      const list = [...prev[key]];
      list.splice(index, 1);
      if (list.length === 0) {
        list.push({ description: '', amount: '' });
      }
      return { ...prev, [key]: list };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setErr(null);

    try {
      const payload = {
        leaving_date: form.leaving_date || null,
        final_pay_date: form.final_pay_date || null,
        leaver_reason: form.leaver_reason.trim() || null,
        pay_after_leaving: !!form.pay_after_leaving,
        holiday_days: form.holiday_days,
        holiday_amount: form.holiday_amount,
        other_earnings: form.other_earnings,
        other_deductions: form.other_deductions,
      };

      const res = await fetch(`/api/employees/${id}/leaver`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const msg = json?.error || `save ${res.status}`;
        throw new Error(msg);
      }

      // Success toast then redirect to employees list
      setToast('Leaver successfully processed. Please remember to send their P45.');
      if (redirectRef.current) {
        clearTimeout(redirectRef.current);
      }
      redirectRef.current = setTimeout(() => {
        router.replace('/dashboard/employees');
      }, 2500);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setErr(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-300 via-teal-400 to-blue-600 font-[var(--font-manrope,inherit)]">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-md bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
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
              Leaver details
            </h1>
          </div>

          {/* Wizard nav: Back only, no other nav pills */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                history.length > 1 ? router.back() : router.push('/dashboard/employees')
              }
              className={ACTION_BTN}
              aria-label="Back"
            >
              Back
            </button>
          </div>
        </div>

        <div className={CARD}>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <form onSubmit={onSubmit}>
              {err ? (
                <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                  {err}
                </div>
              ) : null}

              {/* Section: Leaver basics */}
              <div className="mb-6 border-b border-neutral-400 pb-4">
                <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                  Leaver basics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-900">
                      Last working day
                    </label>
                    <input
                      type="date"
                      name="leaving_date"
                      value={form.leaving_date}
                      onChange={(e) => updateField('leaving_date', e.target.value)}
                      className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-900">
                      Final pay date
                    </label>
                    <input
                      type="date"
                      name="final_pay_date"
                      value={form.final_pay_date}
                      onChange={(e) => updateField('final_pay_date', e.target.value)}
                      className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-neutral-900">
                      Reason for leaving
                    </label>
                    <select
                      name="leaver_reason"
                      value={form.leaver_reason}
                      onChange={(e) => updateField('leaver_reason', e.target.value)}
                      className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                    >
                      <option value="">Select…</option>
                      <option value="resignation">Resignation</option>
                      <option value="dismissal">Dismissal</option>
                      <option value="redundancy">Redundancy</option>
                      <option value="end_of_contract">End of contract</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <label className="mt-2 flex items-center gap-2 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.pay_after_leaving}
                      onChange={(e) =>
                        updateField('pay_after_leaving', e.target.checked)
                      }
                    />
                    <span className="text-sm text-neutral-900">
                      There may be payments after leaving
                    </span>
                  </label>
                </div>
              </div>

              {/* Section: Holiday on termination */}
              <div className="mb-6 border-b border-neutral-400 pb-4">
                <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                  Holiday on termination
                </h2>
                <p className="mb-3 text-sm text-neutral-800">
                  Enter the unused holiday days and payout amount for this employee. In
                  a later version, this can be driven from your holiday entitlement
                  and absence records.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-900">
                      Unused holiday days to pay
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="holiday_days"
                      value={form.holiday_days}
                      onChange={(e) => updateField('holiday_days', e.target.value)}
                      className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-900">
                      Holiday payout amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="holiday_amount"
                      value={form.holiday_amount}
                      onChange={(e) => updateField('holiday_amount', e.target.value)}
                      className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Other final earnings */}
              <div className="mb-6 border-b border-neutral-400 pb-4">
                <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                  Other final earnings
                </h2>
                <p className="mb-3 text-sm text-neutral-800">
                  Use this for bonuses, outstanding commission or any other earnings
                  that should be included in the final pay run.
                </p>
                <div className="space-y-3">
                  {form.other_earnings.map((line, index) => (
                    <div
                      key={`earn-${index}`}
                      className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto] gap-3 items-center"
                    >
                      <input
                        className="rounded-md border border-neutral-400 bg-white p-2"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) =>
                          updateOtherLine(
                            'other_earnings',
                            index,
                            'description',
                            e.target.value
                          )
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="rounded-md border border-neutral-400 bg-white p-2"
                        placeholder="Amount"
                        value={line.amount}
                        onChange={(e) =>
                          updateOtherLine(
                            'other_earnings',
                            index,
                            'amount',
                            e.target.value
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeOtherLine('other_earnings', index)}
                        className="text-sm text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOtherLine('other_earnings')}
                    className="text-sm font-medium text-blue-800"
                  >
                    + Add another earning line
                  </button>
                </div>
              </div>

              {/* Section: Other final deductions */}
              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                  Other final deductions
                </h2>
                <p className="mb-3 text-sm text-neutral-800">
                  Use this for recovery of overpayments, over-taken holiday or any
                  final deductions that should be applied in the final pay run.
                </p>
                <div className="space-y-3">
                  {form.other_deductions.map((line, index) => (
                    <div
                      key={`ded-${index}`}
                      className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto] gap-3 items-center"
                    >
                      <input
                        className="rounded-md border border-neutral-400 bg-white p-2"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) =>
                          updateOtherLine(
                            'other_deductions',
                            index,
                            'description',
                            e.target.value
                          )
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="rounded-md border border-neutral-400 bg-white p-2"
                        placeholder="Amount"
                        value={line.amount}
                        onChange={(e) =>
                          updateOtherLine(
                            'other_deductions',
                            index,
                            'amount',
                            e.target.value
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeOtherLine('other_deductions', index)}
                        className="text-sm text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOtherLine('other_deductions')}
                    className="text-sm font-medium text-blue-800"
                  >
                    + Add another deduction line
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <Link
                  href="/dashboard/employees"
                  className="rounded-md bg-neutral-400 px-4 py-2 text-white"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save leaver details'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
