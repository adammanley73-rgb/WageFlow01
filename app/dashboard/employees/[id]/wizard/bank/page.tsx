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

type BankRow = {
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
};

function isJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

export default function BankPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ''), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<BankRow>({
    account_name: '',
    sort_code: '',
    account_number: '',
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch(`/api/employees/${id}/bank`, { cache: 'no-store' });

        if (r.status === 204 || r.status === 404) return;
        if (!r.ok) throw new Error(`load ${r.status}`);

        if (isJson(r)) {
          const j = await r.json().catch(() => null);
          const d = (j?.data ?? j ?? null) as Partial<BankRow> | null;
          if (alive && d) {
            setForm((prev) => ({
              ...prev,
              account_name: d.account_name ?? prev.account_name,
              sort_code: d.sort_code ?? prev.sort_code,
              account_number: d.account_number ?? prev.account_number,
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

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSave() {
    try {
      setSaving(true);
      setErr(null);

      const payload: BankRow = {
        account_name: form.account_name || null,
        sort_code: form.sort_code || null,
        account_number: form.account_number || null,
      };

      const res = await fetch(`/api/employees/${id}/bank`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (isJson(res)) {
        await res.json().catch(() => null);
      }

      // Force redirect to Employees directory, no detours
      router.replace('/dashboard/employees');
      // Hard fallback in case something hijacks client routing
      setTimeout(() => {
        if (!location.pathname.endsWith('/dashboard/employees')) {
          window.location.href = '/dashboard/employees';
        }
      }, 50);
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
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image src="/WageFlowLogo.png" alt="WageFlow" width={64} height={64} priority />
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">Bank Details</h1>
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

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-neutral-900">Account name</label>
                  <input
                    name="account_name"
                    value={form.account_name || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-900">Sort code</label>
                  <input
                    name="sort_code"
                    value={form.sort_code || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-900">Account number</label>
                  <input
                    name="account_number"
                    value={form.account_number || ''}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Link
                  href={`/dashboard/employees`}
                  className="rounded-md bg-neutral-400 px-4 py-2 text-white"
                >
                  Cancel
                </Link>
                <button
                  type="button"
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
