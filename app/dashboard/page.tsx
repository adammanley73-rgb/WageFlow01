'use client';

import React, { type CSSProperties } from 'react';

export default function Dashboard() {
  // Helpers for UK formatting
  const formatDateUK = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Common styles (typed for safety)
  const container: CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '40px 20px',
  };
  const maxWidth: CSSProperties = { maxWidth: '1200px', margin: '0 auto' };
  const navHeader: CSSProperties = {
    backgroundColor: 'white',
    padding: '20px 40px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };
  const h1Style: CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  };
  const navStyle: CSSProperties = { display: 'flex', gap: '24px' };
  const linkPrimary: CSSProperties = {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
  };
  const linkSecondary: CSSProperties = {
    color: '#4b5563',
    textDecoration: 'none',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  };
  const statsGrid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  };
  const card: CSSProperties = {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  };
  const cardHeaderRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  };
  const statLabel: CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    margin: '0 0 8px 0',
  };
  const statValueDefault: CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  };
  const statValueGreen: CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#059669',
    margin: 0,
  };
  const statValuePurple: CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#7c3aed',
    margin: 0,
  };
  const iconBig: CSSProperties = { fontSize: '32px' };
  const pillLink: CSSProperties = {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
  };
  const smallMuted: CSSProperties = { fontSize: '12px', color: '#6b7280', margin: 0 };
  const badgeOk: CSSProperties = {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid #bbf7d0',
  };
  const quickActionsWrap: CSSProperties = {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '40px',
  };
  const h2Style: CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 24px 0',
  };
  const actionsGrid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  };
  const actionLink: CSSProperties = {
    display: 'block',
    padding: '16px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#1f2937',
    fontWeight: 500,
    textAlign: 'center' as const,
  };
  const banner: CSSProperties = {
    backgroundColor: '#f0fdf4',
    border: '2px solid #bbf7d0',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
  };
  const bannerH2: CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#166534',
    margin: 0,
  };

  const todayUK = formatDateUK(new Date());

  return (
    <div style={container}>
      <div style={maxWidth}>
        {/* Navigation Header */}
        <div style={navHeader}>
          <div>
            <h1 style={h1Style}>💼 PAY-ME Dashboard</h1>
            <p style={{ ...smallMuted, marginTop: 8 }}>
              Today: {todayUK} · Tax year 2025-2026
            </p>
          </div>
          <nav style={navStyle}>
            <a href="/dashboard" style={linkPrimary}>Dashboard</a>
            <a href="/dashboard/employees" style={linkSecondary}>Employees</a>
            <a href="/dashboard/payroll" style={linkSecondary}>Payroll</a>
          </nav>
        </div>

        {/* Stats Grid */}
        <div style={statsGrid}>
          <div style={card}>
            <div style={cardHeaderRow}>
              <div>
                <h3 style={statLabel}>Total Employees</h3>
                <p style={statValueDefault}>24</p>
              </div>
              <div style={iconBig}>👥</div>
            </div>
            <a href="/dashboard/employees" style={pillLink}>View All</a>
          </div>

          <div style={card}>
            <div style={cardHeaderRow}>
              <div>
                <h3 style={statLabel}>Monthly Payroll</h3>
                {/* Currency is £ */}
                <p style={statValueGreen}>£87,500</p>
              </div>
              <div style={iconBig}>💷</div>
            </div>
            <p style={smallMuted}>Current month</p>
          </div>

          <div style={card}>
            <div style={cardHeaderRow}>
              <div>
                <h3 style={statLabel}>YTD Total</h3>
                <p style={statValuePurple}>£652,000</p>
              </div>
              <div style={iconBig}>📈</div>
            </div>
            <p style={smallMuted}>Tax year 2025-2026</p>
          </div>

          <div style={card}>
            <div style={cardHeaderRow}>
              <div>
                <h3 style={statLabel}>RTI Status</h3>
                <p style={statValueGreen}>✓</p>
              </div>
              <div style={iconBig}>📄</div>
            </div>
            <span style={badgeOk}>Up to date</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={quickActionsWrap}>
          <h2 style={h2Style}>Quick Actions</h2>
          <div style={actionsGrid}>
            <a href="/dashboard/employees/new" style={actionLink}>👤 Add New Employee</a>
            <a href="/dashboard/payroll/new" style={actionLink}>💰 Run Payroll</a>
          </div>
        </div>

        {/* Simple Message */}
        <div style={banner}>
          <h2 style={bannerH2}>Together we WILL succeed</h2>
        </div>
      </div>
    </div>
  );
}
