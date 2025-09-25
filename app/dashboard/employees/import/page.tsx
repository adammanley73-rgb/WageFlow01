/* @ts-nocheck */
'use client';

import React, { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import HeaderBanner from '@components/ui/HeaderBanner';

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '24px 16px',
    background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
  },
  wrap: { maxWidth: 1100, margin: '0 auto' },

  // Top nav buttons: keep 4, omit current page
  navRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: '12px 0 16px',
  },
  navBtn: {
    background: 'white',
    color: '#111827',
    border: '1px solid #e5e7eb',
    padding: '10px 16px',
    borderRadius: 999,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 16,
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
  title: { fontSize: 18, fontWeight: 800, marginBottom: 10 },
  text: { color: '#374151', fontSize: 14, lineHeight: 1.5 },

  label: { fontSize: 14, fontWeight: 600, marginBottom: 8 },
  fileRow: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 },
  fileInput: { flex: 1, border: '1px dashed #cbd5e1', borderRadius: 10, padding: '10px 12px', background: '#f8fafc' },

  primaryBtn: {
    background: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 10,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  primaryBtnDisabled: {
    background: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 10,
    fontWeight: 700,
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  secondaryBtn: {
    background: '#f3f4f6',
    color: '#111827',
    border: '1px solid #e5e7eb',
    padding: '10px 14px',
    borderRadius: 10,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
  },

  pre: {
    background: '#0b1220',
    color: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    lineHeight: 1.35,
    overflowX: 'auto',
    marginTop: 10,
  },

  schemaTable: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    marginTop: 8,
  },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 13, background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' },

  actionsRow: { display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' },
};

function useSampleCsv() {
  return useMemo(() => {
    const headers = [
      'employeeNumber',
      'firstName',
      'lastName',
      'niNumber',
      'payGroup',
      'hoursPerWeek',
      'annualSalary',
      'hourlyRate',
      'email',
      'phone',
      'dateOfBirth',
      'hireDate',
      'employmentType',
      'jobTitle',
      'department',
      'active',
    ];

    // Two demo rows: salaried and hourly
    const rows = [
      [
        'EMP-001',
        'Alice',
        'Thompson',
        'QQ123456A',
        'Monthly Salaried',
        '37.5',
        '36000',
        '', // hourly auto-derived for salaried
        'alice@example.com',
        '07123 456789',
        '1992-05-14',
        '2024-08-01',
        'Full-time',
        'Analyst',
        'Operations',
        'true',
      ],
      [
        'EMP-002',
        'Ben',
        'Ng',
        'QQ223344B',
        'Weekly Hourly',
        '20',
        '', // annual not required for hourly
        '12.50',
        'ben@example.com',
        '07111 222333',
        '2000-02-02',
        '2025-01-15',
        'Part-time',
        'Assistant',
        'Support',
        'true',
      ],
    ];

    const csv = [headers.join(','), ...rows.map(r => r.map(v => String(v).replaceAll('"', '""')).join(','))].join('\n');
    return csv;
  }, []);
}

export default function EmployeesImportStubPage() {
  const csv = useSampleCsv();
  const [copied, setCopied] = useState(false);

  function downloadSample() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wageflow-employees-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copySample() {
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      alert('Could not copy to clipboard.');
    }
  }

  const navButtons = useMemo(
    () => [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/dashboard/payroll', label: 'Payroll' },
      { href: '/dashboard/absence', label: 'Absence' },
      { href: '/dashboard/settings', label: 'Settings' },
    ],
    []
  );

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <HeaderBanner title="Import Employees (CSV)" />

        {/* Keep 4 buttons, omit current page */}
        <div style={styles.navRow}>
          {navButtons.map(b => (
            <Link key={b.href} href={b.href} style={styles.navBtn}>
              {b.label}
            </Link>
          ))}
        </div>

        <div style={styles.grid}>
          {/* Left: Upload stub and sample */}
          <section style={styles.card}>
            <h3 style={styles.title}>Upload CSV</h3>
            <p style={styles.text}>
              Upload is disabled in this demo. Use the sample CSV to create records via the New form for now.
              When the backend is ready, this page will parse the CSV, validate NMW and pay groups, then write to the store.
            </p>

            <label style={styles.label}>Choose file</label>
            <div style={styles.fileRow}>
              <input type="file" accept=".csv" style={styles.fileInput} disabled />
              <button type="button" style={styles.primaryBtnDisabled} disabled>Upload (disabled)</button>
            </div>

            <div style={styles.actionsRow}>
              <button type="button" style={styles.primaryBtn} onClick={downloadSample}>Download sample CSV</button>
              <button type="button" style={styles.secondaryBtn} onClick={copySample}>
                {copied ? 'Copied' : 'Copy sample to clipboard'}
              </button>
              <Link href="/dashboard/employees/directory" style={styles.secondaryBtn}>Back to Directory</Link>
            </div>

            <h4 style={{ ...styles.title, marginTop: 16 }}>Sample CSV contents</h4>
            <pre style={styles.pre}>{csv}</pre>
          </section>

          {/* Right: Schema reference */}
          <aside style={styles.card}>
            <h3 style={styles.title}>CSV schema</h3>
            <p style={styles.text}>Columns are case sensitive. Dates use ISO format yyyy-mm-dd. NI is stored uppercase.</p>
            <table style={styles.schemaTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Field</th>
                  <th style={styles.th}>Required</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={styles.td}>employeeNumber</td><td style={styles.td}>No</td><td style={styles.td}>External reference</td></tr>
                <tr><td style={styles.td}>firstName</td><td style={styles.td}>Yes</td><td style={styles.td}>Given name</td></tr>
                <tr><td style={styles.td}>lastName</td><td style={styles.td}>Yes</td><td style={styles.td}>Family name</td></tr>
                <tr><td style={styles.td}>niNumber</td><td style={styles.td}>Yes</td><td style={styles.td}>Uppercased automatically</td></tr>
                <tr><td style={styles.td}>payGroup</td><td style={styles.td}>Yes</td><td style={styles.td}>Monthly Salaried | Weekly Hourly | Apprentices | Casual</td></tr>
                <tr><td style={styles.td}>hoursPerWeek</td><td style={styles.td}>Yes for salaried</td><td style={styles.td}>Used to derive hourly for salaried</td></tr>
                <tr><td style={styles.td}>annualSalary</td><td style={styles.td}>Yes for salaried</td><td style={styles.td}>Used to derive hourly</td></tr>
                <tr><td style={styles.td}>hourlyRate</td><td style={styles.td}>Yes for hourly</td><td style={styles.td}>Weekly Hourly, Apprentices, Casual</td></tr>
                <tr><td style={styles.td}>email</td><td style={styles.td}>No</td><td style={styles.td}>Contact email</td></tr>
                <tr><td style={styles.td}>phone</td><td style={styles.td}>No</td><td style={styles.td}>Contact phone</td></tr>
                <tr><td style={styles.td}>dateOfBirth</td><td style={styles.td}>No</td><td style={styles.td}>yyyy-mm-dd</td></tr>
                <tr><td style={styles.td}>hireDate</td><td style={styles.td}>No</td><td style={styles.td}>yyyy-mm-dd</td></tr>
                <tr><td style={styles.td}>employmentType</td><td style={styles.td}>No</td><td style={styles.td}>Full-time | Part-time | Contractor</td></tr>
                <tr><td style={styles.td}>jobTitle</td><td style={styles.td}>No</td><td style={styles.td}>Role title</td></tr>
                <tr><td style={styles.td}>department</td><td style={styles.td}>No</td><td style={styles.td}>Org unit</td></tr>
                <tr><td style={styles.td}>active</td><td style={styles.td}>No</td><td style={styles.td}>true | false</td></tr>
              </tbody>
            </table>
          </aside>
        </div>
      </div>
    </main>
  );
}

