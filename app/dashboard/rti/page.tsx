/* @ts-nocheck */
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { supabase } from '../../lib/supabase';
import { PageShell, Header, Button, LinkButton } from '../../../components/ui/wf-ui';

type RTILog = {
  id: string;
  created_at: string;
  run_id: string | null;
  status: string | null; // 'queued' | 'sent' | 'error' | null
  payload: Record<string, any> | null;
};

type StatusFilter = 'all' | 'queued' | 'sent' | 'error';

const S = {
  section: {
    marginTop: '12px',
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '1rem',
    padding: '12px 12px',
  } as CSSProperties,
  filterRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
    gap: '8px',
    alignItems: 'end',
  } as CSSProperties,
  label: {
    fontSize: '12px',
    color: 'rgba(0,0,0,0.65)',
    marginBottom: '4px',
    display: 'block',
  } as CSSProperties,
  input: {
    display: 'block',
    width: '100%',
    height: '38px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.08)',
    padding: '0 10px',
    background: '#fff',
    fontSize: '14px',
  } as CSSProperties,
  select: {
    display: 'block',
    width: '100%',
    height: '38px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.08)',
    padding: '0 10px',
    background: '#fff',
    fontSize: '14px',
  } as CSSProperties,
  tableWrap: {
    overflowX: 'auto',
    marginTop: '12px',
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '1rem',
  } as CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  } as CSSProperties,
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontWeight: 600,
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  td: {
    padding: '10px 16px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    verticalAlign: 'top',
  } as CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(30,64,175,0.08)',
    color: '#1e40af',
    fontSize: '12px',
    fontWeight: 600,
  } as CSSProperties,
  empty: {
    padding: '24px 16px',
    color: 'rgba(0,0,0,0.6)',
  } as CSSProperties,
  error: {
    padding: '12px 16px',
    marginTop: '12px',
    borderRadius: '8px',
    background: 'rgba(220,38,38,0.08)',
    color: '#991b1b',
    fontWeight: 600,
  } as CSSProperties,
  // Drawer
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    zIndex: 50,
  } as CSSProperties,
  drawer: {
    width: 'min(560px, 100%)',
    height: '100%',
    background: '#fff',
    padding: '16px',
    overflow: 'auto',
    boxShadow: '-12px 0 24px rgba(0,0,0,0.25)',
  } as CSSProperties,
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  } as CSSProperties,
  drawerTitle: {
    fontSize: '18px',
    fontWeight: 800,
  } as CSSProperties,
  fieldLabel: {
    fontSize: '12px',
    color: 'rgba(0,0,0,0.6)',
    marginTop: '8px',
  } as CSSProperties,
  fieldValue: {
    fontSize: '14px',
    fontWeight: 600,
  } as CSSProperties,
  pre: {
    marginTop: '10px',
    padding: '12px',
    background: 'rgba(0,0,0,0.04)',
    borderRadius: '10px',
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '12px',
    lineHeight: 1.5,
  } as CSSProperties,
};

function toGbDateTime(ts: string) {
  try {
    return new Date(ts).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export default function RTIPage() {
  // Data
  const [rows, setRows] = useState<RTILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState<StatusFilter>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [runQuery, setRunQuery] = useState<string>('');

  // Drawer
  const [openId, setOpenId] = useState<string | null>(null);
  const openRow = useMemo(() => rows.find(r => r.id === openId) || null, [rows, openId]);

  // Load with filters
  const load = async () => {
    try {
      setErr(null);
      setLoading(true);

      let q = supabase
        .from('rti_logs')
        .select('id, created_at, run_id, status, payload')
        .order('created_at', { ascending: false })
        .limit(100);

      if (status !== 'all') q = q.eq('status', status);
      if (from) q = q.gte('created_at', `${from}T00:00:00Z`);
      if (to) q = q.lte('created_at', `${to}T23:59:59Z`);
      if (runQuery.trim().length > 0) q = q.ilike('run_id', `%${runQuery.trim()}%`);

      const { data, error } = await q;
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load RTI logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setStatus('all');
    setFrom('');
    setTo('');
    setRunQuery('');
  };

  return (
    <PageShell>
      <Header
        title="RTI Logs"
        subtitle="View FPS submission records created during payroll approvals"
        actions={
          <>
            <LinkButton href="/dashboard/payroll" variant="primary">
              Back to Payroll
            </LinkButton>
          </>
        }
      />

      {/* Filters */}
      <div style={S.section}>
        <div style={S.filterRow}>
          <div>
            <label style={S.label}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              style={S.select}
            >
              <option value="all">All</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label style={S.label}>From date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={S.input}
            />
          </div>

          <div>
            <label style={S.label}>To date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={S.input}
            />
          </div>

          <div>
            <label style={S.label}>Run ID contains</label>
            <input
              type="text"
              placeholder="e.g. M202508"
              value={runQuery}
              onChange={(e) => setRunQuery(e.target.value)}
              style={S.input}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" onClick={load} title="Apply filters">
              Apply
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                clearFilters();
                // after state resets, load with cleared filters
                setTimeout(load, 0);
              }}
              title="Clear filters"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {err ? <div style={S.error}>{err}</div> : null}

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Created</th>
              <th style={S.th}>Run ID</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={S.td} colSpan={4}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td style={S.td} colSpan={4}>
                  <div style={S.empty}>
                    No RTI logs match your filters. Adjust filters or approve a payroll run to generate an FPS stub.
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td style={S.td}>{toGbDateTime(r.created_at)}</td>
                  <td style={S.td}>{r.run_id ?? '—'}</td>
                  <td style={S.td}>
                    <span style={S.badge}>{r.status ?? 'unknown'}</span>
                  </td>
                  <td style={S.td}>
                    <Button variant="secondary" onClick={() => setOpenId(r.id)}>
                      View details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {openRow ? (
        <div style={S.overlay} onClick={() => setOpenId(null)}>
          <div style={S.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={S.drawerHeader}>
              <div style={S.drawerTitle}>RTI Log</div>
              <Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button>
            </div>

            <div>
              <div style={S.fieldLabel}>Created</div>
              <div style={S.fieldValue}>{toGbDateTime(openRow.created_at)}</div>

              <div style={S.fieldLabel}>Run ID</div>
              <div style={S.fieldValue}>{openRow.run_id ?? '—'}</div>

              <div style={S.fieldLabel}>Status</div>
              <div style={S.fieldValue}>{openRow.status ?? 'unknown'}</div>

              <div style={S.fieldLabel}>Payload</div>
              <pre style={S.pre}>
                {JSON.stringify(openRow.payload ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

