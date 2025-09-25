/* @ts-nocheck */
// app/dashboard/payroll/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

type Frequency = 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly';
type Status = 'draft' | 'processing' | 'approved' | 'rti_submitted' | 'completed';

type Run = {
  id: string;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  frequency: Frequency;
  status: Status;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;           // pay_run_employees.id
  employeeId: string;   // employees.id
  employeeName: string;
  employeeNumber: string;
  email: string;
  gross: number;
  deductions: number;
  net: number;
};

type ApiResponse = {
  run: Run;
  employees: Row[];
  totals: {
    total_gross: number;
    total_deductions: number;
    total_net: number;
    employee_count: number;
  };
};

const S = {
  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
    padding: '24px 12px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  } as CSSProperties,
  wrap: {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'grid',
    gap: '16px',
  } as CSSProperties,
  headerRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
  } as CSSProperties,
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'white',
  } as CSSProperties,
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  } as CSSProperties,
  btn: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '0.95rem',
  } as CSSProperties,
  success: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    color: '#065f46',
    border: '1px solid #10b981',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '0.95rem',
  } as CSSProperties,
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  } as CSSProperties,
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: '16px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
    padding: '16px',
    textAlign: 'center',
  } as CSSProperties,
  cardLabel: {
    marginBottom: '4px',
    opacity: 0.8,
    fontSize: '0.85rem',
  } as CSSProperties,
  cardValue: {
    fontSize: '1.6rem',
    fontWeight: 800,
  } as CSSProperties,
  section: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
    padding: '16px',
  } as CSSProperties,
  tableWrap: {
    overflowX: 'auto',
  } as CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
  } as CSSProperties,
  th: {
    textAlign: 'left',
    padding: '12px',
    fontSize: '0.9rem',
    color: '#1e3a8a',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  td: {
    padding: '12px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.95rem',
    verticalAlign: 'middle',
  } as CSSProperties,
  input: {
    width: '110px',
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    fontSize: '0.95rem',
    textAlign: 'right',
  } as CSSProperties,
  error: {
    color: '#b91c1c',
    fontSize: '0.85rem',
    marginTop: '8px',
  } as CSSProperties,
  footerRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  } as CSSProperties,
  footerRight: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  } as CSSProperties,
  statusPill: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    backgroundColor: 'rgba(30,64,175,0.15)',
    color: '#1e40af',
    fontWeight: 700,
    fontSize: '0.8rem',
  } as CSSProperties,
  meta: { display: 'flex', gap: '12px', flexWrap: 'wrap', color: 'white' } as CSSProperties,
  metaItem: { display: 'flex', gap: '6px', alignItems: 'center' } as CSSProperties,
  green: { color: '#059669', fontWeight: 700 } as CSSProperties,
  blue: { color: '#1e40af', fontWeight: 700 } as CSSProperties,
};

function gbp(n: number) {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
}
function toNumberSafe(v: string | number): number {
  const n = typeof v === 'number' ? v : parseFloat(v.replace(/[^\d.-]/g, ''));
  return isFinite(n) ? n : 0;
}

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params?.id as string;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [approvedMsg, setApprovedMsg] = useState<string | null>(null);

  const load = async () => {
    setApprovedMsg(null);
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/${runId}`, { cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to load run ${runId}`);
      }
      const j: ApiResponse = await res.json();
      setData(j);
      setRows(j.employees);
      setDirty(false);
      setValidation({});
    } catch (e: any) {
      setErr(e.message || 'Error loading run');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (runId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const totals = useMemo(() => {
    const tg = rows.reduce((a, r) => a + r.gross, 0);
    const td = rows.reduce((a, r) => a + r.deductions, 0);
    const tn = rows.reduce((a, r) => a + r.net, 0);
    return { tg, td, tn };
  }, [rows]);

  const onChangeCell = (id: string, field: 'gross' | 'deductions' | 'net', value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r };
        const n = toNumberSafe(value);
        next[field] = n;
        if (field === 'gross' || field === 'deductions') {
          next.net = Number((next.gross - next.deductions).toFixed(2));
        }
        return next;
      })
    );
    setDirty(true);
  };

  useEffect(() => {
    const v: Record<string, string> = {};
    for (const r of rows) {
      if (r.gross < 0) v[r.id] = 'Gross cannot be negative';
      else if (r.deductions < 0) v[r.id] = 'Deductions cannot be negative';
      else if (r.net < 0) v[r.id] = 'Net cannot be negative';
    }
    setValidation(v);
  }, [rows]);

  const hasErrors = Object.keys(validation).length > 0;

  const saveChanges = async () => {
    try {
      setSaving(true);
      setErr(null);
      const payload = {
        items: rows.map((r) => ({
          id: r.id,
          gross: Number(r.gross.toFixed(2)),
          deductions: Number(r.deductions.toFixed(2)),
          net: Number(r.net.toFixed(2)),
        })),
      };
      const res = await fetch(`/api/payroll/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save changes');
      }
      const j: ApiResponse = await res.json();
      setData(j);
      setRows(j.employees);
      setDirty(false);
    } catch (e: any) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const canApprove =
    data &&
    (data.run.status === 'draft' || data.run.status === 'processing') &&
    rows.length > 0 &&
    !dirty &&
    !hasErrors;

  const approveRun = async () => {
    try {
      setSaving(true);
      setErr(null);
      const res = await fetch(`/api/payroll/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to approve run');
      }
      const j: ApiResponse = await res.json();
      setData(j);
      setRows(j.employees);
      setDirty(false);
      setApprovedMsg('Run approved. FPS queued in RTI logs.');
    } catch (e: any) {
      setErr(e.message || 'Approval failed');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const url = `/api/payroll/${runId}/export`;
    window.location.href = url;
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.headerRow}>
          <div style={S.title}>
            <span>Payroll Run</span>
            {data ? <span style={S.statusPill}>{data.run.status.toUpperCase()}</span> : null}
          </div>
          <div style={S.navActions}>
            <Link href="/dashboard/payroll" style={S.btn}>Back to Runs</Link>
            <button type="button" onClick={exportCsv} style={{ ...S.btn, backgroundColor: '#059669' }}>
              Export CSV
            </button>
          </div>
        </div>

        <div style={S.meta}>
          <div style={S.metaItem}>
            <span>Run:</span>
            <span className={inter.className} style={S.blue}>{data?.run.runNumber ?? 'â€”'}</span>
          </div>
          <div style={S.metaItem}>
            <span>Period:</span>
            <span className={inter.className} style={S.green}>
              {data ? `${data.run.periodStart} to ${data.run.periodEnd}` : 'â€”'}
            </span>
          </div>
          <div style={S.metaItem}>
            <span>Pay date:</span>
            <span className={inter.className} style={S.blue}>{data?.run.payDate ?? 'â€”'}</span>
          </div>
        </div>

        {approvedMsg && <div style={S.success}>{approvedMsg}</div>}
        {err && <div style={S.error}>{err}</div>}

        <div style={S.cardGrid}>
          <div style={S.card}>
            <div style={S.cardLabel}>Employees</div>
            <div className={inter.className} style={S.cardValue}>
              {data?.totals.employee_count ?? (loading ? '...' : 0)}
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Total Gross</div>
            <div className={inter.className} style={S.cardValue}>
              {gbp(totals.tg)}
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Total Net</div>
            <div className={inter.className} style={S.cardValue}>
              {gbp(totals.tn)}
            </div>
          </div>
        </div>

        <div style={S.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Employees in this run
            </h2>
            <div style={{ fontSize: '0.9rem', color: '#334155' }}>
              Edit amounts, save, export CSV, or open a payslip.
            </div>
          </div>

          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Employee</th>
                  <th style={S.th}>Number</th>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Gross</th>
                  <th style={S.th}>Deductions</th>
                  <th style={S.th}>Net</th>
                  <th style={S.th}>Payslip</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td style={S.td} colSpan={7}>Loadingâ€¦</td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td style={S.td} colSpan={7}>No employees attached to this run.</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={S.td}>{r.employeeName}</td>
                    <td style={S.td}>{r.employeeNumber || 'â€”'}</td>
                    <td style={S.td}>{r.email || 'â€”'}</td>
                    <td style={S.td}>
                      <input
                        className={inter.className}
                        type="number"
                        step="0.01"
                        style={S.input}
                        value={isFinite(r.gross) ? r.gross : 0}
                        onChange={(e) => onChangeCell(r.id, 'gross', e.target.value)}
                      />
                    </td>
                    <td style={S.td}>
                      <input
                        className={inter.className}
                        type="number"
                        step="0.01"
                        style={S.input}
                        value={isFinite(r.deductions) ? r.deductions : 0}
                        onChange={(e) => onChangeCell(r.id, 'deductions', e.target.value)}
                      />
                    </td>
                    <td style={S.td}>
                      <input
                        className={inter.className}
                        type="number"
                        step="0.01"
                        style={S.input}
                        value={isFinite(r.net) ? r.net : 0}
                        onChange={(e) => onChangeCell(r.id, 'net', e.target.value)}
                      />
                      {validation[r.id] && <div style={S.error}>{validation[r.id]}</div>}
                    </td>
                    <td style={S.td}>
                      <Link href={`/dashboard/payroll/${runId}/payslip/${r.employeeId}`} style={{ ...S.btn, padding: '6px 10px' }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, fontSize: '0.9rem', color: '#334155' }}>
            Live totals reflect your edits. Net defaults to Gross minus Deductions.
          </div>
        </div>

        <div style={S.footerRow}>
          <div />
          <div style={S.footerRight}>
            <button
              type="button"
              onClick={saveChanges}
              disabled={!dirty || hasErrors || saving}
              style={{
                ...S.btn,
                backgroundColor: !dirty || hasErrors || saving ? '#1e40af' : '#059669',
                opacity: !dirty || hasErrors ? 0.6 : 1,
                cursor: !dirty || hasErrors ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Savingâ€¦' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={approveRun}
              disabled={
                !(
                  data &&
                  (data.run.status === 'draft' || data.run.status === 'processing') &&
                  rows.length > 0 &&
                  !dirty &&
                  !hasErrors
                ) || saving
              }
              style={{
                ...S.btn,
                backgroundColor: '#059669',
                opacity:
                  !(
                    data &&
                    (data.run.status === 'draft' || data.run.status === 'processing') &&
                    rows.length > 0 &&
                    !dirty &&
                    !hasErrors
                  ) || saving
                    ? 0.6
                    : 1,
                cursor:
                  !(
                    data &&
                    (data.run.status === 'draft' || data.run.status === 'processing') &&
                    rows.length > 0 &&
                    !dirty &&
                    !hasErrors
                  ) || saving
                    ? 'not-allowed'
                    : 'pointer',
              }}
              title="Approve and queue FPS"
            >
              {saving ? 'Workingâ€¦' : 'Approve run'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

