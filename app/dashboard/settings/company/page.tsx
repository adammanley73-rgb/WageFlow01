/* @ts-nocheck */
'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import HeaderBanner from '../../../../components/ui/HeaderBanner';
import { loadCompany, saveCompany, type Company } from '../../../../lib/companyStore';

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(180deg,#10b981 0%,#059669 35%,#1e40af 65%,#3b82f6 100%)', padding: '32px 16px' } as CSSProperties,
  wrap: { maxWidth: '1100px', margin: '0 auto' } as CSSProperties,
  panel: { background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 18 } as CSSProperties,
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 } as CSSProperties,
  field: { display: 'flex', flexDirection: 'column', gap: 6 } as CSSProperties,
  label: { fontWeight: 700, color: '#0b1020' } as CSSProperties,
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: '1rem' } as CSSProperties,
  textarea: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: '1rem', resize: 'vertical' } as CSSProperties,
  actions: { display: 'flex', gap: 10, marginTop: 10 } as CSSProperties,
  btn: { background: '#1e40af', color: '#fff', borderRadius: 9999, padding: '10px 16px', fontWeight: 700, border: 0, cursor: 'pointer' } as CSSProperties,
  ghost: { background: 'transparent', color: '#1e40af', borderRadius: 9999, padding: '10px 16px', fontWeight: 700, border: '1px solid #1e40af' } as CSSProperties,
  note: { color: '#475569', marginTop: 8 } as CSSProperties,
} as const;

export default function CompanySettingsPage() {
  const [form, setForm] = useState<Company>({ name: '', payeRef: '', accountsOfficeRef: '', address: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(loadCompany()); }, []);

  function onChange<K extends keyof Company>(key: K, value: Company[K]) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveCompany(form);
    setSaved(true);
  }

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <HeaderBanner title="Settings" current="settings" />
        <div style={S.panel}>
          <h2 style={{ marginTop: 0 }}>Company details</h2>

          <form onSubmit={onSubmit}>
            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>Company name</label>
                <input style={S.input} value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="e.g. WageFlow Ltd" />
              </div>
              <div style={S.field}>
                <label style={S.label}>PAYE reference</label>
                <input style={S.input} value={form.payeRef} onChange={(e) => onChange('payeRef', e.target.value)} placeholder="123/AB456" />
              </div>
            </div>

            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>Accounts Office reference</label>
                <input style={S.input} value={form.accountsOfficeRef} onChange={(e) => onChange('accountsOfficeRef', e.target.value)} placeholder="123PA00123456" />
              </div>
              <div />
            </div>

            <div style={{ ...S.field, marginBottom: 8 }}>
              <label style={S.label}>Registered address</label>
              <textarea rows={4} style={S.textarea} value={form.address} onChange={(e) => onChange('address', e.target.value)} placeholder="Street, City, Postcode" />
            </div>

            <div style={S.actions}>
              <button type="submit" style={S.btn}>Save</button>
              <a href="/dashboard/settings" style={S.ghost}>Back</a>
            </div>

            <div style={S.note}>{saved ? 'Saved. Values persist for demos.' : 'Changes are stored in your browser for demos.'}</div>
          </form>
        </div>
      </div>
    </main>
  );
}

