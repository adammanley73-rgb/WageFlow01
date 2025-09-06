'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DEMO_EMPLOYEES,
  PAY_SCHEDULES,
  getPayScheduleName,
  type Employee,
  type PaySchedule
} from '../../../../lib/data/employees';

interface PayrollEmployee extends Employee {
  selected: boolean;
  grossPay: number;
  taxDeduction: number;
  niDeduction: number;
  pensionDeduction: number;
  netPay: number;
}

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [payrollData, setPayrollData] = useState({
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    description: ''
  });

  useEffect(() => {
    loadEmployees();

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const payDay = new Date(now.getFullYear(), now.getMonth() + 1, 5);

    setPayrollData({
      payPeriodStart: firstDay.toISOString().split('T')[0],
      payPeriodEnd: lastDay.toISOString().split('T')[0],
      payDate: payDay.toISOString().split('T')[0],
      description: `Payroll - ${firstDay.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric'
      })}`
    });
  }, []);

  const loadEmployees = () => {
    setLoading(true);

    const payrollEmployees: PayrollEmployee[] = DEMO_EMPLOYEES.filter(
      (emp) => emp.status === 'active'
    ).map((emp) => {
      const monthlyGross = emp.annualSalary / 12;
      const taxDeduction = monthlyGross * 0.2;
      const niDeduction = monthlyGross * 0.12;
      const pensionDeduction = monthlyGross * 0.05;
      const netPay = monthlyGross - taxDeduction - niDeduction - pensionDeduction;

      const round2 = (n: number) => Math.round(n * 100) / 100;

      return {
        ...emp,
        selected: true,
        grossPay: round2(monthlyGross),
        taxDeduction: round2(taxDeduction),
        niDeduction: round2(niDeduction),
        pensionDeduction: round2(pensionDeduction),
        netPay: round2(netPay)
      };
    });

    setEmployees(payrollEmployees);
    setSelectedEmployees(payrollEmployees.map((emp) => emp.id));
    setLoading(false);
  };

  const filteredEmployees = employees.filter((emp) =>
    selectedSchedule ? emp.payScheduleId === selectedSchedule : true
  );

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredEmployees.map((emp) => emp.id);
    setSelectedEmployees((prev) => {
      const nonFilteredSelected = prev.filter((id) => !filteredIds.includes(id));
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
      totalNet: selected.reduce((sum, emp) => sum + emp.netPay, 0)
    };
  };

  const totals = calculateTotals();

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

  const nextStep = () => {
    if (step < 3) setStep((s) => s + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const submitPayrollRun = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert('Payroll run created successfully!');
      router.push('/dashboard/payroll');
    } catch (error) {
      console.error('Failed to create payroll run:', error);
      alert('Failed to create payroll run');
    } finally {
      setLoading(false);
    }
  };

  const selectedScheduleInfo = selectedSchedule
    ? PAY_SCHEDULES.find((s) => s.id === selectedSchedule)
    : null;
  const filteredSelectedCount = filteredEmployees.filter((emp) =>
    selectedEmployees.includes(emp.id)
  ).length;

  if (loading && step === 1) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <h2>Loading employees...</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh'
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: '32px',
          textAlign: 'center'
        }}
      >
        <Link
          href="/dashboard/payroll"
          style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '16px',
            display: 'inline-block',
            marginBottom: '16px'
          }}
        >
          ← Back to Payroll Dashboard
        </Link>
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: 'white',
            margin: '0 0 8px 0'
          }}
        >
          💰 Create New Payroll Run
        </h1>
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '18px',
            margin: '0'
          }}
        >
          Step {step} of 3:{' '}
          {step === 1 ? 'Setup Period & Schedule' : step === 2 ? 'Select Employees' : 'Review & Submit'}
        </p>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          height: '8px',
          borderRadius: '4px',
          marginBottom: '32px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            height: '100%',
            width: `${(step / 3) * 100}%`,
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      {/* Step 1: Setup */}
      {step === 1 && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.2)'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '24px'
            }}
          >
            📅 Payroll Period & Schedule
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}
          >
            {/* Pay Schedule Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Pay Schedule (Filter Employees)
              </label>
              <select
                value={selectedSchedule}
                onChange={(e) => setSelectedSchedule(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white'
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
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#6b7280',
                    fontStyle: 'italic'
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
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Pay Period Start
              </label>
              <input
                type="date"
                value={payrollData.payPeriodStart}
                onChange={(e) =>
                  setPayrollData((prev) => ({ ...prev, payPeriodStart: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                required
              />
            </div>

            {/* Pay Period End */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Pay Period End
              </label>
              <input
                type="date"
                value={payrollData.payPeriodEnd}
                onChange={(e) =>
                  setPayrollData((prev) => ({ ...prev, payPeriodEnd: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                required
              />
            </div>

            {/* Pay Date */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
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
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                required
              />
            </div>

            {/* Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Description
              </label>
              <input
                type="text"
                value={payrollData.description}
                onChange={(e) =>
                  setPayrollData((prev) => ({ ...prev, description: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="e.g., Monthly Payroll - December 2024"
                required
              />
            </div>
          </div>

          {/* Employee Preview */}
          {selectedSchedule && (
            <div
              style={{
                marginTop: '32px',
                padding: '20px',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                border: '2px solid #0284c7'
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#0369a1',
                  marginBottom: '12px'
                }}
              >
                📊 Filtered Employees Preview
              </h3>
              <p
                style={{
                  color: '#075985',
                  margin: '0 0 16px 0'
                }}
              >
                {filteredEmployees.length} employees match the selected pay schedule "
                {selectedScheduleInfo?.name}"
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px'
                }}
              >
                {filteredEmployees.slice(0, 6).map((emp) => (
                  <div
                    key={emp.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #bae6fd'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#1f2937'
                      }}
                    >
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}
                    >
                      {formatCurrency(emp.grossPay)}/month
                    </div>
                  </div>
                ))}
                {filteredEmployees.length > 6 && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #bae6fd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}
                  >
                    +{filteredEmployees.length - 6} more...
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: '32px',
              textAlign: 'right'
            }}
          >
            <button
              onClick={nextStep}
              disabled={
                !payrollData.payPeriodStart || !payrollData.payPeriodEnd || !payrollData.payDate
              }
              style={{
                backgroundColor:
                  !payrollData.payPeriodStart || !payrollData.payPeriodEnd || !payrollData.payDate
                    ? '#9ca3af'
                    : '#10b981',
                color: 'white',
                padding: '14px 28px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor:
                  !payrollData.payPeriodStart || !payrollData.payPeriodEnd || !payrollData.payDate
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Next: Select Employees →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Employee Selection */}
      {step === 2 && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0'
              }}
            >
              👥 Select Employees
            </h2>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={selectAllFiltered}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Select All ({filteredEmployees.length})
              </button>
              <button
                onClick={deselectAllFiltered}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Filter Info */}
          {selectedSchedule && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #0284c7'
              }}
            >
              <p
                style={{
                  margin: '0',
                  color: '#075985',
                  fontWeight: '600'
                }}
              >
                📅 Filtered by: {selectedScheduleInfo?.name} ({filteredEmployees.length}{' '}
                employees)
              </p>
            </div>
          )}

          {/* Employee Table */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e5e7eb'
                    }}
                  >
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#374151',
                        width: '50px'
                      }}
                    >
                      Select
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}
                    >
                      Employee
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}
                    >
                      Pay Schedule
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}
                    >
                      Gross Pay
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}
                    >
                      Tax
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}
                    >
                      NI
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}
                    >
                      Pension
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}
                    >
                      Net Pay
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee, index) => (
                    <tr
                      key={employee.id}
                      style={{
                        borderBottom:
                          index < filteredEmployees.length - 1 ? '1px solid #f3f4f6' : 'none',
                        backgroundColor: selectedEmployees.includes(employee.id)
                          ? '#f0fdf4'
                          : 'white'
                      }}
                    >
                      <td
                        style={{
                          padding: '16px',
                          textAlign: 'center'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => toggleEmployee(employee.id)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: '16px'
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 'bold',
                              color: '#1f2937'
                            }}
                          >
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div
                            style={{
                              fontSize: '14px',
                              color: '#6b7280'
                            }}
                          >
                            {employee.employeeNumber}
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '16px'
                        }}
                      >
                        <span
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {getPayScheduleName(employee.payScheduleId || '')}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: '#059669'
                        }}
                      >
                        {formatCurrency(employee.grossPay)}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          textAlign: 'right',
                          color: '#dc2626'
                        }}
                      >
                        {formatCurrency(employee.taxDeduction)}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          textAlign: 'right',
                          color: '#dc2626'
                        }}
                      >
                        {formatCurrency(employee.niDeduction)}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          textAlign: 'right',
                          color: '#dc2626'
                        }}
                      >
                        {formatCurrency(employee.pensionDeduction)}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: '#059669'
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

          {/* Summary */}
          <div
            style={{
              marginTop: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}
          >
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#0369a1'
                }}
              >
                {filteredSelectedCount}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#075985'
                }}
              >
                Employees
              </div>
            </div>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#059669'
                }}
              >
                {formatCurrency(totals.totalGross)}
              </div>
              <div style={{ fontSize: '14px', color: '#047857' }}>Total Gross</div>
            </div>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#dc2626'
                }}
              >
                {formatCurrency(totals.totalTax + totals.totalNI + totals.totalPension)}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#991b1b'
                }}
              >
                Total Deductions
              </div>
            </div>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#059669'
                }}
              >
                {formatCurrency(totals.totalNet)}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#047857'
                }}
              >
                Total Net Pay
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '32px',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <button
              onClick={prevStep}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '14px 28px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ← Back
            </button>
            <button
              onClick={nextStep}
              disabled={filteredSelectedCount === 0}
              style={{
                backgroundColor: filteredSelectedCount === 0 ? '#9ca3af' : '#10b981',
                color: 'white',
                padding: '14px 28px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: filteredSelectedCount === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Next: Review & Submit →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.2)'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '24px'
            }}
          >
            ✅ Review & Submit Payroll Run
          </h2>

          {/* Payroll Details */}
          <div
            style={{
              marginBottom: '32px',
              padding: '24px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '16px'
              }}
            >
              📋 Payroll Run Details
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    fontWeight: '600'
                  }}
                >
                  Description:
                </label>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '16px',
                    color: '#1f2937',
                    fontWeight: 'bold'
                  }}
                >
                  {payrollData.description}
                </p>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    fontWeight: '600'
                  }}
                >
                  Pay Period:
                </label>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '16px',
                    color: '#1f2937',
                    fontWeight: 'bold'
                  }}
                >
                  {formatDate(payrollData.payPeriodStart)} - {formatDate(payrollData.payPeriodEnd)}
                </p>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    fontWeight: '600'
                  }}
                >
                  Pay Date:
                </label>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '16px',
                    color: '#1f2937',
                    fontWeight: 'bold'
                  }}
                >
                  {formatDate(payrollData.payDate)}
                </p>
              </div>

              {selectedSchedule && (
                <div>
                  <label
                    style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}
                  >
                    Pay Schedule Filter:
                  </label>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '16px',
                      color: '#1f2937',
                      fontWeight: 'bold'
                    }}
                  >
                    {selectedScheduleInfo?.name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div
            style={{
              marginBottom: '32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}
          >
            <div
              style={{
                padding: '24px',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                textAlign: 'center',
                border: '2px solid #0284c7'
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#0369a1',
                  marginBottom: '8px'
                }}
              >
                {totals.employeeCount}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#075985',
                  fontWeight: '600'
                }}
              >
                Employees
              </div>
            </div>

            <div
              style={{
                padding: '24px',
                backgroundColor: '#f0fdf4',
                borderRadius: '12px',
                textAlign: 'center',
                border: '2px solid #10b981'
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#059669',
                  marginBottom: '8px'
                }}
              >
                {formatCurrency(totals.totalGross)}
              </div>
              <div style={{}}>Total Gross Pay</div>
            </div>

            <div
              style={{
                padding: '24px',
                backgroundColor: '#fef2f2',
                borderRadius: '12px',
                textAlign: 'center',
                border: '2px solid #ef4444'
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#dc2626',
                  marginBottom: '8px'
                }}
              >
                {formatCurrency(totals.totalTax + totals.totalNI + totals.totalPension)}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#991b1b',
                  fontWeight: '600'
                }}
              >
                Total Deductions
              </div>
            </div>

            <div
              style={{
                padding: '24px',
                backgroundColor: '#f0fdf4',
                borderRadius: '12px',
                textAlign: 'center',
                border: '2px solid #10b981'
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#059669',
                  marginBottom: '8px'
                }}
              >
                {formatCurrency(totals.totalNet)}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#047857',
                  fontWeight: '600'
                }}
              >
                Total Net Pay
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div
            style={{
              marginBottom: '32px',
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '16px'
              }}
            >
              💰 Deduction Breakdown
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px'
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#dc2626'
                  }}
                >
                  {formatCurrency(totals.totalTax)}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#991b1b'
                  }}
                >
                  Income Tax
                </div>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#dc2626'
                  }}
                >
                  {formatCurrency(totals.totalNI)}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#991b1b'
                  }}
                >
                  National Insurance
                </div>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#dc2626'
                  }}
                >
                  {formatCurrency(totals.totalPension)}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#991b1b'
                  }}
                >
                  Pension Contributions
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <button
              onClick={prevStep}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '14px 28px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ← Back to Employee Selection
            </button>

            <button
              onClick={submitPayrollRun}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#9ca3af' : '#059669',
                color: 'white',
                padding: '16px 32px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  Creating Payroll Run...
                </>
              ) : (
                <>✅ Create Payroll Run</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Custom CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
