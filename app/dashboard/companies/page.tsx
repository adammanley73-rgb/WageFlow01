'use client';
/* @ts-nocheck */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageTemplate from '@/components/layout/PageTemplate';

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
        router.push('/dashboard');
        return;
      }
    } catch {
      /* fall back */
    }
    document.cookie = `company_id=${encodeURIComponent(id)}; path=/; SameSite=Lax`;
    router.push('/dashboard');
  }

  return (
    <PageTemplate title="Companies" currentSection="Companies">
      {/* Grey outer card to match your standard */}
      <div
        className="rounded-2xl ring-1 border shadow p-4 ring-neutral-400 border-neutral-400"
        style={{ backgroundColor: '#d4d4d4' }}
      >
        <div className="mb-3 text-sm text-neutral-700">
          Select the company you want to work on.
        </div>

        {loading && <div className="text-neutral-800">Loading companies…</div>}
        {error && <div className="text-red-600">Error: {error}</div>}

        {!loading && !error && (
          <>
            {/* Column labels to align with tiles */}
            <div className="hidden md:grid md:grid-cols-12 md:gap-2 px-1 pb-2">
              <div className="md:col-span-7 text-sm font-semibold text-neutral-900">Name</div>
              <div className="md:col-span-3 text-sm font-semibold text-neutral-900">Created</div>
              <div className="md:col-span-2" />
            </div>

            {/* White rounded row tiles */}
            <div className="space-y-3">
              {companies.length === 0 && (
                <div className="bg-white rounded-xl ring-1 ring-neutral-200 shadow px-4 py-6 text-neutral-700">
                  No companies found.
                </div>
              )}

              {companies.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl ring-1 ring-neutral-200 shadow px-3 py-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-7 text-neutral-900">{c.name}</div>
                    <div className="md:col-span-3 text-neutral-700">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                    </div>
                    <div className="md:col-span-2 text-left md:text-right">
                      <button
                        type="button"
                        onClick={() => selectCompany(c.id)}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl ring-1 border text-sm font-medium select-none bg-[#1e40af] text-white ring-[#1e40af] border-[#1e40af] hover:opacity-90"
                      >
                        Select company
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}
