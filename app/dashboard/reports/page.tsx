/* @ts-nocheck */
'use client';

import { useEffect, useMemo, useState } from 'react';

type PayrollRun = {
  id: string;
  runNumber?: string;
  payDate?: string; // ISO
  totalGrossPay?: number;
  totalNetPay?: number;
  totalDeductions?: number; // derived if not present
  status?: string;
};

type RtiLog = {
  id: string;
  type: 'FPS' | 'EPS';
  period?: string; // e.g., 2025-08
  submittedAt?: string; // ISO
  reference?: string;
  status?: 'accepted' | 'rejected' | 'pending';
  message?: string;
};

// --- helpers -----------------------------------------------------------------

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(n);

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// Top-row stat tile content: center aligned + bold title
function StatValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-sm font-bold">{label}</span>
      <span className="mt-1 text-3xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

// --- page --------------------------------------------------------------------

export default function ReportsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [rti, setRti] = useState<RtiLog[]>([]);
  const [rtiLoading, setRtiLoading] = useState(true);
  const [csvBusy, setCsvBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    const loadRuns = async () => {
      setRunsLoading(true);
      try {
        const res = await fetch('/api/payroll', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const arr: PayrollRun[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.runs)
            ? data.runs
            : [];
          if (alive) setRuns(arr);
        } else {
          if (alive) setRuns([]);
        }
      } catch {
        if (alive) setRuns([]);
      } finally {
        if (alive) setRunsLoading(false);
      }
    };

    const loadRti = async () => {
      setRtiLoading(true);
      try {
        const res = await fetch('/api/rti/logs', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const arr: RtiLog[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.logs)
            ? data.logs
            : [];
          if (alive) setRti(arr);
        } else {
          if (alive) setRti([]);
        }
      } catch {
        if (alive) setRti([]);
      } finally {
        if (alive) setRtiLoading(false);
      }
    };

    loadRuns();
    loadRti();
    return () => {
      alive = false;
    };
  }, []);

  // aggregates for the stat tiles
  const aggregates = useMemo(() => {
    const gross = runs.reduce((s, r) => s + (r.totalGrossPay ?? 0), 0);
    const net = runs.reduce((s, r) => s + (r.totalNetPay ?? 0), 0);
    const ded = runs.reduce((s, r) => {
      const d =
        r.totalDeductions ?? Math.max(0, (r.totalGrossPay ?? 0) - (r.totalNetPay ?? 0));
      return s + d;
    }, 0);
    return { gross, net, ded, count: runs.length };
  }, [runs]);

  const handleExportCsv = async () => {
    try {
      setCsvBusy(true);
      const headers = [
        'Run ID',
        'Run Number',
        'Pay Date',
        'Status',
        'Total Gross (£)',
        'Total Deductions (£)',
        'Total Net (£)',
      ];
      const rows = runs.map((r) => {
        const gross = r.totalGrossPay ?? 0;
        const net = r.totalNetPay ?? 0;
        const ded = r.totalDeductions ?? Math.max(0, gross - net);
        return [
          r.id ?? '',
          r.runNumber ?? '',
          fmtDate(r.payDate),
          r.status ?? '',
          gross.toFixed(2),
          ded.toFixed(2),
          net.toFixed(2),
        ].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wageflow-payroll-summary-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setCsvBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* actions (title is already in the banner) */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleExportCsv}
          disabled={csvBusy || runsLoading || runs.length === 0}
          className="px-3 py-2 rounded-xl bg-[#1e40af] text-white text-sm font-medium disabled:opacity-50"
          title="Export payroll summary as CSV"
        >
          {csvBusy ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* summary stat tiles – match dashboard grey + centered text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-5 rounded-2xl bg-[#d9d9d9] text-black">
          <StatValue label="Payroll Runs" value={String(aggregates.count)} />
        </div>
        <div className="p-5 rounded-2xl bg[#d9d9d9] text-black bg-[#d9d9d9]">
          <StatValue label="Total Gross" value={fmtCurrency(aggregates.gross)} />
        </div>
        <div className="p-5 rounded-2xl bg-[#d9d9d9] text-black">
          <StatValue label="Total Deductions" value={fmtCurrency(aggregates.ded)} />
        </div>
        <div className="p-5 rounded-2xl bg-[#d9d9d9] text-black">
          <StatValue label="Total Net" value={fmtCurrency(aggregates.net)} />
        </div>
      </div>

      {/* Payroll summary card – same grey as dashboard tiles + bold section title */}
      <div className="rounded-2xl bg-[#d9d9d9] text-black overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Payroll Summary</h2>
          {runsLoading && <span className="text-sm opacity-70">Loading…</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/70">
              <tr className="text-left">
                <th className="px-4 py-2">Run Number</th>
                <th className="px-4 py-2">Pay Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Gross</th>
                <th className="px-4 py-2 text-right">Deductions</th>
                <th className="px-4 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="bg-white/60">
              {runs.length === 0 && !runsLoading ? (
                <tr>
                  <td className="px-4 py-6 text-black/70" colSpan={6}>
                    No payroll runs found. Create a run in Payroll and come back to view reports.
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const gross = r.totalGrossPay ?? 0;
                  const net = r.totalNetPay ?? 0;
                  const ded = r.totalDeductions ?? Math.max(0, gross - net);
                  return (
                    <tr key={r.id} className="border-t border-black/10">
                      <td className="px-4 py-2">{r.runNumber ?? '—'}</td>
                      <td className="px-4 py-2">{fmtDate(r.payDate)}</td>
                      <td className="px-4 py-2">{r.status ?? '—'}</td>
                      <td className="px-4 py-2 text-right">{fmtCurrency(gross)}</td>
                      <td className="px-4 py-2 text-right">{fmtCurrency(ded)}</td>
                      <td className="px-4 py-2 text-right">{fmtCurrency(net)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RTI log card – same grey + bold title */}
      <div className="rounded-2xl bg-[#d9d9d9] text-black overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">RTI Submission Log</h2>
          {rtiLoading && <span className="text-sm opacity-70">Loading…</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/70">
              <tr className="text-left">
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Message</th>
              </tr>
            </thead>
            <tbody className="bg-white/60">
              {rti.length === 0 && !rtiLoading ? (
                <tr>
                  <td className="px-4 py-6 text-black/70" colSpan={6}>
                    No RTI submissions logged yet. Submit FPS from a payroll run to populate this
                    table.
                  </td>
                </tr>
              ) : (
                rti.map((x) => (
                  <tr key={x.id} className="border-t border-black/10">
                    <td className="px-4 py-2">{x.type}</td>
                    <td className="px-4 py-2">{x.period ?? '—'}</td>
                    <td className="px-4 py-2">{fmtDate(x.submittedAt)}</td>
                    <td className="px-4 py-2">{x.reference ?? '—'}</td>
                    <td className="px-4 py-2">{x.status ?? '—'}</td>
                    <td className="px-4 py-2">{x.message ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
