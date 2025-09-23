'use client';

import React, { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import HeaderBanner from '@components/ui/HeaderBanner';
import { getAll, subscribe, removeEmployee, type Employee } from '@lib/employeeStore';
import { hasPayrollForEmployee } from '@lib/payrollIndex';

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', padding: '24px 16px', background: 'linear-gradient(180deg,#10b981 0%,#059669 35%,#1e40af 65%,#3b82f6 100%)' },
  wrap: { maxWidth: 1100, margin: '0 auto' },
  toolbar: { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' },
  search: { flex: 1, border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'white' },
  button: { background: '#1e40af', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' },
  dangerBtn: { background: '#dc2626', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
  dangerBtnDisabled: { background: '#ef4444', opacity: 0.45, color: 'white', border: 'none', padding: '6px 10px', borderRadius: 8, fontWeight: 700, cursor: 'not-allowed' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: 12, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '12px 14px', fontSize: 13, background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '12px 14px', fontSize: 14, borderBottom: '1px solid #f1f5f9' },
  rowActions: { display: 'flex', gap: 10, alignItems: 'center' },
  linkBtn: { color: '#1e40af', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' },
};

export default function EmployeesDirectoryPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [q, setQ] = useState('');

  const load = () => setRows(getAll());

  useEffect(() => {
    load();
    const off = subscribe(load);
    return off;
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => {
      const hay = [
        r.fullName,
        r.niNumber,
        r.payGroup,
        r.employeeNumber ?? '',
        r.email ?? '',
        r.phone ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  function onDeleteRow(e: Employee) {
    if (hasPayrollForEmployee(e.id)) {
      alert('Cannot delete. This employee appears in a payroll run.');
      return;
    }
    const ok = window.confirm(`Delete ${e.fullName}? This cannot be undone.`);
    if (!ok) return;
    removeEmployee(e.id);
    setRows(prev => prev.filter(x => x.id !== e.id));
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <HeaderBanner title="Employees Directory" />
        <div style={styles.toolbar}>
          <input
            style={styles.search}
            placeholder="Search name, NI number, pay group"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button style={styles.button as CSSProperties} onClick={load}>Refresh</button>
          <Link href="/dashboard/employees/new" style={styles.button}>Add New</Link>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>NI number</th>
              <th style={styles.th}>Pay group</th>
              <th style={styles.th}>Hourly £</th>
              <th style={styles.th}>Active</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...styles.td, textAlign: 'center', padding: 24 }}>No employees found.</td>
              </tr>
            ) : (
              filtered.map(e => {
                const blocked = hasPayrollForEmployee(e.id);
                return (
                  <tr key={e.id}>
                    <td style={styles.td}>{e.fullName}</td>
                    <td style={styles.td}>{e.niNumber || '—'}</td>
                    <td style={styles.td}>{e.payGroup}</td>
                    <td style={styles.td}>
                      {typeof e.hourlyRate === 'number' ? e.hourlyRate.toFixed(2) : '—'}
                    </td>
                    <td style={styles.td}>{e.active ? 'Yes' : 'No'}</td>
                    <td style={styles.td}>
                      <div style={styles.rowActions}>
                        <Link href={`/dashboard/employees/${e.id}/edit`} style={styles.linkBtn}>Edit</Link>
                        <button
                          title={blocked ? 'Included in a payroll run. Deletion disabled.' : 'Delete employee'}
                          style={blocked ? styles.dangerBtnDisabled : styles.dangerBtn}
                          disabled={blocked}
                          onClick={() => onDeleteRow(e)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
