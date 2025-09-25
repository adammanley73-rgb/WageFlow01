/* @ts-nocheck */
'use client';

import React, { useState } from 'react';

type ApiOk = {
  ok: true;
  input: {
    gross: number;
    code: string;
    period: number;
    ytdTaxable: number;
    ytdTaxPaid: number;
  };
  personalAllowance?: number;
  taxableAtBR?: number;
  taxBR?: number;
  taxableAtHR?: number;
  taxHR?: number;
  taxableAtAR?: number;
  taxAR?: number;
  totalTax?: number;
  net?: number;
};

type ApiErr = { ok: false; error?: string };

function isApiOk(x: unknown): x is ApiOk {
  return !!x && typeof (x as any).ok === 'boolean' && (x as any).ok === true;
}
function isApiErr(x: unknown): x is ApiErr {
  return !!x && typeof (x as any).ok === 'boolean' && (x as any).ok === false;
}

export default function PreviewPage() {
  const [gross, setGross] = useState<string>('2000');
  const [code, setCode] = useState<string>('1257L');
  const [period, setPeriod] = useState<string>('1');
  const [ytdTaxable, setYtdTaxable] = useState<string>('0');
  const [ytdTaxPaid, setYtdTaxPaid] = useState<string>('0');

  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiOk | ApiErr | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gross: Number(gross),
          code: code.trim(),
          period: Number(period),
          ytdTaxable: Number(ytdTaxable),
          ytdTaxPaid: Number(ytdTaxPaid),
        }),
      });
      const json = (await r.json()) as unknown;
      setResp(isApiOk(json) || isApiErr(json) ? (json as any) : { ok: false, error: 'bad response' });
    } catch (err: any) {
      setResp({ ok: false, error: String(err?.message || err) });
    } finally {
      setLoading(false);
    }
  }

  const ok = isApiOk(resp) ? resp : null;
  const err = isApiErr(resp) ? resp : null;

  const outGross = ok && typeof ok.input?.gross === 'number' ? ok.input.gross : Number(gross) || 0;
  const outCode = ok && typeof ok.input?.code === 'string' ? ok.input.code : code;
  const outTax = ok && typeof ok.totalTax === 'number' ? ok.totalTax : 0;
  const outNet = ok && typeof ok.net === 'number' ? ok.net : Math.max(0, outGross - outTax);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">PAYE Preview</h1>

      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
        <input
          className="border rounded p-2"
          placeholder="Gross"
          value={gross}
          onChange={(e) => setGross(e.target.value)}
          inputMode="decimal"
        />
        <input
          className="border rounded p-2"
          placeholder="Tax code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Period 1..12"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          inputMode="numeric"
        />
        <input
          className="border rounded p-2"
          placeholder="YTD taxable"
          value={ytdTaxable}
          onChange={(e) => setYtdTaxable(e.target.value)}
          inputMode="decimal"
        />
        <input
          className="border rounded p-2"
          placeholder="YTD tax paid"
          value={ytdTaxPaid}
          onChange={(e) => setYtdTaxPaid(e.target.value)}
          inputMode="decimal"
        />

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-1 col-span-1 bg-black text-white rounded px-4 py-2"
        >
          {loading ? 'Calculatingâ€¦' : 'Preview'}
        </button>
      </form>

      {err && <p className="text-red-600">Error: {err.error || 'Unknown error'}</p>}

      {ok && (
        <div className="border rounded p-4 bg-gray-50 mt-2 space-y-1">
          <p><strong>Gross:</strong> Â£{outGross.toFixed(2)}</p>
          <p><strong>Code:</strong> {outCode}</p>
          <p><strong>Tax:</strong> Â£{(outTax ?? 0).toFixed(2)}</p>
          <p><strong>Net:</strong> Â£{outNet.toFixed(2)}</p>

          <div className="mt-3 text-sm text-gray-700">
            <p><strong>BR slice:</strong> Â£{(ok.taxableAtBR ?? 0).toFixed(2)} taxed Â£{(ok.taxBR ?? 0).toFixed(2)}</p>
            <p><strong>HR slice:</strong> Â£{(ok.taxableAtHR ?? 0).toFixed(2)} taxed Â£{(ok.taxHR ?? 0).toFixed(2)}</p>
            <p><strong>AR slice:</strong> Â£{(ok.taxableAtAR ?? 0).toFixed(2)} taxed Â£{(ok.taxAR ?? 0).toFixed(2)}</p>
            <p><strong>Allowance (monthly):</strong> Â£{(ok.personalAllowance ?? 0).toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

