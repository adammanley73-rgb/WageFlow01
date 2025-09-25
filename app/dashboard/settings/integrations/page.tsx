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

export default function IntegrationsPage() {
  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <HeaderBanner title="Settings" current="settings" />

        <section style={S.grid} aria-labelledby="int-title">
          <h2 id="int-title" style={{ position: 'absolute', left: -9999 }}>Integrations</h2>

          <div style={{ ...S.card, gridColumn: 'span 6' }}>
            <div style={S.title}>HMRC</div>
            <div style={S.desc}>Real Time Information submission.</div>
            <a style={S.btn} href="#">Coming soon</a>
          </div>

          <div style={{ ...S.card, gridColumn: 'span 6' }}>
            <div style={S.title}>Xero</div>
            <div style={S.desc}>Sync journals to your ledger.</div>
            <a style={S.btn} href="#">Coming soon</a>
          </div>

          <div style={{ ...S.card, gridColumn: 'span 6' }}>
            <div style={S.title}>QuickBooks</div>
            <div style={S.desc}>Export payroll to QuickBooks.</div>
            <a style={S.btn} href="#">Coming soon</a>
          </div>

          <div style={{ ...S.card, gridColumn: 'span 6' }}>
            <div style={S.title}>Export CSV</div>
            <div style={S.desc}>Generic export for any platform.</div>
            <a style={S.ghost} href="/dashboard/settings">Back</a>
          </div>
        </section>
      </div>
    </main>
  );
}

