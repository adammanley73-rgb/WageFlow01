'use client';

import React, { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import HeaderBanner from '@components/ui/HeaderBanner';

const styles: Record<string, CSSProperties> = {
  // Match spacing with other sections (Dashboard/Payroll/Employees)
  page: {
    minHeight: '100vh',
    padding: '24px 16px',
    background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
  },
  wrap: { maxWidth: 1100, margin: '0 auto' },

  tilesRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 16,
    marginTop: 8, // align with others
  },
  tile: {
    background: '#e5f0ec',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
  },
  tileTitle: { fontSize: 14, fontWeight: 700, color: '#1f2937' },
  tileValue: { fontSize: 36, fontWeight: 800, marginTop: 6, color: '#111827' },

  // Card separation identical to other pages
  cardsRow: {
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
    minHeight: 170,
  },
  cardTitle: { fontSize: 18, fontWeight: 800, marginBottom: 8 },
  cardText: { color: '#374151', fontSize: 14, lineHeight: 1.45, flex: 1 },
  cardBtn: {
    background: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '12px 16px',
    borderRadius: 12,
    fontWeight: 800,
    textAlign: 'center',
    textDecoration: 'none',
    marginTop: 12,
  },
};

function useAbsenceStats() {
  const [open, setOpen] = useState(0);
  const [today, setToday] = useState(0);
  const [month, setMonth] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('absenceStore');
      const data = raw ? JSON.parse(raw) : { records: [] };
      const records: any[] = Array.isArray(data) ? data : Array.isArray(data.records) ? data.records : [];

      const now = new Date();
      const ymd = now.toISOString().slice(0, 10);

      const isOpen = (r: any) => !r.status || r.status === 'open';
      const isToday = (r: any) => (r.date || '').startsWith(ymd);
      const isThisMonth = (r: any) =>
        (r.date || '').slice(0, 7) === ymd.slice(0, 7) || (r.startDate || '').slice(0, 7) === ymd.slice(0, 7);

      setOpen(records.filter(isOpen).length);
      setToday(records.filter(isToday).length);
      setMonth(records.filter(isThisMonth).length);
    } catch {
      setOpen(0);
      setToday(0);
      setMonth(0);
    }
  }, []);

  return { open, today, month };
}

export default function AbsencePage() {
  const { open, today, month } = useAbsenceStats();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const Safe = ({ v }: { v: number | string }) => (
    <div suppressHydrationWarning style={styles.tileValue}>
      {v}
    </div>
  );

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <HeaderBanner title="Absence" />

        {/* Tiles, spacing aligned with other sections */}
        <div style={styles.tilesRow}>
          <div style={styles.tile}>
            <div style={styles.tileTitle}>Open Cases</div>
            <Safe v={hydrated ? open : '—'} />
          </div>
          <div style={styles.tile}>
            <div style={styles.tileTitle}>Employees Off Today</div>
            <Safe v={hydrated ? today : '—'} />
          </div>
          <div style={styles.tile}>
            <div style={styles.tileTitle}>This Month</div>
            <Safe v={hydrated ? month : '—'} />
          </div>
        </div>

        {/* Cards with explicit separation gap identical to others */}
        <div style={styles.cardsRow}>
          <section style={styles.card}>
            <div style={styles.cardTitle}>Record New Absence</div>
            <p style={styles.cardText}>Log sickness or annual leave.</p>
            <Link href="/dashboard/absence/new" style={styles.cardBtn}>
              Record Absence
            </Link>
          </section>

          <section style={styles.card}>
            <div style={styles.cardTitle}>View Absence</div>
            <p style={styles.cardText}>Browse, edit, or close absence records.</p>
            <Link href="/dashboard/absence/list" style={styles.cardBtn}>
              Open Records
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
