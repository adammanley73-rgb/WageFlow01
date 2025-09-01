'use client';

import { useEffect, useMemo, useState } from 'react';

type PayrollRun = {
  id: string;
  name: string;
  payPeriod: string; // e.g., "01/07/2025 - 31/07/2025" or "01-07-2025 - 31-07-2025"
  status: 'draft' | 'processing' | 'completed' | 'submitted';
  employeeCount: number;
  grossPay: number;
  netPay: number;
  totalTax: number;
  totalNI: number;
  createdDate: string; // accepts dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd
  payDate: string;     // same
};

/* ---------- Helpers: dates + currency ---------- */
function parseDateFlexible(s: string): Date | null {
  if (!s) return null;

  // dd-mm-yyyy
  let m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/yyyy
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  // yyyy-mm-dd
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateDDMMYYYY(s: string): string {
  const d = parseDateFlexible(s);
  if (!d) return s || '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatPeriodDDMMYYYY(period: string): string {
  if (!period) return '';
  // Expect "A - B" where A and B are dates in various formats
  const parts = period.split(' - ');
  if (parts.length !== 2) {
    // Fallback: swap slashes to hyphens if looks like dd/mm/yyyy
    return period.replace(/\//g, '-');
  }
  const [a, b] = parts;
  return `${formatDateDDMMYYYY(a)} - ${formatDateDDMMYYYY(b)}`;
}

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

export default function PayrollDashboard() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const demoPayrollRuns: PayrollRun[] = [
        {
          id: 'pr-001',
          name: 'Monthly Payroll - July 2025',
          payPeriod: '01/07/2025 - 31/07/2025',
          status: 'completed',
          employeeCount: 5,
          grossPay: 18_750.0,
          netPay: 14_250.0,
          totalTax: 3_200.0,
          totalNI: 1_300.0,
          createdDate: '2025-07-28',
          payDate: '2025-07-31',
        },
        {
          id: 'pr-002',
          name: 'Monthly Payroll - June 2025',
          payPeriod: '01/06/2025 - 30/06/2025',
          status: 'submitted',
          employeeCount: 5,
          grossPay: 18_750.0,
          netPay: 14_180.0,
          totalTax: 3_170.0,
          totalNI: 1_400.0,
          createdDate: '2025-06-28',
          payDate: '2025-06-30',
        },
      ];

      let newPayrollRuns: PayrollRun[] = [];
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('payme-payroll-runs') : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            newPayrollRuns = parsed.map((r: any) => ({
              id: String(r.id ?? ''),
              name: String(r.name ?? ''),
              payPeriod: String(r.payPeriod ?? ''),
              status:
                r.status === 'processing' || r.status === 'completed' || r.status === 'submitted'
                  ? r.status
                  : 'draft',
              employeeCount: Number(r.employeeCount ?? 0),
              grossPay: Number(r.grossPay ?? 0),
              netPay: Number(r.netPay ?? 0),
              totalTax: Number(r.totalTax ?? 0),
              totalNI: Number(r.totalNI ?? 0),
              createdDate: String(r.createdDate ?? ''),
              payDate: String(r.payDate ?? ''),
            }));
          }
        }
      } catch (error) {
        console.error('Error loading payroll runs:', error);
      }

      const all = [...demoPayrollRuns];
      for (const run of newPayrollRuns) {
        if (!all.find(r => r.id === run.id)) all.push(run);
      }

      setPayrollRuns(all);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const totals = useMemo(() => {
    return payrollRuns.reduce(
      (acc, r) => {
        acc.gross += Number(r.grossPay) || 0;
        acc.net += Number(r.netPay) || 0;
        acc.taxni += (Number(r.totalTax) || 0) + (Number(r.totalNI) || 0);
        return acc;
      },
      { gross: 0, net: 0, taxni: 0 }
    );
  }, [payrollRuns]);

  if (loading) {
    return (
      <div
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#f8fafc',
          minHeight: '100vh',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center' as const,
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <h1 style={{ color: '#1f2937', margin: 0 }}>Loading Payroll Dashboard...</h1>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Navigation Header */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px 40px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: 0,
              }}
            >
              Payroll Dashboard
            </h1>
            <p style={{ color: '#6b7280', margin: '8px 0 0 0' }}>
              Manage payroll runs and UK RTI submissions
            </p>
          </div>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <a
              href="/dashboard"
              style={{
                color: '#4b5563',
                textDecoration: 'none',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              }}
            >
              Dashboard
            </a>
            <a
              href="/dashboard/employees"
              style={{
                color: '#4b5563',
                textDecoration: 'none',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              }}
            >
              Employees
            </a>
            <a
              href="/dashboard/payroll"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                border: '1px solid #dbeafe',
              }}
            >
              Payroll
            </a>
          </nav>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '24px',
                  marginRight: '12px',
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                £
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', margin: 0 }}>
                  YTD Gross Pay
                </h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: 0 }}>
                  {gbp(totals.gross)}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '24px',
                  marginRight: '12px',
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                £
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', margin: 0 }}>
                  YTD Net Pay
                </h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed', margin: 0 }}>
                  {gbp(totals.net)}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '24px',
                  marginRight: '12px',
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                £
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', margin: 0 }}>
                  YTD Tax & NI
                </h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
                  {gbp(totals.taxni)}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>📊</div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', margin: 0 }}>
                  Total Runs
                </h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                  {payrollRuns.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '40px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 24px 0' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <a
              href="/dashboard/payroll/new"
              style={{
                display: 'block',
                padding: '20px',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                textAlign: 'center' as const,
              }}
            >
              £ New Payroll Run
            </a>
            <a
              href="/dashboard/employees"
              style={{
                display: 'block',
                padding: '20px',
                backgroundColor: '#f8fafc',
                color: '#1f2937',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 500,
                textAlign: 'center' as const,
              }}
            >
              👥 Manage Employees
            </a>
          </div>
        </div>

        {/* Payroll Runs Table */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              Recent Payroll Runs
            </h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left' as const, fontWeight: 600, color: '#374151' }}>
                  Payroll Run
                </th>
                <th style={{ padding: '16px', textAlign: 'left' as const, fontWeight: 600, color: '#374151' }}>
                  Pay Period
                </th>
                <th style={{ padding: '16px', textAlign: 'left' as const, fontWeight: 600, color: '#374151' }}>
                  Employees
                </th>
                <th style={{ padding: '16px', textAlign: 'left' as const, fontWeight: 600, color: '#374151' }}>
                  Gross Pay
                </th>
                <th style={{ padding: '16px', textAlign: 'left' as const, fontWeight: 600, color: '#374151' }}>
                  Status
                </th>
                <th style={{ padding: '16px', textAlign: 'left' as const, fontWeight: 600, color: '#374151' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {payrollRuns.map(run => (
                <tr key={run.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>{run.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Pay Date: {formatDateDDMMYYYY(run.payDate)}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>{formatPeriodDDMMYYYY(run.payPeriod)}</td>
                  <td style={{ padding: '16px' }}>{run.employeeCount}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#059669' }}>{gbp(run.grossPay)}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: run.status === 'submitted' ? '#f3e8ff' : '#dcfce7',
                        color: run.status === 'submitted' ? '#7c3aed' : '#166534',
                        border: run.status === 'submitted' ? '1px solid #a855f7' : '1px solid #22c55e',
                        textTransform: 'capitalize',
                      }}
                    >
                      {run.status === 'submitted' ? 'RTI Submitted' : run.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <a
                      href={`/dashboard/payroll/${run.id}`}
                      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500, fontSize: '14px' }}
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
