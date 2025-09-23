'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const NAV_CHIP =
  'w-32 text-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const CARD =
  'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';

type P45Row = {
  employer_paye_ref: string | null;
  employer_name: string | null;
  works_number: string | null;
  tax_code: string;
  tax_basis: 'cumulative' | 'wk1mth1' | 'BR' | 'D0' | 'D1' | 'NT';
  prev_pay_to_date: number;
  prev_tax_to_date: number;
  leaving_date: string | null;
  student_loan_deductions: boolean;
};

export default function P45Page() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ''), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Controlled state
  const [employerPayeRef, setEmployerPayeRef] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [worksNumber, setWorksNumber] = useState('');
  const [taxCode, setTaxCode] = useState('1257L');
  const [taxBasis, setTaxBasis] =
    useState<'cumulative' | 'wk1mth1' | 'BR' | 'D0' | 'D1' | 'NT'>('cumulative');
  const [prevPay, setPrevPay] = useState<string>('0.00');
  const [prevTax, setPrevTax] = useState<string>('0.00');
  const [leavingDate, setLeavingDate] = useState<string>('');
  const [loanWasDeducted, setLoanWasDeducted] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch(`/api/employees/${id}/p45`, { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          const d = (j?.data ?? null) as Partial<P45Row> | null;
          if (alive && d) {
            setEmployerPayeRef(d.employer_paye_ref ?? '');
            setEmployerName(d.employer_name ?? '');
            setWorksNumber(d.works_number ?? '');
            setTaxCode(d.tax_code ?? '1257L');
            setTaxBasis((d.tax_basis as any) || 'cumulative');
            setPrevPay(String(d.prev_pay_to_date ?? '0.00'));
            setPrevTax(String(d.prev_tax_to_date ?? '0.00'));
            setLeavingDate(d.leaving_date ?? '');
            setLoanWasDeducted(!!d.student_loan_deductions);
          }
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const validMoney = (s: string) => /^\d{1,10}(\.\d{1,2})?$/.test(s.trim());

  async function onSave() {
    // Basic validations that match HMRC fields
    if (!taxCode.trim() && !['BR', 'D0', 'D1', 'NT'].includes(taxBasis)) {
      alert('Enter a tax code or choose BR/D0/D1/NT.');
      return;
    }
    if (!validMoney(prevPay) || !validMoney(prevTax)) {
      alert('Enter amounts as 0.00 with up to 2 decimals.');
      return;
    }

    try {
      setSaving(true);
      setErr(null);
      const body = {
        employer_paye_ref: employerPayeRef || null,
        employer_name: employerName || null,
        works_number: worksNumber || null,
        tax_code: taxCode || '1257L',
        tax_basis: taxBasis,
        prev_pay_to_date: Number(prevPay),
        prev_tax_to_date: Number(prevTax),
        leaving_date: leavingDate || null,
        student_loan_deductions: loanWasDeducted,
      };

      const res = await fetch(`/api/employees/${id}/p45`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || json?.error || `save ${res.status}`);

      router.push(`/dashboard/employees/${id}/wizard/bank`);
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
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image src="/WageFlowLogo.png" alt="WageFlow" width={64} height={64} priority />
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">P45 Details</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className={NAV_CHIP}>Dashboard</Link>
            <Link href="/dashboard/payroll" className={NAV_CHIP}>Payroll</Link>
            <Link href="/dashboard/absence" className={NAV_CHIP}>Absence</Link>
          </nav>
        </div>

        <div className={CARD}>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <>
              {err && (
                <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                  {err}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                  <div className="text-sm font-medium text-neutral-900 mb-1">Employer PAYE reference</div>
                  <input className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={employerPayeRef} onChange={(e) => setEmployerPayeRef(e.target.value)} />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900 mb-1">Employer name</div>
                  <input className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={employerName} onChange={(e) => setEmployerName(e.target.value)} />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900 mb-1">Works/payroll number</div>
                  <input className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={worksNumber} onChange={(e) => setWorksNumber(e.target.value)} />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900 mb-1">Leaving date</div>
                  <input type="date" className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={leavingDate} onChange={(e) => setLeavingDate(e.target.value)} />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900 mb-1">Tax code</div>
                  <input className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={taxCode} onChange={(e) => setTaxCode(e.target.value)}
                    placeholder="e.g. 1257L or leave blank when BR/D0/D1/NT" />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900 mb-1">Tax basis</div>
                  <select className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={taxBasis}
                    onChange={(e) => setTaxBasis(e.target.value as any)}>
                    <option value="cumulative">Cumulative</option>
                    <option value="wk1mth1">Week 1 / Month 1</option>
                    <option value="BR">BR</option>
                    <option value="D0">D0</option>
                    <option value="D1">D1</option>
                    <option value="NT">NT</option>
                  </select>
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900 mb-1">Total pay to date</div>
                  <input className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={prevPay} onChange={(e) => setPrevPay(e.target.value)} placeholder="0.00" />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900 mb-1">Total tax to date</div>
                  <input className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={prevTax} onChange={(e) => setPrevTax(e.target.value)} placeholder="0.00" />
                </div>

                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={loanWasDeducted}
                    onChange={(e) => setLoanWasDeducted(e.target.checked)} />
                  <span className="text-sm text-neutral-900">
                    Student loan deductions were being made
                  </span>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Link href={`/dashboard/employees/${id}/edit`}
                  className="rounded-md bg-neutral-400 px-4 py-2 text-white">
                  Cancel
                </Link>
                <button onClick={onSave} disabled={saving}
                  className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
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
