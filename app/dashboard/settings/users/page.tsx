/* @ts-nocheck */
'use client';

import type { CSSProperties } from 'react';
import HeaderBanner from '../../../../components/ui/HeaderBanner';

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(180deg,#10b981 0%,#059669 35%,#1e40af 65%,#3b82f6 100%)', padding: '32px 16px' } as CSSProperties,
  wrap: { maxWidth: '1100px', margin: '0 auto' } as CSSProperties,
  panel: { background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 18 } as CSSProperties,
  toolbar: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 } as CSSProperties,
  btn: { background: '#1e40af', color: '#fff', borderRadius: 9999, padding: '10px 16px', fontWeight: 700, border: 0, cursor: 'pointer' } as CSSProperties,
  ghost: { background: 'transparent', color: '#1e40af', borderRadius: 9999, padding: '10px 16px', fontWeight: 700, border: '1px solid #1e40af', cursor: 'pointer' } as CSSProperties,
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 } as CSSProperties,
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' } as CSSProperties,
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9' } as CSSProperties,
} as const;

export default function UsersPage() {
  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <HeaderBanner title="Settings" current="settings" />

        <div style={S.panel}>
          <div style={S.toolbar}>
            <button style={S.btn} disabled title="Coming soon">Invite user</button>
            <a href="/dashboard/settings" style={S.ghost}>Back</a>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={S.table} aria-label="Users">
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Role</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={S.td}>You</td>
                  <td style={S.td}>demo@example.com</td>
                  <td style={S.td}>Owner</td>
                  <td style={S.td}>Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

