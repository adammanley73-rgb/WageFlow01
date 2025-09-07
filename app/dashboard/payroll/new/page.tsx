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

  // Basic styles (replace with Tailwind or your design system later)
  const styles = {
    page: { maxWidth: 1100, margin: '0 auto', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' },
    header: { marginBottom: 16 },
    backLink: { color: '#1e40af', textDecoration: 'none', fontSize: 14 },
    h1: { margin: '8px 0 4px', fontSize: 24 },
    p: { margin: '0 0 16px', color: '#475569' },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 18, marginBottom: 12 },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
    label: { display: 'block', fontSize: 14, marginBottom: 6 },
    input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' },
    select: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' },
    btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
    btn: { padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' },
    btnPrimary: { padding: '10px 14px', borderRadius: 6, border: '1px solid #1d4ed8', background: '#2563eb', color: '#fff', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { textAlign: 'left' as const, padding: '8px 6px', borderBottom: '1px solid #e2e8f0', fontSize: 14 },
    td: { padding: '8px 6px', borderBottom: '1px solid #f1f5f9', fontSize: 14, verticalAlign: 'top' as const },
    totals: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 8 },
    muted: { color: '#64748b', fontSize: 13 },
  };

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

        const round2 = (v: number) => Math.round(v * 100) / 100;

        return {
          ...emp,
          grossPay: round2(monthlyGross),
          taxDeduction: round2(taxDeduction),
          niDeduction: round2(niDeduction),
          pensionDeduction: round2(pensionDeduction),
          netPay: round2(netPay),
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

    const iso = (d: Date) => d.toISOString().split('T')[0];

    setPayrollData({
      payPeriodStart: iso(firstDay),
      payPeriodEnd: iso(lastDay),
      payDate: iso(payDay),
      description: `Payroll - ${firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
    });
  };

  const filteredEmployees = selectedSchedule
    ? employees.filter((emp) => emp.payScheduleId === selectedSchedule)
    : employees;

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
    const sum = (arr: PayrollEmployee[], f: (e: PayrollEmployee) => number) =>
      Math.round(arr.reduce((s, e) => s + f(e), 0) * 100) / 100;

    return {
      employeeCount: selected.length,
      totalGross: sum(selected, (e) => e.grossPay),
      totalTax: sum(selected, (e) => e.taxDeduction),
      totalNI: sum(selected, (e) => e.niDeduction),
      totalPension: sum(selected, (e) => e.pensionDeduction),
      totalNet: sum(selected, (e) => e.netPay),
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    if (totals.employeeCount === 0) {
      alert('Please select at least one employee for the payroll run.');
      return;
    }

    setLoading(true);

    try {
      const selectedEmployeeData = filteredEmployees.filter((emp) => selectedEmployees.includes(emp.id));

      const payrollPayload = {
        payPeriodStart: payrollData.payPeriodStart,
        payPeriodEnd: payrollData.payPeriodEnd,
        payDate: payrollData.payDate,
        description: payrollData.description,
        employees: selectedEmployeeData,
        totals: {
          employeeCount: totals.employeeCount,
          totalGross: totals.totalGross,
          totalTax: totals.totalTax,
          totalNI: totals.totalNI,
          totalPension: totals.totalPension,
          totalNet: totals.totalNet,
        },
      };

      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payrollPayload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed with ${response.status}`);
      }

      const result = await response.json();

      alert(
        `Payroll run ${result.runNumber} created successfully.\n\n` +
          `Employees: ${result.totals?.employeeCount ?? totals.employeeCount}\n` +
          `Gross: ${formatCurrency(result.totals?.totalGross ?? totals.totalGross)}\n` +
          `Net: ${formatCurrency(result.totals?.totalNet ?? totals.totalNet)}`
      );

      router.push('/dashboard/payroll');
    } catch (error) {
      console.error('Failed to create payroll run:', error);
      alert('Failed to create payroll run. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedScheduleInfo = selectedSchedule
    ? PAY_SCHEDULES.find((s) => s.id === selectedSchedule)
    : null;

  const filteredSelectedCount = filteredEmployees.filter((emp) => selectedEmployees.includes(emp.id)).length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Link href="/dashboard/payroll" style={styles.backLink}>
          ← Back to Payroll Dashboard
        </Link>
        <h1 style={styles.h1}>Create New Payroll Run</h1>
        <p style={styles.p}>Set the payroll period and select employees by pay schedule.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Setup Section */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Payroll Setup</h2>

          <div style={styles.row}>
            <div>
              <label style={styles.label}>Pay Schedule (filter employees)</label>
              <select
                value={selectedSchedule}
                onChange={(e) => setSelectedSchedule(e.target.value)}
                style={styles.select}
              >
                <option value="">All Employees</option>
                {PAY_SCHEDULES.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.name} ({schedule.frequency.replace('_', '-')})
                  </option>
                ))}
              </select>
              {selectedScheduleInfo ? (
                <p style={styles.muted}>{selectedScheduleInfo.description}</p>
              ) : (
                <p style={styles.muted}>Showing all active employees.</p>
              )}
            </div>

            <div>
              <label style={styles.label}>Description</label>
              <input
                type="text"
                value={payrollData.description}
                onChange={(e) => setPayrollData((p) => ({ ...p, description: e.target.value }))}
                style={styles.input}
                placeholder="e.g., Payroll - September 2025"
              />
            </div>
          </div>

          <div style={styles.row}>
            <div>
              <label style={styles.label}>Pay period start</label>
              <input
                type="date"
                value={payrollData.payPeriodStart}
                onChange={(e) => setPayrollData((p) => ({ ...p, payPeriodStart: e.target.value }))}
                style={styles.input}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Pay period end</label>
              <input
                type="date"
                value={payrollData.payPeriodEnd}
                onChange={(e) => setPayrollData((p) => ({ ...p, payPeriodEnd: e.target.value }))}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.row}>
            <div>
              <label style={styles.label}>Pay date</label>
              <input
                type="date"
                value={payrollData.payDate}
                onChange={(e) => setPayrollData((p) => ({ ...p, payDate: e.target.value }))}
                style={styles.input}
                required
              />
            </div>
          </div>
        </div>

        {/* Employees Section */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Employees ({filteredSelectedCount}/{filteredEmployees.length} selected)
          </h2>

          <div style={styles.btnRow}>
            <button type="button" style={styles.btn} onClick={selectAllFiltered}>
              Select all in view
            </button>
            <button type="button" style={styles.btn} onClick={deselectAllFiltered}>
              Deselect all in view
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Select</th>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Number</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Gross</th>
                  <th style={styles.th}>Tax</th>
                  <th style={styles.th}>NI</th>
                  <th style={styles.th}>Pension</th>
                  <th style={styles.th}>Net</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                      />
                    </td>
                    <td style={styles.td}>
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td style={styles.td}>{emp.employeeNumber}</td>
                    <td style={styles.td}>{emp.email}</td>
                    <td style={styles.td}>{formatCurrency(emp.grossPay)}</td>
                    <td style={styles.td}>{formatCurrency(emp.taxDeduction)}</td>
                    <td style={styles.td}>{formatCurrency(emp.niDeduction)}</td>
                    <td style={styles.td}>{formatCurrency(emp.pensionDeduction)}</td>
                    <td style={styles.td}>{formatCurrency(emp.netPay)}</td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td style={styles.td} colSpan={9}>
                      No employees in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Totals</h2>
          <div style={styles.totals}>
            <div>
              <div style={styles.muted}>Employees</div>
              <div>{totals.employeeCount}</div>
            </div>
            <div>
              <div style={styles.muted}>Gross</div>
              <div>{formatCurrency(totals.totalGross)}</div>
            </div>
            <div>
              <div style={styles.muted}>Tax</div>
              <div>{formatCurrency(totals.totalTax)}</div>
            </div>
            <div>
              <div style={styles.muted}>NI</div>
              <div>{formatCurrency(totals.totalNI)}</div>
            </div>
            <div>
              <div style={styles.muted}>Net</div>
              <div>{formatCurrency(totals.totalNet)}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Link href="/dashboard/payroll" style={styles.btn as React.CSSProperties}>
            Cancel
          </Link>
          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? 'Creating…' : 'Create payroll run'}
          </button>
        </div>
      </form>
    </div>
  );
}
