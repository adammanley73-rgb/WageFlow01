'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  annualSalary: number;
  status: string;
  payScheduleId?: string;
}

interface PaySchedule {
  id: string;
  name: string;
  frequency: string;
  description: string;
}

interface PayrollEmployee extends Employee {
  grossPay: number;
  taxDeduction: number;
  niDeduction: number;
  pensionDeduction: number;
  netPay: number;
}

const PAY_SCHEDULES: PaySchedule[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Monthly Salary',
    frequency: 'monthly',
    description: 'Salaried staff paid monthly on 25th',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Weekly Operations',
    frequency: 'weekly',
    description: 'Operations staff paid weekly on Friday',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Bi-Weekly Mixed',
    frequency: 'bi_weekly',
    description: 'Mixed departments paid every other Friday',
  },
];

const DEMO_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    employeeNumber: 'EMP001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@company.co.uk',
    annualSalary: 35000,
    status: 'active',
    payScheduleId: '11111111-1111-1111-1111-111111111111',
  },
  {
    id: 'EMP002',
    employeeNumber: 'EMP002',
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@company.co.uk',
    annualSalary: 28000,
    status: 'active',
    payScheduleId: '22222222-2222-2222-2222-222222222222',
  },
  {
    id: 'EMP003',
    employeeNumber: 'EMP003',
    firstName: 'Emma',
    lastName: 'Brown',
    email: 'emma.brown@company.co.uk',
    annualSalary: 22000,
    status: 'active',
    payScheduleId: '22222222-2222-2222-2222-222222222222',
  },
  {
    id: 'EMP004',
    employeeNumber: 'EMP004',
    firstName: 'Michael',
    lastName: 'Davis',
    email: 'michael.davis@company.co.uk',
    annualSalary: 42000,
    status: 'active',
    payScheduleId: '11111111-1111-1111-1111-111111111111',
  },
  {
    id: 'EMP005',
    employeeNumber: 'EMP005',
    firstName: 'Lisa',
    lastName: 'Taylor',
    email: 'lisa.taylor@company.co.uk',
    annualSalary: 38000,
    status: 'active',
    payScheduleId: '33333333-3333-3333-3333-333333333333',
  },
];

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [payrollData, setPayrollData] = useState({
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    description: '',
  });

  useEffect(() => {
    loadEmployees();
    setDefaultDates();
  }, []);

  const loadEmployees = () => {
    const payrollEmployees: PayrollEmployee[] = DEMO_EMPLOYEES
      .filter((emp) => emp.status === 'active')
      .map((emp) => {
        const monthlyGross = emp.annualSalary / 12;
        const taxDeduction = monthlyGross * 0.2;
        const niDeduction = monthlyGross * 0.12;
        const pensionDeduction = monthlyGross * 0.05;
        const netPay = monthlyGross - taxDeduction - niDeduction - pensionDeduction;

        return {
          ...emp,
          grossPay: Math.round(monthlyGross * 100) / 100,
          taxDeduction: Math.round(taxDeduction * 100) / 100,
          niDeduction: Math.round(niDeduction * 100) / 100,
          pensionDeduction: Math.round(pensionDeduction * 100) / 100,
          netPay: Math.round(netPay * 100) / 100,
        };
      });

    setEmployees(payrollEmployees);
    setSelectedEmployees(payrollEmployees.map((emp) => emp.id));
  };

  const setDefaultDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const payDay = new Date(now.getFullYear(), now.getMonth() + 1, 5);

    setPayrollData({
      payPeriodStart: firstDay.toISOString().split('T')[0],
      payPeriodEnd: lastDay.toISOString().split('T')[0],
      payDate: payDay.toISOString().split('T')[0],
      description: `Payroll - ${firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
    });
  };

  const filteredEmployees = selectedSchedule
    ? employees.filter((emp) => emp.payScheduleId === selectedSchedule)
    : employees;

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredEmployees.map((emp) => emp.id);
    setSelectedEmployees((prev) => {
      const nonFilteredSelected = prev.filter((id) => !filteredEmployees.some((emp) => emp.id === id));
      return [...nonFilteredSelected, ...filteredIds];
    });
  };

  const deselectAllFiltered = () => {
    const filteredIds = filteredEmployees.map((emp) => emp.id);
    setSelectedEmployees((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  const calculateTotals = () => {
    const selected = filteredEmployees.filter((emp) => selectedEmployees.includes(emp.id));
    return {
      employeeCount: selected.length,
      totalGross: selected.reduce((sum, emp) => sum + emp.grossPay, 0),
      totalTax: selected.reduce((sum, emp) => sum + emp.taxDeduction, 0),
      totalNI: selected.reduce((sum, emp) => sum + emp.niDeduction, 0),
      totalPension: selected.reduce((sum, emp) => sum + emp.pensionDeduction, 0),
      totalNet: selected.reduce((sum, emp) => sum + emp.netPay, 0),
    };
  };

  const totals = calculateTotals();

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totals.employeeCount === 0) {
      alert('Please select at least one employee for the payroll run.');
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert(`Payroll run created successfully for ${totals.employeeCount} employees!`);
      router.push('/dashboard/payroll');
    } catch (error) {
      console.error('Failed to create payroll run:', error);
      alert('Failed to create payroll run. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedScheduleInfo = selectedSchedule ? PAY_SCHEDULES.find((s) => s.id === selectedSchedule) : null;
  const filteredSelectedCount = filteredEmployees.filter((emp) => selectedEmployees.includes(emp.id)).length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: '32px',
          }}
        >
          <Link
            href="/dashboard/payroll"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 500,
              display: 'inline-block',
              marginBottom: '16px',
            }}
          >
            ← Back to Payroll Dashboard
          </Link>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0 0 8px 0',
            }}
          >
            💰 Create New Payroll Run
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '18px',
              margin: 0,
            }}
          >
            Setup payroll period and select employees by pay schedule
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Setup Section */}
            <div style={{ marginBottom: '32px' }}>
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '24px',
                }}
              >
                📅 Payroll Setup
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '24px',
                  marginBottom: '24px',
                }}
              >
                {/* Pay Schedule Selection */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px',
                    }}
                  >
                    Pay Schedule (Filter Employees)
                  </label>
                  <select
                    value={selectedSchedule}
                    onChange={(e) => setSelectedSchedule(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      outline: 'none',
                    }}
                  >
                    <option value="">All Employees (No Filter)</option>
                    {PAY_SCHEDULES.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.name} ({schedule.frequency.replace('_', '-')})
                      </option>
                    ))}
                  </select>
                  {selectedScheduleInfo && (
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '4px 0 0 0',
                      }}
                    >
                      {selectedScheduleInfo.description}
                    </p>
                  )}
                </div>

                {/* Pay Period Start */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px',
                    }}
                  >
                    Pay Period Start
                  </label>
                  <input
                    type="date"
                    value={payrollData.payPeriodStart}
                    onChange={(e) => setPayrollData((prev) => ({ ...prev, payPeriodStart: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      outline: 'none',
                    }}
                    required
                  />
                </div>

                {/* Pay Period End */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px',
                    }}
                  >
                    Pay Period End
                  </label>
                  <input
                    type="date"
                    value={payrollData.payPeriodEnd}
                    onChange={(e) => setPayrollData((prev) => ({ ...prev, payPeriodEnd: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      outline: 'none',
                    }}
                    required
                  />
                </div>

                {/* Pay Date */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px',
                    }}
                  >
                    Pay Date
                  </label>
                  <input
                    type="date"
                    value={payrollData.payDate}
                    onChange={(e) => setPayrollData((prev) => ({ ...prev, payDate: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      outline: 'none',
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Employee Selection */}
            <div style={{ marginBottom: '32px' }}>
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
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    margin: 0,
                  }}
                >
                  👥 Select Employees
                </h2>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Select All ({filteredEmployees.length})
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllFiltered}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {selectedSchedule && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #dbeafe',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: '#1e40af',
                      fontSize: '14px',
                    }}
                  >
                    📅 Filtered by: {selectedScheduleInfo?.name} ({filteredEmployees.length} employees)
                  </p>
                </div>
              )}

              <div
                style={{
                  overflowX: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      {['Select', 'Employee', 'Gross Pay', 'Tax', 'NI', 'Pension', 'Net Pay'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 16px',
                            textAlign: h === 'Employee' || h === 'Select' ? 'left' : 'right',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#4b5563',
                            textTransform: 'uppercase',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee, index) => (
                      <tr
                        key={employee.id}
                        style={{
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={() => toggleEmployee(employee.id)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{employee.employeeNumber}</div>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: '#059669',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {formatCurrency(employee.grossPay)}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            color: '#dc2626',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {formatCurrency(employee.taxDeduction)}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            color: '#dc2626',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {formatCurrency(employee.niDeduction)}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            color: '#dc2626',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {formatCurrency(employee.pensionDeduction)}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: '#059669',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {formatCurrency(employee.netPay)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #dbeafe',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>{filteredSelectedCount}</div>
                <div style={{ fontSize: '14px', color: '#1e40af' }}>Employees</div>
              </div>

              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #bbf7d0',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>
                  {formatCurrency(totals.totalGross)}
                </div>
                <div style={{ fontSize: '14px', color: '#166534' }}>Total Gross Pay</div>
              </div>

              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                  {formatCurrency(totals.totalTax + totals.totalNI + totals.totalPension)}
                </div>
                <div style={{ fontSize: '14px', color: '#dc2626' }}>Total Deductions</div>
              </div>

              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #bbf7d0',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>
                  {formatCurrency(totals.totalNet)}
                </div>
                <div style={{ fontSize: '14px', color: '#166534' }}>Total Net Pay</div>
              </div>
            </div>

            {/* Submit Button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Link
                href="/dashboard/payroll"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 500,
                  border: '1px solid #d1d5db',
                }}
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading || totals.employeeCount === 0}
                style={{
                  padding: '12px 32px',
                  backgroundColor: totals.employeeCount === 0 ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: totals.employeeCount === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    Creating Payroll Run...
                  </>
                ) : (
                  <>✅ Create Payroll ({totals.employeeCount} employees)</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
