// app/dashboard/preview/page.tsx
'use client';

import React, { useEffect, useState } from 'react';

interface PreviewResponse {
  ok: boolean;
  runId: string | null;
  params: { grossForPeriod: number; taxCode: string; period: number };
  pay: { gross: number; tax: number; net: number };
  paye: { slices: { rate: number; amount: number; tax: number; label: string }[] };
}

export default function PreviewPage() {
  const [gross, setGross] = useState<string>('2000');
  const [taxCode, setTaxCode] = useState<string>('1257L');
  const [period, setPeriod] = useState<string>('1');
  const [ytdTaxable, setYtdTaxable] = useState<string>('0');
  const [ytdTaxPaid, setYtdTaxPaid] = useState<string>('0');

  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchPreview() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const qs = new URLSearchParams({
        runId: 'test',
        gross: gross.trim(),
        taxCode: taxCode.trim(),
        period: period.trim(),
        ytdTaxable: ytdTaxable.trim(),
        ytdTaxPaid: ytdTaxPaid.trim()
      }).toString();

      const res = await fetch(`/api/preview?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as PreviewResponse;
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  // Load once with defaults
  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">PAYE Preview</h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Gross</span>
          <input className="border rounded p-2" value={gross} onChange={e => setGross(e.target.value)} inputMode="decimal" />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-gray-600">Tax code</span>
          <input className="border rounded p-2" value={taxCode} onChange={e => setTaxCode(e.target.value)} placeholder="1257L or 1257L M1 or BR or D0" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Period 1..12</span>
          <input className="border rounded p-2" value={period} onChange={e => setPeriod(e.target.value)} inputMode="numeric" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">YTD taxable</span>
          <input className="border rounded p-2" value={ytdTaxable} onChange={e => setYtdTaxable(e.target.value)} inputMode="decimal" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">YTD tax paid</span>
          <input className="border rounded p-2" value={ytdTaxPaid} onChange={e => setYtdTaxPaid(e.target.value)} inputMode="decimal" />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={fetchPreview}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Preview'}
        </button>
        {error && <span className="text-red-600">Error: {error}</span>}
      </div>

      {data && (
        <>
          <div className="border rounded p-4 bg-gray-50">
            <p><strong>Gross:</strong> £{data.pay.gross.toFixed(2)}</p>
            <p><strong>Tax:</strong> £{data.pay.tax.toFixed(2)}</p>
            <p><strong>Net:</strong> £{data.pay.net.toFixed(2)}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Slices</h2>
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Band</th>
                  <th className="p-2 border">Amount</th>
                  <th className="p-2 border">Rate</th>
                  <th className="p-2 border">Tax</th>
                </tr>
              </thead>
              <tbody>
                {data.paye.slices.map((s, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{s.label}</td>
                    <td className="p-2 border">£{s.amount.toFixed(2)}</td>
                    <td className="p-2 border">{(s.rate * 100).toFixed(0)}%</td>
                    <td className="p-2 border">£{s.tax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
