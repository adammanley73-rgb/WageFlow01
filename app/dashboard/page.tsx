'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

const btnBase: CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  borderRadius: 8,
  textDecoration: 'none',
  border: '1px solid #cbd5e1',
  minWidth: 96,
  textAlign: 'center',
  fontWeight: 500,
};

const btn: CSSProperties = {
  ...btnBase,
  backgroundColor: '#e5e7eb',
  color: '#111827',
};

const btnPrimary: CSSProperties = {
  ...btnBase,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderColor: '#1d4ed8',
};

export default function DashboardPage() {
  return (
    <main style={{ padding: 24, minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="WageFlow" width={28} height={28} />
          <span style={{ fontSize: 18, fontWeight: 600 }}>WageFlow</span>
        </div>
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/employees">Employees</Link>
          <Link href="/payroll">Payroll</Link>
          <Link href="/reports">Reports</Link>
        </nav>
      </header>

      <section style={{ textAlign: 'center', marginTop: 64 }}>
        <h1 style={{ fontSize: 48, margin: '0 0 12px' }}>WageFlow Dashboard</h1>
        <p style={{ marginBottom: 24 }}>
          Dashboard is working. Authentication temporarily disabled for testing.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link href="/" style={btn}>
            ← Home
          </Link>
          <Link href="/login" style={btnPrimary}>
            Login
          </Link>
        </div>
      </section>

      <a
        href="/support"
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          ...btnPrimary,
          textDecoration: 'none',
        }}
      >
        SUPPORT
      </a>
    </main>
  );
}
