'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import HeaderBanner from '@/components/ui/HeaderBanner';
import {
  listAbsenceRequests,
  subscribeToAbsences,
  type AbsenceRequest,
} from '@/lib/absenceAdapter';

const styles = {
  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
    padding: '32px 16px',
  } as CSSProperties,
  wrap: { maxWidth: '1100px', margin: '0 auto' } as CSSProperties,
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
    padding: 16,
    marginTop: 12,
  } as CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'separate' as const,
    borderSpacing: 0,
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    fontWeight: 800,
    color: '#1e40af',
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
  },
  pill: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 999,
    backgroundColor: '#e0e7ff',
    color: '#1e40af',
    fontWeight: 700,
    fontSize: 12,
  },
  empty: {
    padding: 24,
    textAlign: 'center' as const,
    color: '#374151',
  },
};

export default function AbsenceRequestsPage() {
  const [items, setItems] = useState<AbsenceRequest[]>([]);

  useEffect(() => {
    setItems(listAbsenceRequests());
    const unsub = subscribeToAbsences(setItems);
    return unsub;
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <HeaderBanner title="Absence Requests" />
        <section style={styles.panel}>
          {items.length === 0 ? (
            <div style={styles.empty}>No requests yet. Use “Record Absence”.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Hours</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td style={styles.td}>{r.date}</td>
                    <td style={styles.td}>{r.employee}</td>
                    <td style={styles.td}>{r.duration}</td>
                    <td style={styles.td}>{r.hours}</td>
                    <td style={styles.td}>
                      <span style={styles.pill}>{r.status}</span>
                    </td>
                    <td style={styles.td}>{r.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
