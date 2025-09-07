'use client';

import { useState, useEffect } from 'react';

// Real payroll service that calls the API
const payrollService = {
  createPayrollRun: async (data: any) => {
    console.log('📤 Submitting payroll data to API:', data);

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(
          errorData.message || errorData.error || 'Failed to create payroll run',
        );
      }

      const result = await response.json();
      console.log('✅ API Success:', result);

      return result;
    } catch (error) {
      console.error('❌ Network/Parse Error:', error);
      throw error;
    }
  },
};

// Simulated employee service
const employeeService = {
  getEmployees: async () => ({
    employees: [
      {
        id: 'emp-001',
        employeeNumber: 'EMP001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        annualSalary: 35000,
        status: 'active',
      },
      {
        id: 'emp-002',
        employeeNumber: 'EMP002',
        firstName: 'Michael',
        lastName: 'Brown',
        annualSalary: 42000,
        status: 'active',
      },
      {
        id: 'emp-003',
        employeeNumber: 'EMP003',
        firstName: 'Emma',
        lastName: 'Davis',
        annualSalary: 38000,
        status: 'active',
      },
    ],
  }),
};

// Format currency as GBP
const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

// Format date
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  } catch {
    return dateStr;
  }
};

interface PayrollEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  annualSalary: number;
  grossPay: number;
  taxDeduction: number;
  niDeduction: number;
  pensionDeduction: number;
  netPay: number;
  selected: boolean;
}

interface NewStartersCheck {
  hasNewStarters: boolean;
  newStartersProcessed: boolean;
  checkedBy: string;
  checkedDate: string;
  p45FormsAccessed: boolean;
}

interface PayrollData {
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  description: string;
}

export default function NewPayrollRunPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [payrollCreated, setPayrollCreated] = useState(false);
  const [createdPayrollId, setCreatedPayrollId] = useState('');

  const [newStartersCheck, setNewStartersCheck] = useState<NewStartersCheck>({
    hasNewStarters: false,
    newStartersProcessed: false,
    checkedBy: 'Adam',
    checkedDate: '2025-09-07',
    p45FormsAccessed: false,
  });

  const [payrollData, setPayrollData] = useState<PayrollData>({
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    description: '',
  });

  useEffect(() => {
    loadEmployees();
    initializeDates();
  }, []);

  const initializeDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const payDay = new Date(now.getFullYear(), now.getMonth() + 1, 5);

    setPayrollData({
      payPeriodStart: firstDay.toISOString().split('T')[0],
      payPeriodEnd: lastDay.toISOString().split('T')[0],
      payDate: payDay.toISOString().split('T')[0],
      description: `WageFlow - ${firstDay.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })}`,
    });
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getEmployees();
      const employeeData = response?.employees || [];

      const payrollEmployees: PayrollEmployee[] = employeeData.map((emp: any) => {
        const annual = Number(emp?.annualSalary) || 0;
        const monthlyGross = annual / 12;

        const taxDeduction = monthlyGross * 0.2;
        const niDeduction = monthlyGross * 0.12;
        const pensionDeduction = monthlyGross * 0.05;
        const netPay = monthlyGross - taxDeduction - niDeduction - pensionDeduction;

        return {
          id: String(emp?.id || ''),
          employeeNumber: String(emp?.employeeNumber || ''),
          firstName: String(emp?.firstName || ''),
          lastName: String(emp?.lastName || ''),
          annualSalary: annual,
          grossPay: monthlyGross,
          taxDeduction,
          niDeduction,
          pensionDeduction,
          netPay,
          selected: true,
        };
      });

      setEmployees(payrollEmployees);
      setSelectedEmployees(payrollEmployees.map((emp) => emp.id));
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    );

    setEmployees((prev) =>
      prev.map((emp) => (emp.id === employeeId ? { ...emp, selected: !emp.selected } : emp)),
    );
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 0:
        return selectedEmployees.length > 0;
      case 1:
        return newStartersCheck.checkedBy.trim().length > 0;
      case 2:
        return Boolean(payrollData.payPeriodStart && payrollData.payPeriodEnd && payrollData.payDate);
      case 3: {
        const hasEmployees = selectedEmployees.length > 0;
        const hasCheckedBy = newStartersCheck.checkedBy.trim().length > 0;
        const hasDates = Boolean(
          payrollData.payPeriodStart && payrollData.payPeriodEnd && payrollData.payDate,
        );
        const newStartersOk =
          !newStartersCheck.hasNewStarters || newStartersCheck.newStartersProcessed;

        return hasEmployees && hasCheckedBy && hasDates && newStartersOk;
      }
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      alert('Please complete all required fields before proceeding.');
      return;
    }

    if (step === 1 && !newStartersCheck.hasNewStarters) {
      setStep(2); // Skip to payroll details
    } else {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    if (step === 2 && !newStartersCheck.hasNewStarters) {
      setStep(1); // Skip back to new starters check
    } else {
      setStep((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleCreatePayrollRun = async () => {
    console.log('🚀 Create Payroll button clicked!');

    if (!validateStep(3)) {
      alert('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);

      const selectedEmployeeData = employees.filter((emp) => selectedEmployees.includes(emp.id));
      const totals = {
        gross: selectedEmployeeData.reduce((sum, emp) => sum + emp.grossPay, 0),
        tax: selectedEmployeeData.reduce((sum, emp) => sum + emp.taxDeduction, 0),
        ni: selectedEmployeeData.reduce((sum, emp) => sum + emp.niDeduction, 0),
        pension: selectedEmployeeData.reduce((sum, emp) => sum + emp.pensionDeduction, 0),
        net: selectedEmployeeData.reduce((sum, emp) => sum + emp.netPay, 0),
      };

      const payrollRunData = {
        payPeriodStart: payrollData.payPeriodStart,
        payPeriodEnd: payrollData.payPeriodEnd,
        payDate: payrollData.payDate,
        description: payrollData.description,
        employees: selectedEmployeeData,
        selectedEmployees: selectedEmployees,
        newStartersCheck: newStartersCheck,
        totalGrossPay: totals.gross,
        totalNetPay: totals.net,
        totals: totals,
        createdBy: newStartersCheck.checkedBy,
        createdAt: new Date().toISOString(),
      };

      console.log('📊 Final payroll data being sent:', payrollRunData);

      const result = await payrollService.createPayrollRun(payrollRunData);

      if (result.success) {
        setCreatedPayrollId(result.id || result.runNumber || `PR-${Date.now()}`);
        setPayrollCreated(true);
        setStep(4); // Move to success step

        console.log('🎉 Payroll run created successfully:', result);
      } else {
        throw new Error(result.message || 'Failed to create payroll run');
      }
    } catch (error) {
      console.error('❌ Failed to create payroll run:', error);
      alert(`❌ Failed to create payroll run: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for display
  const selectedEmployeeData = employees.filter((emp) => selectedEmployees.includes(emp.id));
  const totals = {
    gross: selectedEmployeeData.reduce((sum, emp) => sum + emp.grossPay, 0),
    tax: selectedEmployeeData.reduce((sum, emp) => sum + emp.taxDeduction, 0),
    ni: selectedEmployeeData.reduce((sum, emp) => sum + emp.niDeduction, 0),
    pension: selectedEmployeeData.reduce((sum, emp) => sum + emp.pensionDeduction, 0),
    net: selectedEmployeeData.reduce((sum, emp) => sum + emp.netPay, 0),
  };

  const styles = {
    container: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxWidth: '1000px',
      margin: '0 auto 20px auto',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '30px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a202c',
      margin: '0',
    },
    stepTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#2d3748',
      marginBottom: '16px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginTop: '16px',
    },
    th: {
      backgroundColor: '#f7fafc',
      padding: '12px',
      textAlign: 'left' as const,
      fontSize: '14px',
      fontWeight: '600',
      color: '#4a5568',
      borderBottom: '1px solid #e2e8f0',
    } as React.CSSProperties,
    td: {
      padding: '12px',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px',
      color: '#2d3748',
    },
    button: {
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: '#4299e1',
      color: 'white',
      marginRight: '12px',
    },
    buttonSecondary: {
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      backgroundColor: '#f7fafc',
      color: '#4a5568',
      marginRight: '12px',
    },
    buttonDisabled: {
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      border: 'none',
      cursor: 'not-allowed',
      backgroundColor: '#a0aec0',
      color: 'white',
      marginRight: '12px',
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      fontSize: '14px',
    },
    formGroup: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#4a5568',
      marginBottom: '8px',
    },
    alert: {
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px',
      backgroundColor: '#e6fffa',
      border: '1px solid #81e6d9',
      color: '#234e52',
    },
    alertWarning: {
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px',
      backgroundColor: '#fffbeb',
      border: '1px solid #f6e05e',
      color: '#744210',
    },
    summary: {
      backgroundColor: '#f7fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px',
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
    },
    buttonRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '24px',
    },
    progressBar: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '30px',
      gap: '10px',
    },
    progressStep: {
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 'bold',
    },
    progressStepActive: {
      backgroundColor: '#4299e1',
      color: 'white',
    },
    progressStepCompleted: {
      backgroundColor: '#48bb78',
      color: 'white',
    },
    progressStepInactive: {
      backgroundColor: '#e2e8f0',
      color: '#a0aec0',
    },
    successCard: {
      textAlign: 'center' as const,
      padding: '40px 20px',
    },
    link: { color: '#4299e1', textDecoration: 'none' },
    progressLine: { width: '40px', height: '2px', backgroundColor: '#e2e8f0' },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>💼 WageFlow - New Payroll Run</h1>
          <a href="/dashboard/payroll" style={styles.link}>
            ← Back to Payroll Dashboard
          </a>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.card}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressStep,
              ...(step >= 0 ? styles.progressStepCompleted : styles.progressStepInactive),
            }}
          >
            1
          </div>
          <div style={styles.progressLine} />
          <div
            style={{
              ...styles.progressStep,
              ...(step >= 1
                ? styles.progressStepCompleted
                : step === 1
                ? styles.progressStepActive
                : styles.progressStepInactive),
            }}
          >
            2
          </div>
          <div style={styles.progressLine} />
          <div
            style={{
              ...styles.progressStep,
              ...(step >= 2
                ? styles.progressStepCompleted
                : step === 2
                ? styles.progressStepActive
                : styles.progressStepInactive),
            }}
          >
            3
          </div>
          <div style={styles.progressLine} />
          <div
            style={{
              ...styles.progressStep,
              ...(step >= 3
                ? styles.progressStepCompleted
                : step === 3
                ? styles.progressStepActive
                : styles.progressStepInactive),
            }}
          >
            4
          </div>
          {payrollCreated && (
            <>
              <div style={styles.progressLine} />
              <div style={{ ...styles.progressStep, ...styles.progressStepCompleted }}>✓</div>
            </>
          )}
        </div>
      </div>

      {/* Step 0 - Employee Selection */}
      {step === 0 && (
        <div style={styles.card}>
          <h2 style={styles.stepTitle}>1. Select Employees for Payroll</h2>

          {loading ? (
            <p>Loading employees...</p>
          ) : (
            <>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Select</th>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Annual Salary</th>
                    <th style={styles.th}>Gross Pay</th>
                    <th style={styles.th}>Tax</th>
                    <th style={styles.th}>NI</th>
                    <th style={styles.th}>Pension</th>
                    <th style={styles.th}>Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={emp.selected}
                          onChange={() => handleEmployeeToggle(emp.id)}
                        />
                      </td>
                      <td style={styles.td}>
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td style={styles.td}>{formatCurrency(emp.annualSalary)}</td>
                      <td style={styles.td}>{formatCurrency(emp.grossPay)}</td>
                      <td style={styles.td}>{formatCurrency(emp.taxDeduction)}</td>
                      <td style={styles.td}>{formatCurrency(emp.niDeduction)}</td>
                      <td style={styles.td}>{formatCurrency(emp.pensionDeduction)}</td>
                      <td style={styles.td}>{formatCurrency(emp.netPay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={styles.summary}>
                <h3>Summary ({selectedEmployees.length} employees selected)</h3>
                <div style={styles.summaryGrid}>
                  <div>
                    <strong>Gross Pay:</strong> {formatCurrency(totals.gross)}
                  </div>
                  <div>
                    <strong>Tax:</strong> {formatCurrency(totals.tax)}
                  </div>
                  <div>
                    <strong>NI:</strong> {formatCurrency(totals.ni)}
                  </div>
                  <div>
                    <strong>Pension:</strong> {formatCurrency(totals.pension)}
                  </div>
                  <div>
                    <strong>Net Pay:</strong> {formatCurrency(totals.net)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 1 - New Starters Check */}
      {step === 1 && (
        <div style={styles.card}>
          <h2 style={styles.stepTitle}>2. New Starters Check</h2>

          <div style={styles.alert}>
            <strong>Important:</strong> Before processing payroll, confirm whether you have any
            new employees who started since your last payroll run.
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>Do you have any new starters since the last payroll run?</label>
            <div>
              <label style={{ marginRight: '20px' }}>
                <input
                  type="radio"
                  name="hasNewStarters"
                  checked={newStartersCheck.hasNewStarters === true}
                  onChange={() => setNewStartersCheck((prev) => ({ ...prev, hasNewStarters: true }))}
                  style={{ marginRight: '8px' }}
                />
                Yes, I have new starters to process
              </label>
              <label>
                <input
                  type="radio"
                  name="hasNewStarters"
                  checked={newStartersCheck.hasNewStarters === false}
                  onChange={() =>
                    setNewStartersCheck((prev) => ({
                      ...prev,
                      hasNewStarters: false,
                      newStartersProcessed: true,
                    }))
                  }
                  style={{ marginRight: '8px' }}
                />
                No new starters since last payroll
              </label>
            </div>
          </div>

          {newStartersCheck.hasNewStarters && (
            <div style={styles.alertWarning}>
              <strong>New Starters Detected:</strong> You would normally process P45 forms and add
              new employees here. For this demo, click the button below to mark as processed.
              <br />
              <button
                onClick={() =>
                  setNewStartersCheck((prev) => ({
                    ...prev,
                    newStartersProcessed: true,
                    p45FormsAccessed: true,
                  }))
                }
                style={{ ...styles.button, marginTop: '12px' }}
              >
                Mark New Starters as Processed
              </button>
              {newStartersCheck.newStartersProcessed && (
                <div style={{ marginTop: '12px', color: '#22543d' }}>
                  ✅ New starters have been processed successfully!
                </div>
              )}
            </div>
          )}

          <div style={styles.formGroup}>
            <div>
              <label style={styles.label}>Checked by:</label>
              <input
                type="text"
                value={newStartersCheck.checkedBy}
                onChange={(e) =>
                  setNewStartersCheck((prev) => ({ ...prev, checkedBy: e.target.value }))
                }
                style={styles.input}
                placeholder="Your name"
              />
            </div>
            <div>
              <label style={styles.label}>Check date:</label>
              <input
                type="date"
                value={newStartersCheck.checkedDate}
                onChange={(e) =>
                  setNewStartersCheck((prev) => ({ ...prev, checkedDate: e.target.value }))
                }
                style={styles.input}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 - Payroll Details */}
      {step === 2 && (
        <div style={styles.card}>
          <h2 style={styles.stepTitle}>3. Payroll Period & Date Settings</h2>

          <div style={styles.formGroup}>
            <div>
              <label style={styles.label}>Pay Period Start:</label>
              <input
                type="date"
                value={payrollData.payPeriodStart}
                onChange={(e) =>
                  setPayrollData((prev) => ({ ...prev, payPeriodStart: e.target.value }))
                }
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Pay Period End:</label>
              <input
                type="date"
                value={payrollData.payPeriodEnd}
                onChange={(e) =>
                  setPayrollData((prev) => ({ ...prev, payPeriodEnd: e.target.value }))
                }
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Pay Date:</label>
              <input
                type="date"
                value={payrollData.payDate}
                onChange={(e) => setPayrollData((prev) => ({ ...prev, payDate: e.target.value }))}
                style={styles.input}
              />
            </div>
          </div>

          <div>
            <label style={styles.label}>Payroll Description:</label>
            <input
              type="text"
              value={payrollData.description}
              onChange={(e) =>
                setPayrollData((prev) => ({ ...prev, description: e.target.value }))
              }
              style={styles.input}
              placeholder="e.g., WageFlow - September 2025"
            />
          </div>

          <div style={styles.summary}>
            <h3>Payroll Summary</h3>
            <div style={styles.summaryGrid}>
              <div>
                <strong>Pay Period:</strong> {formatDate(payrollData.payPeriodStart)} -{' '}
                {formatDate(payrollData.payPeriodEnd)}
              </div>
              <div>
                <strong>Pay Date:</strong> {formatDate(payrollData.payDate)}
              </div>
              <div>
                <strong>Employees:</strong> {selectedEmployees.length}
              </div>
              <div>
                <strong>Total Gross:</strong> {formatCurrency(totals.gross)}
              </div>
              <div>
                <strong>Total Net:</strong> {formatCurrency(totals.net)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 - Final Review */}
      {step === 3 && (
        <div style={styles.card}>
          <h2 style={styles.stepTitle}>4. Final Review & Create Payroll Run</h2>

          <div style={styles.alert}>
            <strong>Ready to Create Payroll Run</strong>
            <br />
            Please review all details below before creating the payroll run.
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Employee Selection</h3>
            <p>{selectedEmployees.length} employees selected for payroll</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>New Starters</h3>
            <p>Status: {newStartersCheck.hasNewStarters ? 'New starters processed' : 'No new starters'}</p>
            <p>
              Checked by: {newStartersCheck.checkedBy} on {formatDate(newStartersCheck.checkedDate)}
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Payroll Details</h3>
            <p>
              Period: {formatDate(payrollData.payPeriodStart)} - {formatDate(payrollData.payPeriodEnd)}
            </p>
            <p>Pay Date: {formatDate(payrollData.payDate)}</p>
          </div>

          <div style={styles.summary}>
            <h3>Financial Summary</h3>
            <div style={styles.summaryGrid}>
              <div>
                <strong>Gross Pay:</strong> {formatCurrency(totals.gross)}
              </div>
              <div>
                <strong>Total Tax:</strong> {formatCurrency(totals.tax)}
              </div>
              <div>
                <strong>Total NI:</strong> {formatCurrency(totals.ni)}
              </div>
              <div>
                <strong>Pension:</strong> {formatCurrency(totals.pension)}
              </div>
              <div style={{ fontSize: '18px', color: '#22543d' }}>
                <strong>Net Pay: {formatCurrency(totals.net)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 - Success */}
      {step === 4 && payrollCreated && (
        <div style={styles.card}>
          <div style={styles.successCard}>
            <h2>🎉 Payroll Run Created Successfully!</h2>
            <p style={{ fontSize: '18px', marginBottom: '20px' }}>
              Your payroll run <strong>{createdPayrollId}</strong> has been created and is ready for
              processing.
            </p>

            <div style={styles.summary}>
              <h3>Payroll Summary</h3>
              <div style={styles.summaryGrid}>
                <div>
                  <strong>Payroll ID:</strong> {createdPayrollId}
                </div>
                <div>
                  <strong>Pay Period:</strong> {formatDate(payrollData.payPeriodStart)} -{' '}
                  {formatDate(payrollData.payPeriodEnd)}
                </div>
                <div>
                  <strong>Pay Date:</strong> {formatDate(payrollData.payDate)}
                </div>
                <div>
                  <strong>Employees:</strong> {selectedEmployees.length}
                </div>
                <div>
                  <strong>Total Net:</strong> {formatCurrency(totals.net)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button onClick={() => (window.location.href = '/dashboard/payroll')} style={styles.button}>
                Return to Payroll Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={styles.card}>
        <div style={styles.buttonRow}>
          <div>
            {step > 0 && step < 4 && (
              <button onClick={prevStep} style={styles.buttonSecondary}>
                ← Previous
              </button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <button
                onClick={nextStep}
                style={validateStep(step) ? styles.button : styles.buttonDisabled}
                disabled={!validateStep(step)}
              >
                Next Step →
              </button>
            ) : step === 3 && !payrollCreated ? (
              <button
                onClick={handleCreatePayrollRun}
                style={loading || !validateStep(3) ? styles.buttonDisabled : styles.button}
                disabled={loading || !validateStep(3)}
              >
                {loading ? 'Creating...' : 'Create Payroll Run'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
