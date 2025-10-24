'use client';
/* app/dashboard/companies/page.tsx */
/* @ts-nocheck */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Company = {
  id: string;
  name: string;
  created_at?: string;
};

function normalizeCompanies(input: any): Company[] {
  const maybeArray = Array.isArray(input)
    ? input
    : Array.isArray(input?.data)
    ? input.data
    : Array.isArray(input?.companies)
    ? input.companies
    : [];

  return maybeArray
    .map((c: any) => {
      const id = c.id ?? c.company_id ?? c.uuid ?? '';
      const name = c.name ?? c.company_name ?? c.display_name ?? '';
      const created_at = c.created_at ?? c.inserted_at ?? c.createdAt ?? undefined;
      return { id, name, created_at };
    })
    .filter((c: Company) => c.id && c.name);
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetch('/api/companies', { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const raw = await r.json().catch(() => []);
        const list = normalizeCompanies(raw);
        if (alive) setCompanies(list);
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'Failed to load companies');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function selectCompany(id: string) {
    try {
      const res = await fetch('/api/select-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: id }),
      });

      if (res.ok) {
        console.log('Company selected:', id);
        window.location.href = '/dashboard';
        return;
      } else {
        console.error('Select company failed:', res.status);
      }
    } catch (err) {
      console.error('Select company error:', err);
    }
  }

  return (
    <section className="bg-neutral-200 rounded-2xl ring-1 ring-neutral-400 p-6">
      <p className="text-neutral-800 mb-4">Select the company you want to work on.</p>

      {loading && <div className="text-neutral-800">Loading companies…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-[1fr_220px_160px] items-center px-3 py-2 text-sm font-semibold text-neutral-800">
            <span>Name</span>
            <span>Created</span>
            <span className="sr-only">Action</span>
          </div>

          <div className="grid gap-3">
            {companies.length === 0 && (
              <div className="rounded-xl bg-white ring-1 ring-neutral-300 px-4 py-6 text-neutral-700">
                No companies available.
              </div>
            )}

            {companies.map((c) => (
              <div
                key={c.id}
                className="rounded-xl bg-white ring-1 ring-neutral-300 px-4 py-3 flex items-center"
              >
                <div className="flex-1">
                  <div className="font-medium text-neutral-900">{c.name}</div>
                </div>
                <div className="w-[220px] text-neutral-700">
                  {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                </div>
                <div className="w-[160px] flex justify-end">
                  <button
                    type="button"
                    onClick={() => selectCompany(c.id)}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-white font-semibold bg-[#1f3cb3] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1f3cb3]"
                  >
                    Select company
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
