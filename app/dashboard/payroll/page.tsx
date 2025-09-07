'use client';

import { useState, useEffect } from 'react';

interface PayrollRun {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  description: string;
  status: string;
  totalGrossPay: number;
  totalNetPay: number;
  employeeCount: number;
  createdBy: string;
  createdAt: string;
}

export default function PayrollDashboardPage() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Load payroll runs from API
  useEffect(() => {
    const loadPayrollRuns = async () => {
      try {
        const response = await fetch('/api/payroll');
        if (response.ok) {
          const data = await response.json();
          // Remove duplicates by ID
          const uniqueRuns: PayrollRun[] = Array.isArray(data)
            ? data.filter(
                (run: PayrollRun, index: number, self: PayrollRun[]) =>
                  index === self.findIndex((r) => r.id === run.id)
              )
            : [];
          setPayrollRuns(uniqueRuns);
        }
      } catch (error) {
        console.error('Failed to load payroll runs:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadPayrollRuns();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => `£${(amount ?? 0).toFixed(2)}`;

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusStyles: { [key: string]: React.CSSProperties } = {
      draft: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fbbf24',
      },
      processing: {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        border: '1px solid #60a5fa',
      },
      completed: {
        backgroundColor: '#dcfce7',
        color: '#166534',
        border: '1px solid #22c55e',
      },
      submitted: {
        backgroundColor: '#f3e8ff',
        color: '#7c3aed',
        border: '1px solid #a855f7',
      },
    };

    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'capitalize',
          ...(statusStyles[status] || statusStyles.draft),
        }}
      >
        {status}
      </span>
    );
  };

  // Calculate totals
  const totalStats = payrollRuns.reduce(
    (acc, run) => {
      acc.totalGross += run.totalGrossPay || 0;
      acc.totalNet += run.totalNetPay || 0;
      return acc;
    },
    { totalGross: 0, totalNet: 0 }
  );

  const styles = {
    container: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background:
        'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
      minHeight: '100vh',
      padding: '40px 20px',
    },
    maxWidth: {
      maxWidth: '1200px',
      margin: '0 auto',
    } as React.CSSProperties,
    headerCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px 32px',
      borderRadius: '12px',
      boxShadow:
        '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0 0 8px 0',
    },
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      margin: '0 0 24px 0',
    },
    nav: {
      display: 'flex',
      gap: '24px',
    },
    navLink: {
      color: '#4b5563',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: 500,
      padding: '8px 16px',
      borderRadius: '6px',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '32px',
    },
    statCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px',
      borderRadius: '12px',
      boxShadow:
        '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    statTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#6b7280',
      margin: '0 0 8px 0',
      textTransform: 'uppercase' as const,
    },
    statValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0',
    },
    actionsCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px',
      borderRadius: '12px',
      boxShadow:
        '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '32px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0 0 16px 0',
    },
    button: {
      display: 'inline-block',
      padding: '12px 24px',
      backgroundColor: '#10b981',
      color: '#000000',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 700,
      border: 'none',
      cursor: 'pointer',
      marginRight: '16px',
      marginBottom: '16px',
    },
    buttonSecondary: {
      display: 'inline-block',
      padding: '12px 24px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      color: '#3b82f6',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      border: '1px solid #3b82f6',
      cursor: 'pointer',
      marginRight: '16px',
      marginBottom: '16px',
    },
    tableCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px',
      borderRadius: '12px',
      boxShadow:
        '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginTop: '16px',
    },
    th: {
      backgroundColor: '#f9fafb',
      padding: '12px',
      textAlign: 'left' as const,
      fontSize: '14px',
      fontWeight: 600,
      color: '#374151',
      borderBottom: '1px solid #e5e7eb',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb',
      fontSize: '14px',
      color: '#1f2937',
    },
    loading: {
      textAlign: 'center' as const,
      padding: '80px 20px',
      fontSize: '18px',
      color: '#6b7280',
    },
    noData: {
      textAlign: 'center' as const,
      padding: '40px',
      color: '#6b7280',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      marginTop: '16px',
    },
    viewButton: {
      padding: '6px 12px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.headerCard}>
            <div style={styles.loading}>🔄 Loading Payroll Dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.headerCard}>
          <h1 style={styles.title}>
            💼 <span style={{ color: '#3b82f6' }}>WageFlow</span> Payroll
            Dashboard
          </h1>
          <p style={styles.subtitle}>Manage payroll runs and UK RTI submissions</p>
          <nav style={styles.nav}>
            <a href="/dashboard" style={styles.navLink}>
              Dashboard
            </a>
            <a href="/dashboard/employees" style={styles.navLink}>
              Employees
            </a>
          </nav>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Total Payroll Runs</h3>
            <p style={styles.statValue}>{payrollRuns.length}</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>YTD Gross Pay</h3>
            <p style={styles.statValue}>{formatCurrency(totalStats.totalGross)}</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>YTD Net Pay</h3>
            <p style={styles.statValue}>{formatCurrency(totalStats.totalNet)}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.actionsCard}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <a href="/dashboard/payroll/new" style={styles.button}>
            £ New Payroll Run
          </a>
          <a href="/dashboard/employees" style={styles.buttonSecondary}>
            👥 Manage Employees
          </a>
          <button
            style={styles.buttonSecondary}
            onClick={() => alert('RTI Submission feature coming soon!')}
          >
            📊 RTI Submission
          </button>
        </div>

        {/* Payroll Runs Table */}
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>
            Recent Payroll Runs ({payrollRuns.length})
          </h2>

          {payrollRuns.length === 0 ? (
            <div style={styles.noData}>
              <div>📄 No payroll runs found</div>
              <p>Create your first payroll run to get started!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Payroll Run</th>
                    <th style={styles.th}>Pay Period</th>
                    <th style={styles.th}>Pay Date</th>
                    <th style={styles.th}>Employees</th>
                    <th style={styles.th}>Gross Pay</th>
                    <th style={styles.th}>Net Pay</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created By</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map((run) => (
                    <tr key={run.id}>
                      <td style={styles.td}>
                        <div>
                          <strong>{run.runNumber}</strong>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {run.description}
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        {formatDate(run.payPeriodStart)} -{' '}
                        {formatDate(run.payPeriodEnd)}
                      </td>
                      <td style={styles.td}>{formatDate(run.payDate)}</td>
                      <td style={styles.td}>{run.employeeCount}</td>
                      <td style={styles.td}>{formatCurrency(run.totalGrossPay)}</td>
                      <td style={styles.td}>{formatCurrency(run.totalNetPay)}</td>
                      <td style={styles.td}>{getStatusBadge(run.status)}</td>
                      <td style={styles.td}>{run.createdBy}</td>
                      <td style={styles.td}>
                        <button
                          style={styles.viewButton}
                          onClick={() => alert(`View details for ${run.runNumber}`)}
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
