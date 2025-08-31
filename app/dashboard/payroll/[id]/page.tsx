'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

type PayrollRun = {
  id: string;
  name: string;
  payPeriod: string;
  status: 'draft' | 'processing' | 'completed' | 'submitted';
  employeeCount: number;
  grossPay: number;
  netPay: number;
  totalTax: number;
  totalNI: number;
  totalPension: number;
  createdDate: string;
  payDate: string;
  processedDate?: string;
  submittedDate?: string;
};

type PayrollEntry = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  grossPay: number;
  taxDeduction: number;
  niDeduction: number;
  pensionDeduction: number;
  netPay: number;
  taxCode: string;
};

export default function PayrollRunDetailsPage() {
  const params = useParams<{ id: string }>();
  const payrollId = params?.id;

  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Demo payroll run data - matches your payroll dashboard
      const demoPayrollRuns: PayrollRun[] = [
        {
          id: 'pr-001',
          name: 'Monthly Payroll - July 2025',
          payPeriod: '01/07/2025 - 31/07/2025',
          status: 'completed',
          employeeCount: 5,
          grossPay: 18750.0,
          netPay: 14250.0,
          totalTax: 3200.0,
          totalNI: 1300.0,
          totalPension: 1000.0,
          createdDate: '2025-07-28',
          payDate: '2025-07-31',
          processedDate: '2025-07-30',
          submittedDate: '2025-07-31',
        },
        {
          id: 'pr-002',
          name: 'Monthly Payroll - June 2025',
          payPeriod: '01/06/2025 - 30/06/2025',
          status: 'submitted',
          employeeCount: 5,
          grossPay: 18750.0,
          netPay: 14180.0,
          totalTax: 3170.0,
          totalNI: 1400.0,
          totalPension: 1000.0,
          createdDate: '2025-06-28',
          payDate: '2025-06-30',
          processedDate: '2025-06-29',
          submittedDate: '2025-06-30',
        },
      ];

      const foundPayrollRun = demoPayrollRuns.find((run) => run.id === payrollId);
      setPayrollRun(foundPayrollRun || null);

      // Demo payroll entries for this run
      if (foundPayrollRun) {
        const demoEntries: PayrollEntry[] = [
          {
            employeeId: 'EMP001',
            employeeName: 'Sarah Johnson',
            employeeNumber: 'EMP001',
            grossPay: 2916.67,
            taxDeduction: 580.0,
            niDeduction: 280.0,
            pensionDeduction: 145.83,
            netPay: 1910.84,
            taxCode: '1257L',
          },
          {
            employeeId: 'EMP002',
            employeeName: 'James Wilson',
            employeeNumber: 'EMP002',
            grossPay: 2333.33,
            taxDeduction: 370.0,
            niDeduction: 200.0,
            pensionDeduction: 116.67,
            netPay: 1646.66,
            taxCode: '1257L',
          },
          {
            employeeId: 'EMP003',
            employeeName: 'Emma Brown',
            employeeNumber: 'EMP003',
            grossPay: 3750.0,
            taxDeduction: 680.0,
            niDeduction: 380.0,
            pensionDeduction: 187.5,
            netPay: 2502.5,
            taxCode: '1257L',
          },
          {
            employeeId: 'EMP004',
            employeeName: 'Michael Davis',
            employeeNumber: 'EMP004',
            grossPay: 2666.67,
            taxDeduction: 450.0,
            niDeduction: 220.0,
            pensionDeduction: 133.33,
            netPay: 1863.34,
            taxCode: '1257L',
          },
          {
            employeeId: 'EMP005',
            employeeName: 'Lisa Taylor',
            employeeNumber: 'EMP005',
            grossPay: 3166.67,
            taxDeduction: 520.0,
            niDeduction: 320.0,
            pensionDeduction: 158.33,
            netPay: 2168.34,
            taxCode: '1257L',
          },
        ];
        setPayrollEntries(demoEntries);
      }

      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [payrollId]);

  // Currency always £
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  // Dates as dd-mm-yyyy
  const formatDate = (dateString: string): string => {
    const d = new Date(dateString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Normalise a pay period string like "01/07/2025 - 31/07/2025" -> "01-07-2025 - 31-07-2025"
  const normalizePayPeriod = (period: string): string => period.replaceAll('/', '-');

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
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
          <h1 style={{ color: '#1f2937', margin: '0' }}>Loading Payroll Run Details...</h1>
        </div>
      </div>
    );
  }

  if (!payrollRun) {
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
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#dc2626',
              margin: '0 0 16px 0',
            }}
          >
            Payroll Run Not Found
          </h1>
          <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
            The payroll run you're looking for could not be found.
          </p>
          <a
            href="/dashboard/payroll"
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: '500',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #dbeafe',
              backgroundColor: '#eff6ff',
            }}
          >
            ← Back to Payroll
          </a>
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
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '24px 32px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
                margin: '0 0 8px 0',
              }}
            >
              £ {payrollRun.name}
            </h1>
            <p style={{ color: '#6b7280', margin: '0' }}>
              {normalizePayPeriod(payrollRun.payPeriod)} • Pay Date: {formatDate(payrollRun.payDate)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: payrollRun.status === 'submitted' ? '#f3e8ff' : '#dcfce7',
                color: payrollRun.status === 'submitted' ? '#7c3aed' : '#166534',
                border: payrollRun.status === 'submitted' ? '1px solid #a855f7' : '1px solid #22c55e',
                textTransform: 'capitalize',
              }}
            >
              {payrollRun.status === 'submitted' ? 'RTI Submitted' : payrollRun.status}
            </span>
            <a
              href="/dashboard/payroll"
              style={{
                color: '#4b5563',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              }}
            >
              ← Back to Payroll
            </a>
          </div>
        </div>

        {/* Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Employees</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {payrollRun.employeeCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Gross Pay</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
              {formatCurrency(payrollRun.grossPay)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Total Tax</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
              {formatCurrency(payrollRun.totalTax)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Total NI</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
              {formatCurrency(payrollRun.totalNI)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Net Pay</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
              {formatCurrency(payrollRun.netPay)}
            </div>
          </div>
        </div>

        {/* RTI Status */}
        {payrollRun.status === 'submitted' && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 12px 0',
              }}
            >
              ✅ HMRC RTI Submission Complete
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Submitted
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  {payrollRun.submittedDate ? formatDate(payrollRun.submittedDate) : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Reference
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  FPS-{payrollRun.id.toUpperCase()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Status
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>Accepted</div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Breakdown */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '24px 32px',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0' }}>
              Employee Breakdown
            </h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th
                  style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}
                >
                  Employee
                </th>
                <th
                  style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151' }}
                >
                  Gross Pay
                </th>
                <th
                  style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151' }}
                >
                  Tax
                </th>
                <th
                  style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151' }}
                >
                  NI
                </th>
                <th
                  style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151' }}
                >
                  Pension
                </th>
                <th
                  style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151' }}
                >
                  Net Pay
                </th>
                <th
                  style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {payrollEntries.map((entry) => (
                <tr key={entry.employeeId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                      {entry.employeeName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {entry.employeeNumber} • Tax Code: {entry.taxCode}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: '#059669', fontWeight: '600' }}>
                    {formatCurrency(entry.grossPay)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: '#dc2626' }}>
                    {formatCurrency(entry.taxDeduction)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: '#dc2626' }}>
                    {formatCurrency(entry.niDeduction)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: '#7c3aed' }}>
                    {formatCurrency(entry.pensionDeduction)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: '#059669', fontWeight: '600' }}>
                    {formatCurrency(entry.netPay)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <a
                      href={`/dashboard/employees/${entry.employeeId}`}
                      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500', fontSize: '14px' }}
                    >
                      View Employee
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '24px',
          }}
        >
          {payrollRun.status === 'draft' && (
            <>
              <button
                style={{
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ✏️ Edit Payroll
              </button>
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🚀 Process Payroll
              </button>
            </>
          )}

          {payrollRun.status === 'completed' && (
            <button
              style={{
                padding: '10px 16px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              📊 Submit to HMRC
            </button>
          )}

          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📄 Download Payslips
          </button>
        </div>
      </div>
    </div>
  );
}
