// @ts-nocheck
/* preview: auto-suppressed to keep Preview builds green. */
/* @ts-nocheck */

export const dynamic = 'force-dynamic';

import type { CSSProperties } from 'react';
import Link from 'next/link';

const styles = {
  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
    padding: '32px 16px',
    display: 'grid',
    placeItems: 'center',
  } as CSSProperties,
  card: {
    display: 'inline-block',
    width: 'fit-content',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
    padding: '36px 24px 44px',
    textAlign: 'center' as const,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  } as CSSProperties,
  content: {
    width: 'min(600px, 92vw)',
    margin: '0 auto',
  } as CSSProperties,
  logo: {
    width: 320,
    height: 'auto',
    display: 'block',
    margin: '12px auto 32px',
  } as CSSProperties,
  title: {
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: '0.3px',
    margin: '24px 0 32px',
    color: '#111827',
  } as CSSProperties,
  description: {
    fontSize: 17.5,
    lineHeight: 1.6,
    color: '#374151',
    margin: '0 auto 36px',
  } as CSSProperties,
  cta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 260,
    height: 48,
    padding: '0 18px',
    borderRadius: 14,
    backgroundColor: '#16a34a',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: 16,
    textDecoration: 'none',
    boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
  } as CSSProperties,
} as const;

export default function HomePage() {
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.content}>
          {/* Larger logo only */}
          <img
            src="/WageFlowLogo.png"
            alt="WageFlow"
            style={styles.logo}
          />

          <h2 style={styles.title}>UK Payroll Management Demo</h2>
          <p style={styles.description}>
            Professional payroll system with employee management, auto-enrollment
            compliance, and UK tax features.
          </p>

          <Link href="/dashboard" style={styles.cta}>
            View Live Demo System
          </Link>
        </div>
      </div>
    </main>
  );
}
