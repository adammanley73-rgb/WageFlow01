/* @ts-nocheck */
export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';

type PayrollRun = {
  id: string;
  run_number: number;
  run_name: string;
  frequency: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  archived_at: string | null;
};

async function getEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  const companyId = process.env.COMPANY_ID;
  if (!url || !key || !companyId) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE, or COMPANY_ID');
  }
  return { url, key, companyId };
}

async function fetchPayrollRuns(): Promise<PayrollRun[]> {
  const { createClient } = await import('@supabase/supabase-js');
  const { url, key, companyId } = await getEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('payroll_runs')
    .select('id, run_number, run_name, frequency, period_start, period_end, pay_date, archived_at')
    .eq('company_id', companyId)
    .is('archived_at', null)
    .order('period_start', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export default async function PayrollPage() {
  const runs = await fetchPayrollRuns();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-300/40 via-cyan-200/30 to-emerald-200/40">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
            <p className="text-sm text-neutral-600">Scheduled payroll runs</p>
          </div>
        </header>

        {/* Runs list */}
        <section className="rounded-xl bg-white shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 text-left font-medium">Run #</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Frequency</th>
                  <th className="px-4 py-3 text-left font-medium">Period</th>
                  <th className="px-4 py-3 text-left font-medium">Pay date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                      No payroll runs.
                    </td>
                  </tr>
                ) : (
                  runs.map(r => (
                    <tr key={r.id} className="border-b border-neutral-200">
                      <td className="px-4 py-3">{r.run_number}</td>
                      <td className="px-4 py-3">{r.run_name}</td>
                      <td className="px-4 py-3 capitalize">{formatFrequency(r.frequency)}</td>
                      <td className="px-4 py-3">
                        {formatDate(r.period_start)} – {formatDate(r.period_end)}
                      </td>
                      <td className="px-4 py-3">{formatDate(r.pay_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/payroll/${r.id}`}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-white"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function formatFrequency(f: string) {
  const v = (f || '').toLowerCase();
  if (v === 'weekly') return 'Weekly';
  if (v === 'fortnightly') return 'Fortnightly';
  if (v === 'four_weekly') return 'Four weekly';
  if (v === 'monthly') return 'Monthly';
  return '';
}

