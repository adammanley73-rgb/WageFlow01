'use client';

import React, { useMemo, useState, useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import HeaderBanner from '@components/ui/HeaderBanner';
import { calculateSMP, type SmpResult } from '@lib/statutory/smp';
import { type PayItem } from '@lib/statutory/awe';

type ISODate = string;

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '24px 16px',
    background:
      'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
  },
  wrap: { maxWidth: 1100, margin: '0 auto' },

  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginTop: 16,
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, marginBottom: 2 },

  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontWeight: 700, fontSize: 14 },
  input: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 14,
    background: 'white',
  },
  select: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 14,
    background: 'white',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: 13,
    background: '#f8fafc',
    borderBottom: '1px solid #e5e7eb',
  },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' },

  hint: { fontSize: 12, color: '#6b7280' },

  actionsRow: {
    marginTop: 12,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    background: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: '#f3f4f6',
    color: '#111827',
    border: '1px solid #e5e7eb',
    padding: '10px 14px',
    borderRadius: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },

  // Results
  resultsCard: {
    background: 'white',
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    gridColumn: '1 / -1',
  },
  pillRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  pill: {
    padding: '6px 10px',
    borderRadius: 9999,
    background: '#eef2ff',
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: 700,
  },
  problems: {
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  schedule: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    marginTop: 8,
  },
};

function d(date: ISODate): Date {
  const [y, m, day] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
function toISO(x: Date): ISODate {
  return x.toISOString().slice(0, 10);
}
function addDays(date: ISODate, days: number): ISODate {
  const t = d(date);
  t.setUTCDate(t.getUTCDate() + days);
  return toISO(t);
}
function addWeeks(date: ISODate, weeks: number): ISODate {
  return addDays(date, weeks * 7);
}
function saturdayOfWeekContaining(date: ISODate): ISODate {
  const dt = d(date);
  const dow = dt.getUTCDay(); // 0 Sun .. 6 Sat
  const delta = 6 - dow;
  dt.setUTCDate(dt.getUTCDate() + delta);
  return toISO(dt);
}

/**
 * Given the expected date of childbirth (EWC, any day of that week),
 * find the Saturday of that EWC week, then go back 15 weeks to get
 * the Qualifying Week Saturday.
 */
function qualifyingWeekSaturdayFromEWC(ewc: ISODate): ISODate {
  const ewcSat = saturdayOfWeekContaining(ewc);
  // 15 weeks before the EWC week
  return addWeeks(ewcSat, -15);
}

function nextAbsenceId(): string {
  if (typeof window === 'undefined') return 'A001';
  try {
    const raw = window.localStorage.getItem('absenceStore');
    const store = raw ? JSON.parse(raw) : { records: [] as any[] };
    const list: any[] = Array.isArray(store) ? store : store.records ?? [];
    const nums = list
      .map(r => r.id)
      .filter(Boolean)
      .map((id: string) => Number(String(id).replace(/^A/, '')))
      .filter(n => !Number.isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `A${String(next).padStart(3, '0')}`;
  } catch {
    return 'A001';
  }
}

type PaymentRow = PayItem;

export default function AbsenceNewMaternityPage() {
  const r = useRouter();

  // Basic details
  const [employeeName, setEmployeeName] = useState('');
  const [ewc, setEwc] = useState<ISODate>('');
  const [payStartDate, setPayStartDate] = useState<ISODate>('');
  const [serviceWeeksAtQW, setServiceWeeksAtQW] = useState<number>(26);

  // Pay items used for AWE
  const [rows, setRows] = useState<PaymentRow[]>([
    { paidOn: '', gross: 0 },
  ]);

  // Derived QW Saturday from EWC
  const qwSaturday = useMemo(() => (ewc ? qualifyingWeekSaturdayFromEWC(ewc) : ''), [ewc]);

  // Result
  const [result, setResult] = useState<SmpResult | null>(null);

  function setRow(i: number, patch: Partial<PaymentRow>) {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows(prev => [...prev, { paidOn: '', gross: 0 }]);
  }
  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }
  function prefillSample() {
    // 4 simple monthly pays spanning the relevant window
    const today = new Date();
    const iso = (y: number, m: number, d: number) => toISO(new Date(Date.UTC(y, m - 1, d)));
    const y = today.getUTCFullYear();
    const sample: PaymentRow[] = [
      { paidOn: iso(y, 1, 31), gross: 3200, ref: 'Jan' },
      { paidOn: iso(y, 2, 28), gross: 3200, ref: 'Feb' },
      { paidOn: iso(y, 3, 31), gross: 3200, ref: 'Mar' },
      { paidOn: iso(y, 4, 30), gross: 3200, ref: 'Apr' },
    ];
    setRows(sample);
  }

  const canCompute =
    employeeName.trim().length > 0 &&
    !!ewc &&
    !!qwSaturday &&
    !!payStartDate &&
    rows.some(r => r.paidOn && Number(r.gross) > 0);

  function compute() {
    if (!canCompute) {
      alert('Enter employee, EWC, pay start date, and at least one pay item.');
      return;
    }
    const clean: PayItem[] = rows
      .filter(r => r.paidOn && Number(r.gross) > 0)
      .map(r => ({ paidOn: r.paidOn, gross: Number(r.gross), ref: r.ref }));

    const res = calculateSMP({
      payments: clean,
      qualifyingWeekSaturday: qwSaturday as ISODate,
      payStartDate: payStartDate as ISODate,
      serviceWeeksAtQW: Number(serviceWeeksAtQW) || 0,
    });
    setResult(res);
  }

  function onCancel() {
    r.push('/dashboard/absence');
  }

  function onSave() {
    if (!result) {
      alert('Compute the SMP first.');
      return;
    }
    try {
      const key = 'absenceStore';
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { records: [] as any[] };
      const records: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed.records) ? parsed.records : [];

      const rec = {
        id: nextAbsenceId(),
        employeeName: employeeName.trim(),
        type: 'Maternity (SMP)',
        ewc,
        qualifyingWeekSaturday: qwSaturday,
        payStartDate,
        status: 'Open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        details: {
          serviceWeeksAtQW,
          payments: rows,
        },
        smp: {
          eligible: result.eligible,
          reasons: result.reasons,
          awe: result.awe,
          lelWeekly: result.lelWeekly,
          first6WeeksWeekly: result.first6WeeksWeekly,
          totals: {
            first6: result.first6Total,
            remaining33: result.remaining33Total,
            overall: result.total,
          },
          schedule: result.schedule,
        },
      };

      const merged = { records: [...records, rec] };
      window.localStorage.setItem(key, JSON.stringify(merged));
      alert('Maternity absence saved.');
      r.push('/dashboard/absence');
    } catch {
      alert('Could not save. Please try again.');
    }
  }

  // Keep Save disabled until computed
  const canSave = !!result;

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <HeaderBanner title="New Maternity (SMP)" />

        <div style={styles.grid}>
          {/* Left: key details */}
          <section style={styles.card}>
            <div style={styles.sectionTitle}>Employee & dates</div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="emp">Employee name</label>
              <input
                id="emp"
                style={styles.input}
                value={employeeName}
                onChange={e => setEmployeeName(e.currentTarget.value)}
                placeholder="Employee"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="ewc">Expected date of childbirth (EWC)</label>
                <input
                  id="ewc"
                  type="date"
                  style={styles.input}
                  value={ewc}
                  onChange={e => setEwc(e.currentTarget.value)}
                />
                <div style={styles.hint}>We’ll derive the Qualifying Week Saturday from this.</div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Qualifying Week Saturday</label>
                <input style={styles.input} value={qwSaturday || ''} readOnly placeholder="— auto —" />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="psd">SMP pay start date</label>
              <input
                id="psd"
                type="date"
                style={styles.input}
                value={payStartDate}
                onChange={e => setPayStartDate(e.currentTarget.value)}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="svc">Continuous service at QW (weeks)</label>
              <input
                id="svc"
                type="number"
                min={0}
                step={1}
                style={styles.input}
                value={serviceWeeksAtQW}
                onChange={e => setServiceWeeksAtQW(Number(e.currentTarget.value || 0))}
              />
            </div>
          </section>

          {/* Right: pay history for AWE */}
          <section style={styles.card}>
            <div style={styles.sectionTitle}>Earnings in relevant period (for AWE)</div>
            <div style={styles.hint}>
              Enter payments actually paid within the relevant period. Use the EWC to auto-derive the qualifying week.
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Paid on</th>
                  <th style={styles.th}>Gross (£)</th>
                  <th style={styles.th}>Ref</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td style={styles.td}>
                      <input
                        type="date"
                        style={styles.input}
                        value={row.paidOn}
                        onChange={e => setRow(i, { paidOn: e.currentTarget.value })}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        step="0.01"
                        style={styles.input}
                        value={row.gross ?? 0}
                        onChange={e => setRow(i, { gross: Number(e.currentTarget.value) })}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        style={styles.input}
                        value={row.ref ?? ''}
                        onChange={e => setRow(i, { ref: e.currentTarget.value })}
                        placeholder="optional"
                      />
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.secondaryBtn}
                        onClick={() => removeRow(i)}
                        title="Remove row"
                        disabled={rows.length <= 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.actionsRow}>
              <button type="button" style={styles.secondaryBtn} onClick={addRow}>
                Add row
              </button>
              <button type="button" style={styles.secondaryBtn} onClick={prefillSample}>
                Prefill sample
              </button>
            </div>
          </section>

          {/* Results */}
          <section style={styles.resultsCard}>
            <div style={styles.sectionTitle}>Calculation</div>

            <div style={styles.pillRow}>
              <span style={styles.pill}>Inputs complete: {canCompute ? 'Yes' : 'No'}</span>
              <span style={styles.pill}>EWC: {ewc || '—'}</span>
              <span style={styles.pill}>QW Sat: {qwSaturday || '—'}</span>
              <span style={styles.pill}>Pay start: {payStartDate || '—'}</span>
              <span style={styles.pill}>Service at QW: {serviceWeeksAtQW || 0} weeks</span>
            </div>

            <div style={styles.actionsRow}>
              <button type="button" style={styles.primaryBtn} onClick={compute} disabled={!canCompute}>
                Compute SMP
              </button>
              <button
                type="button"
                style={{ ...styles.primaryBtn, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
                onClick={onSave}
                disabled={!canSave}
              >
                Save
              </button>
              <button type="button" style={styles.secondaryBtn} onClick={onCancel}>
                Cancel
              </button>
            </div>

            {result && (
              <>
                {!result.eligible && result.reasons.length > 0 && (
                  <div style={styles.problems}>
                    Not eligible:
                    <ul style={{ margin: '6px 0 0 18px' }}>
                      {result.reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={styles.pillRow}>
                  <span style={styles.pill}>AWE £{result.awe.toFixed(2)}</span>
                  <span style={styles.pill}>90% AWE £{result.first6WeeksWeekly.toFixed(2)}</span>
                  <span style={styles.pill}>First 6 total £{result.first6Total.toFixed(2)}</span>
                  <span style={styles.pill}>Weeks 7–39 total £{result.remaining33Total.toFixed(2)}</span>
                  <span style={styles.pill}>Overall £{result.total.toFixed(2)}</span>
                </div>

                <table style={styles.schedule}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Week</th>
                      <th style={styles.th}>Start</th>
                      <th style={styles.th}>End</th>
                      <th style={styles.th}>Gross (£)</th>
                      <th style={styles.th}>Capped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map(w => (
                      <tr key={w.weekNo}>
                        <td style={styles.td}>{w.weekNo}</td>
                        <td style={styles.td}>{w.startDate}</td>
                        <td style={styles.td}>{w.endDate}</td>
                        <td style={styles.td}>{w.gross.toFixed(2)}</td>
                        <td style={styles.td}>{w.capApplied ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
