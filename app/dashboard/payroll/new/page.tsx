'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  annualSalary: number;
  status: string;
  selected?: boolean;
};

type PayrollCalculation = {
  employeeId: string;
  employeeName: string;
  grossPay: number;
  taxDeduction: number;
  niDeduction: number;
  pensionDeduction: number;
  netPay: number;
};

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calculations, setCalculations] = useState<PayrollCalculation[]>([]);

  const [formData, setFormData] = useState({
    payrollName: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    payFrequency: 'monthly',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const demoEmployees: Employee[] = [
        { id: 'EMP001', employeeNumber: 'EMP001', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@company.com', annualSalary: 35000, status: 'Active', selected: true },
        { id: 'EMP002', employeeNumber: 'EMP002', firstName: 'James', lastName: 'Wilson', email: 'james.wilson@company.com', annualSalary: 28000, status: 'Active', selected: true },
        { id: 'EMP003', employeeNumber: 'EMP003', firstName: 'Emma', lastName: 'Brown', email: 'emma.brown@company.com', annualSalary: 45000, status: 'Active', selected: true },
        { id: 'EMP004', employeeNumber: 'EMP004', firstName: 'Michael', lastName: 'Davis', email: 'michael.davis@company.com', annualSalary: 32000, status: 'Active', selected: true },
        { id: 'EMP005', employeeNumber: 'EMP005', firstName: 'Lisa', lastName: 'Taylor', email: 'lisa.taylor@company.com', annualSalary: 38000, status: 'Active', selected: true },
      ];

      setEmployees(demoEmployees);

      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setFormData({
        payrollName: `Monthly Payroll - ${today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
        payPeriodStart: firstDay.toISOString().split('T')[0],
        payPeriodEnd: lastDay.toISOString().split('T')[0],
        payDate: lastDay.toISOString().split('T')[0],
        payFrequency: 'monthly',
      });

      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const toggleEmployeeSelection = (employeeId: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === employeeId ? { ...emp, selected: !emp.selected } : emp))
    );
  };

  const calculatePayroll = () => {
    setCalculating(true);

    setTimeout(() => {
      const selectedEmployees = employees.filter((emp) => emp.selected);
      const results: PayrollCalculation[] = selectedEmployees.map((emp) => {
        const monthlyGross = emp.annualSalary / 12;
        const taxRate = emp.annualSalary > 12570 ? 0.2 : 0;
        const niRate = emp.annualSalary > 12570 ? 0.12 : 0;
        const pensionRate = 0.05;

        const taxableAmount = Math.max(0, monthlyGross - 12570 / 12);
        const taxDeduction = taxableAmount * taxRate;
        const niDeduction = taxableAmount * niRate;
        const pensionDeduction = monthlyGross * pensionRate;
        const netPay = monthlyGross - taxDeduction - niDeduction - pensionDeduction;

        return {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          grossPay: monthlyGross,
          taxDeduction,
          niDeduction,
          pensionDeduction,
          netPay,
        };
      });

      setCalculations(results);
      setCalculating(false);
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  
  try {
    // Create new payroll run object
    const newPayrollRun = {
      id: `pr-${Date.now()}`,
      name: formData.payrollName,
      payPeriod: `${formData.payPeriodStart} - ${formData.payPeriodEnd}`,
      status: 'draft',
      employeeCount: calculations.length,
      grossPay: totals.totalGross,
      netPay: totals.totalNet,
      totalTax: totals.totalTax,
      totalNI: totals.totalNI,
      createdDate: new Date().toISOString().split('T')[0],
      payDate: formData.payDate
    };

    // Save to localStorage
    const existingRuns = JSON.parse(localStorage.getItem('payme-payroll-runs') || '[]');
    const updatedRuns = [...existingRuns, newPayrollRun];
    localStorage.setItem('payme-payroll-runs', JSON.stringify(updatedRuns));
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    router.push('/dashboard/payroll');
  } catch (error) {
    console.error('Failed to create payroll run:', error);
  } finally {
    setSubmitting(false);
  }
};

  const totals = calculations.reduce(
    (acc, calc) => {
      acc.totalGross += calc.grossPay;
      acc.totalTax += calc.taxDeduction;
      acc.totalNI += calc.niDeduction;
      acc.totalPension += calc.pensionDeduction;
      acc.totalNet += calc.netPay;
      return acc;
    },
    { totalGross: 0, totalTax: 0, totalNI: 0, totalPension: 0, totalNet: 0 }
  );

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
          <h1 style={{ color: '#1f2937', margin: '0' }}>Loading Payroll Setup...</h1>
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
              £ New Payroll Run
            </h1>
            <p style={{ color: '#6b7280', margin: '0' }}>
              Create a new payroll run with UK tax and NI calculations
            </p>
          </div>
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

        <form onSubmit={handleSubmit}>
          {/* Payroll Details */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 20px 0',
                borderBottom: '2px solid #f3f4f6',
                paddingBottom: '8px',
              }}
            >
              Payroll Details
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Payroll Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.payrollName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payrollName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Pay Frequency
                </label>
                <select
                  value={formData.payFrequency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payFrequency: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Pay Period Start *
                </label>
                <input
                  type="date"
                  required
                  value={formData.payPeriodStart}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, payPeriodStart: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Pay Period End *
                </label>
                <input
                  type="date"
                  required
                  value={formData.payPeriodEnd}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, payPeriodEnd: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Pay Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.payDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Employee Selection */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: '0',
                }}
              >
                Select Employees ({employees.filter((emp) => emp.selected).length} of {employees.length})
              </h2>

              <button
                type="button"
                onClick={calculatePayroll}
                disabled={employees.filter((emp) => emp.selected).length === 0 || calculating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: calculating ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: calculating ? 'not-allowed' : 'pointer',
                }}
              >
                {calculating ? '⏳ Calculating...' : '🧮 Calculate Payroll'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {employees.map((employee) => (
                <label
                  key={employee.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: employee.selected ? '#f0f9ff' : 'white',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={employee.selected || false}
                    onChange={() => toggleEmployeeSelection(employee.id)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {employee.employeeNumber} • {formatCurrency(employee.annualSalary)} annually
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {employee.status}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Payroll Calculations */}
          {calculations.length > 0 && (
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: '0 0 20px 0',
                  borderBottom: '2px solid #f3f4f6',
                  paddingBottom: '8px',
                }}
              >
                £ Payroll Calculations
              </h2>

              {/* Summary Totals */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '16px',
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Gross</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{formatCurrency(totals.totalGross)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Tax</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(totals.totalTax)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total NI</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(totals.totalNI)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Pension</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#7c3aed' }}>{formatCurrency(totals.totalPension)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Net</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{formatCurrency(totals.totalNet)}</div>
                </div>
              </div>

              {/* Individual Employee Calculations */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Employee</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Gross Pay</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Tax</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>NI</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Pension</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((calc) => (
                    <tr key={calc.employeeId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#1f2937' }}>{calc.employeeName}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#059669', fontWeight: '600' }}>{formatCurrency(calc.grossPay)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>{formatCurrency(calc.taxDeduction)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>{formatCurrency(calc.niDeduction)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#7c3aed' }}>{formatCurrency(calc.pensionDeduction)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#059669', fontWeight: '600' }}>{formatCurrency(calc.netPay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Submit Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
            }}
          >
            <a
              href="/dashboard/payroll"
              style={{
                padding: '12px 24px',
                color: '#4b5563',
                textDecoration: 'none',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: '500',
              }}
            >
              Cancel
            </a>

            <button
              type="submit"
              disabled={calculations.length === 0 || submitting}
              style={{
                padding: '12px 24px',
                backgroundColor: calculations.length === 0 || submitting ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: calculations.length === 0 || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '🚀 Creating Payroll Run...' : `£ Create Payroll Run (${calculations.length} employees)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
