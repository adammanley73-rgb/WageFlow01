/* @ts-nocheck */
'use client';

import type { CSSProperties } from 'react';
import HeaderBanner from '../../../../components/ui/HeaderBanner';

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(180deg,#10b981 0%,#059669 35%,#1e40af 65%,#3b82f6 100%)', padding: '32px 16px' } as CSSProperties,
  wrap: { maxWidth: '1100px', margin: '0 auto' } as CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 14 } as CSSProperties,
  card: { background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 18, minHeight: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' } as CSSProperties,
  title: { fontWeight: 700, marginBottom: 8 } as CSSProperties,
  desc: { color: '#374151', marginBottom: 12 } as CSSProperties,
  btn: { background: '#1e40af', color: '#fff', borderRadius: 9999, padding: '10px 16px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignSelf: 'center' } as CSSProperties,
  ghost: { border: '1px solid #1e40af', color: '#1e40af', borderRadius: 9999, padding: '10px 16px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignSelf: 'center' } as CSSProperties,
} as const;

export default function CalendarsPage() {
  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <HeaderBanner title="Settings" current="settings" />

        <section style={S.grid} aria-labelledby="cal-title">
          <h2 id="cal-title" style={{ position: 'absolute', left: -9999 }}>Pay calendars</h2>

          <div style={{ ...S.card, gridColumn: 'span 6' }}>
            <div style={S.title}>Weekly calendar</div>
            <div style={S.desc}>52 weeks. Payday every Friday.</div>
            <a style={S.btn} href="#">Coming soon</a>
          </div>

          <div style={{ ...S.card, gridColumn: 'span 6' }}>
            <div style={S.title}>Monthly calendar</div>
            <div style={S.desc}>12 periods. Payday last working day.</div>
            <a style={S.btn} href="#">Coming soon</a>
          </div>

          <div style={{ ...S.card, gridColumn: 'span 6' }}>
            <div style={S.title}>Add calendar</div>
            <div style={S.desc}>Create a custom schedule.</div>
            <a style={S.ghost} href="/dashboard/settings">Back</a>
          </div>
        </section>
      </div>
    </main>
  );
}

