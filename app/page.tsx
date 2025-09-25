/* @ts-nocheck */
'use client';

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
    padding: '36px 24px 44px', // slightly taller padding to match login card feel
    textAlign: 'center' as const,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  } as CSSProperties,
  content: {
    width: 'min(600px, 92vw)', // slim card similar to login card
    margin: '0 auto',
  } as CSSProperties,
  // Logo size doubled
  logo: {
    width: 320, // was 160
    height: 'auto',
    display: 'block',
    margin: '12px auto 32px', // increased bottom spacing
  } as CSSProperties,
  // Increase vertical spacing between all elements (roughly doubled)
  title: {
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: '0.3px',
    margin: '24px 0 32px', // more space above/below
    color: '#111827',
  } as CSSProperties,
  description: {
    fontSize: 17.5,
    lineHeight: 1.6,
    color: '#374151',
    margin: '0 auto 36px', // extra space before the button
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
            src="/WageFlowLogo.png" // C:\Users\adamm\Projects\wageflow01\public\WageFlowLogo.png
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

