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

// Helpers
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);

const fmtDate = (iso?: string) => {
  if (!iso) return 'â€”';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'â€”';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// Minimal stat value styling while keeping system font for body elsewhere
function StatValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-xs text-neutral-600">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

export default function ReportsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [rti, setRti] = useState<RtiLog[]>([]);
  const [rtiLoading, setRtiLoading] = useState(true);
  const [csvBusy, setCsvBusy] = useState(false);

  // Load payroll runs from your existing API if present
  useEffect(() => {
    let alive = true;

    const loadRuns = async () => {
      setRunsLoading(true);
      try {
        const res = await fetch('/api/payroll', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // Expect array; fallback to empty
          const arr: PayrollRun[] = Array.isArray(data) ? data : Array.isArray(data?.runs) ? data.runs : [];
          if (alive) setRuns(arr);
        } else {
          if (alive) setRuns([]); // zero-state
        }
      } catch {
        if (alive) setRuns([]); // zero-state
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
          const arr: RtiLog[] = Array.isArray(data) ? data : Array.isArray(data?.logs) ? data.logs : [];
          if (alive) setRti(arr);
        } else {
          if (alive) setRti([]); // placeholder
        }
      } catch {
        if (alive) setRti([]); // placeholder
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

  // Derived aggregates
  const aggregates = useMemo(() => {
    const gross = runs.reduce((s, r) => s + (r.totalGrossPay ?? 0), 0);
    const net = runs.reduce((s, r) => s + (r.totalNetPay ?? 0), 0);
    const ded = runs.reduce((s, r) => {
      const d = r.totalDeductions ?? Math.max(0, (r.totalGrossPay ?? 0) - (r.totalNetPay ?? 0));
      return s + d;
    }, 0);
    return { gross, net, ded, count: runs.length };
  }, [runs]);

  // CSV export
  const handleExportCsv = async () => {
    try {
      setCsvBusy(true);
      const headers = [
        'Run ID',
        'Run Number',
        'Pay Date',
        'Status',
        'Total Gross (Â£)',
        'Total Deductions (Â£)',
        'Total Net (Â£)',
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={csvBusy || runsLoading || runs.length === 0}
            className="px-3 py-2 rounded-xl bg-[#1e40af] text-white text-sm font-medium disabled:opacity-50"
            title="Export payroll summary as CSV"
          >
            {csvBusy ? 'Exportingâ€¦' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-neutral-200">
          <StatValue label="Payroll Runs" value={String(aggregates.count)} />
        </div>
        <div className="p-4 rounded-2xl bg-white border border-neutral-200">
          <StatValue label="Total Gross" value={fmtCurrency(aggregates.gross)} />
        </div>
        <div className="p-4 rounded-2xl bg-white border border-neutral-200">
          <StatValue label="Total Deductions" value={fmtCurrency(aggregates.ded)} />
        </div>
        <div className="p-4 rounded-2xl bg-white border border-neutral-200">
          <StatValue label="Total Net" value={fmtCurrency(aggregates.net)} />
        </div>
      </div>

      {/* Payroll summary table */}
      <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Payroll Summary</h2>
          {runsLoading && <span className="text-sm text-neutral-500">Loadingâ€¦</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="px-4 py-2">Run Number</th>
                <th className="px-4 py-2">Pay Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Gross</th>
                <th className="px-4 py-2 text-right">Deductions</th>
                <th className="px-4 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && !runsLoading ? (
                <tr>
                  <td className="px-4 py-6 text-neutral-500" colSpan={6}>
                    No payroll runs found. Create a run in Payroll and come back to view reports.
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const gross = r.totalGrossPay ?? 0;
                  const net = r.totalNetPay ?? 0;
                  const ded = r.totalDeductions ?? Math.max(0, gross - net);
                  return (
                    <tr key={r.id} className="border-t border-neutral-200">
                      <td className="px-4 py-2">{r.runNumber ?? 'â€”'}</td>
                      <td className="px-4 py-2">{fmtDate(r.payDate)}</td>
                      <td className="px-4 py-2">{r.status ?? 'â€”'}</td>
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

      {/* RTI submission log */}
      <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">RTI Submission Log</h2>
          {rtiLoading && <span className="text-sm text-neutral-500">Loadingâ€¦</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {rti.length === 0 && !rtiLoading ? (
                <tr>
                  <td className="px-4 py-6 text-neutral-500" colSpan={6}>
                    No RTI submissions logged yet. Submit FPS from a payroll run to populate this table.
                  </td>
                </tr>
              ) : (
                rti.map((x) => (
                  <tr key={x.id} className="border-t border-neutral-200">
                    <td className="px-4 py-2">{x.type}</td>
                    <td className="px-4 py-2">{x.period ?? 'â€”'}</td>
                    <td className="px-4 py-2">{fmtDate(x.submittedAt)}</td>
                    <td className="px-4 py-2">{x.reference ?? 'â€”'}</td>
                    <td className="px-4 py-2">{x.status ?? 'â€”'}</td>
                    <td className="px-4 py-2">{x.message ?? 'â€”'}</td>
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

