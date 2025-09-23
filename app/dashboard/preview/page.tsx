// app/dashboard/preview/page.tsx
// Simple preview UI to call /api/preview and show PAYE results.

'use client';

import React, { useEffect, useState } from 'react';

interface PreviewResponse {
  ok: boolean;
  runId: string | null;
  params: {
    grossForPeriod: number;
    taxCode: string;
    period: number;
  };
  pay: {
    gross: number;
    tax: number;
    net: number;
  };
  paye: {
    slices: { rate: number; amount: number; tax: number; label: string }[];
  };
}

export default function PreviewPage() {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await fetch('http://localhost:3001/api/preview?runId=test&gross=2000&taxCode=1257L&period=1');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message ?? 'Failed to fetch');
      }
    }
    fetchPreview();
  }, []);

  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-6">Loading preview…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">PAYE Preview</h1>
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
    </div>
  );
}
