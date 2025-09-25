/* @ts-nocheck */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const NAV_CHIP =
  'w-32 text-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const CARD =
  'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';

type StarterRow = {
  p45_provided: boolean;
  starter_declaration: 'A' | 'B' | 'C' | null;
  student_loan_plan: 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | null;
  postgraduate_loan: boolean;
};

export default function StarterPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ''), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Controlled defaults
  const [p45, setP45] = useState(false);
  const [starter, setStarter] = useState<'A' | 'B' | 'C' | ''>('A');
  const [loan, setLoan] =
    useState<'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5'>('none');
  const [pgLoan, setPgLoan] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch(`/api/employees/${id}/starter`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`load ${r.status}`);
        const j = await r.json();
        const d = (j?.data ?? null) as Partial<StarterRow> | null;

        if (alive && d) {
          setP45(!!d.p45_provided);
          setStarter((d.starter_declaration as any) || 'A');
          setLoan((d.student_loan_plan as any) || 'none');
          setPgLoan(!!d.postgraduate_loan);
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

  async function onSave() {
    if (!p45 && (starter as string).trim() === '') {
      alert('Select a Starter Declaration when no P45 is provided.');
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const body = {
        p45_provided: p45,
        starter_declaration: p45 ? null : starter,
        student_loan_plan: loan === 'none' ? null : loan,
        postgraduate_loan: pgLoan,
      };

      const res = await fetch(`/api/employees/${id}/starter`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.detail || json?.error || `save ${res.status}`;
        throw new Error(msg);
      }

      // Only change: route based on P45
      const nextHref = p45
        ? `/dashboard/employees/${id}/wizard/p45`
        : `/dashboard/employees/${id}/wizard/bank`;
      router.push(nextHref);
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
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">Starter Details</h1>
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
              {err ? (
                <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                  {err}
                </div>
              ) : null}

              <div className="space-y-6">
                {/* P45 provided */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={p45}
                    onChange={(e) => setP45(e.target.checked)}
                  />
                  <span className="text-sm text-neutral-900">P45 provided</span>
                </label>

                {/* Starter Declaration */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-neutral-900">Starter Declaration</div>
                  <select
                    className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={starter}
                    onChange={(e) => setStarter(e.target.value as 'A' | 'B' | 'C' | '')}
                    disabled={p45}
                  >
                    <option value="">Select…</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>

                {/* Student loan */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-neutral-900">Student loan plan</div>
                  <select
                    className="w-full rounded-md border border-neutral-400 bg-white p-2"
                    value={loan}
                    onChange={(e) =>
                      setLoan(e.target.value as 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5')
                    }
                  >
                    <option value="none">None</option>
                    <option value="plan1">Plan 1</option>
                    <option value="plan2">Plan 2</option>
                    <option value="plan4">Plan 4</option>
                    <option value="plan5">Plan 5</option>
                  </select>
                </div>

                {/* Postgraduate loan */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pgLoan}
                    onChange={(e) => setPgLoan(e.target.checked)}
                  />
                  <span className="text-sm text-neutral-900">Postgraduate loan</span>
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

