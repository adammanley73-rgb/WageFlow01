/* @ts-nocheck */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const ACTION_BTN =
  'rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const CARD =
  'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';

type P45Row = {
  employer_paye_ref: string | null;
  employer_name: string | null;
  works_number: string | null;
  leaving_date: string | null; // ISO yyyy-mm-dd
  tax_code: string | null;
  tax_basis: 'Cumulative' | 'Week1Month1' | null;
  total_pay_to_date: number | null;
  total_tax_to_date: number | null;
  had_student_loan_deductions: boolean | null;
};

function isJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

export default function P45Page() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ''), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<P45Row>({
    employer_paye_ref: '',
    employer_name: '',
    works_number: '',
    leaving_date: '',
    tax_code: '1257L',
    tax_basis: 'Cumulative',
    total_pay_to_date: 0,
    total_tax_to_date: 0,
    had_student_loan_deductions: false,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`/api/employees/${id}/p45`, { cache: 'no-store' });

        // No record yet or backend not returning JSON
        if (r.status === 204 || r.status === 404) return;

        if (!r.ok) throw new Error(`load ${r.status}`);

        if (isJson(r)) {
          const j = await r.json().catch(() => null);
          const d = (j?.data ?? j ?? null) as Partial<P45Row> | null;
          if (alive && d) {
            setForm((prev) => ({
              ...prev,
              employer_paye_ref: d.employer_paye_ref ?? prev.employer_paye_ref,
              employer_name: d.employer_name ?? prev.employer_name,
              works_number: d.works_number ?? prev.works_number,
              leaving_date: d.leaving_date ?? prev.leaving_date,
              tax_code: d.tax_code ?? prev.tax_code,
              tax_basis: (d.tax_basis as any) ?? prev.tax_basis,
              total_pay_to_date:
                typeof d.total_pay_to_date === 'number'
                  ? d.total_pay_to_date
                  : prev.total_pay_to_date,
              total_tax_to_date:
                typeof d.total_tax_to_date === 'number'
                  ? d.total_tax_to_date
                  : prev.total_tax_to_date,
              had_student_loan_deductions:
                typeof d.had_student_loan_deductions === 'boolean'
                  ? d.had_student_loan_deductions
                  : prev.had_student_loan_deductions,
            }));
          }
        }
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

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type, checked } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? Boolean(checked)
          : name === 'total_pay_to_date' || name === 'total_tax_to_date'
          ? value === '' ? null : Number(value)
          : value,
    }));
  }

  async function onSave() {
    try {
      setSaving(true);
      setErr(null);

      const payload: P45Row = {
        employer_paye_ref: form.employer_paye_ref || null,
        employer_name: form.employer_name || null,
        works_number: form.works_number || null,
        leaving_date: form.leaving_date || null,
        tax_code: form.tax_code || null,
        tax_basis: form.tax_basis || null,
        total_pay_to_date:
          typeof form.total_pay_to_date === 'number'
            ? form.total_pay_to_date
            : null,
        total_tax_to_date:
            typeof form.total_tax_to_date === 'number'
              ? form.total_tax_to_date
              : null,
        had_student_loan_deductions:
          typeof form.had_student_loan_deductions === 'boolean'
            ? form.had_student_loan_deductions
            : null,
      };

      const res = await fetch(`/api/employees/${id}/p45`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Advance even if body is empty. Read JSON only if present.
      let warn = '';
      if (isJson(res)) {
        const j = await res.json().catch(() => null);
        warn = j?.warning || '';
      }
      // Next step in your flow after P45 is Bank
      router.push(`/dashboard/employees/${id}/wizard/bank`);
      if (warn) console.warn('P45 saved with warning:', warn);
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
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header banner */}
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image src="/WageFlowLogo.png" alt="WageFlow" width={64} height={64} priority />
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">P45 Details</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => (history.length > 1 ? router.back() : router.push('/dashboard'))}
              className={ACTION_BTN}
              aria-label="Back"
            >
              Back
            </button>
            <Link href="/dashboard/companies" className={ACTION_BTN} aria-label="Company Selection">
              Company Selection
            </Link>
          </div>
        </div>

        <div className={CARD}>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <>
              {err ? (
                <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                  {err}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-900">Employer PAYE reference</label>
                  <input
                    name="employer_paye_ref"
                    value={form.employer_paye_ref || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-900">Employer name</label>
                  <input
                    name="employer_name"
                    value={form.employer_name || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-900">Works/payroll number</label>
                  <input
                    name="works_number"
                    value={form.works_number || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-900">Leaving date</label>
                  <input
                    type="date"
                    name="leaving_date"
                    value={form.leaving_date || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-900">Tax code</label>
                  <input
                    name="tax_code"
                    value={form.tax_code || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-900">Tax basis</label>
                  <select
                    name="tax_basis"
                    value={form.tax_basis || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  >
                    <option value="Cumulative">Cumulative</option>
                    <option value="Week1Month1">Week1Month1</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-neutral-900">Total pay to date</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="total_pay_to_date"
                    value={form.total_pay_to_date ?? ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-900">Total tax to date</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="total_tax_to_date"
                    value={form.total_tax_to_date ?? ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>

                <label className="mt-2 flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    name="had_student_loan_deductions"
                    checked={!!form.had_student_loan_deductions}
                    onChange={onChange}
                  />
                  <span className="text-sm text-neutral-900">
                    Student loan deductions were being made
                  </span>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Link
                  href={`/dashboard/employees/${id}/edit`}
                  className="rounded-md bg-neutral-400 px-4 py-2 text-white"
                >
                  Cancel
                </Link>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save and continue'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
