'use client';

import React, { useEffect, useState, type CSSProperties } from 'react';
import { useRouter, useParams } from 'next/navigation';

// UK date formatting helper – dd-mm-yyyy
const formatDateUK = (dateString: string): string => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// UK currency formatting helper – £ with 2 decimal places
const formatCurrencyUK = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '£0.00';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string; // ISO string
  nationalInsurance?: string;
  annualSalary: number;
  hireDate: string; // ISO string
  status: string;
  address?: {
    line1: string;
    city: string;
    postcode: string;
  };
};

const styles: Record<string, CSSProperties> = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '24px',
  },
  maxWidth: { maxWidth: '1100px', margin: '0 auto' },
  headerRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 600,
    padding: '8px 12px',
    border: '1px solid #dbeafe',
    borderRadius: '8px',
    backgroundColor: '#eff6ff',
  },
  linkSecondary: {
    color: '#374151',
    textDecoration: 'none',
    fontWeight: 500,
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
    marginBottom: '16px',
  },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 },
  sub: { fontSize: '14px', color: '#6b7280', margin: '6px 0 0 0' },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '12px',
  },
  label: { fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' },
  value: { fontSize: '14px', color: '#111827', margin: 0 },
  valueEm: { fontSize: '16px', color: '#111827', margin: 0, fontWeight: 600 },
  badgeOk: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid #bbf7d0',
    display: 'inline-block',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  statusContainer: {
    marginTop: '8px',
  },
};

export default function EmployeeDetailsPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const employeeId = id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoEnrollmentStatus, setAutoEnrollmentStatus] = useState('');

  useEffect(() => {
    // Demo employee data
    const demoEmployees: Employee[] = [
      {
        id: 'EMP001',
        employeeNumber: 'EMP001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@company.com',
        phone: '+44 7700 900001',
        dateOfBirth: '1985-03-15',
        nationalInsurance: 'AB123456C',
        annualSalary: 35000,
        hireDate: '2023-01-15',
        status: 'Active',
        address: { line1: '123 High Street', city: 'London', postcode: 'SW1A 1AA' },
      },
      {
        id: 'EMP002',
        employeeNumber: 'EMP002',
        firstName: 'James',
        lastName: 'Wilson',
        email: 'james.wilson@company.com',
        phone: '+44 7700 900002',
        dateOfBirth: '1990-08-22',
        nationalInsurance: 'CD234567D',
        annualSalary: 28000,
        hireDate: '2021-07-10',
        status: 'Active',
        address: { line1: '456 Park Avenue', city: 'Manchester', postcode: 'M1 3CD' },
      },
      {
        id: 'EMP003',
        employeeNumber: 'EMP003',
        firstName: 'Emma',
        lastName: 'Brown',
        email: 'emma.brown@company.com',
        phone: '+44 7700 900003',
        dateOfBirth: '1985-12-03',
        nationalInsurance: 'EF345678E',
        annualSalary: 45000,
        hireDate: '2019-11-20',
        status: 'Active',
        address: { line1: '789 Oak Road', city: 'Birmingham', postcode: 'B1 4EF' },
      },
      {
        id: 'EMP004',
        employeeNumber: 'EMP004',
        firstName: 'Michael',
        lastName: 'Davis',
        email: 'michael.davis@company.com',
        phone: '+44 7700 900004',
        dateOfBirth: '1992-04-18',
        nationalInsurance: 'GH456789F',
        annualSalary: 32000,
        hireDate: '2022-02-01',
        status: 'Active',
        address: { line1: '321 Maple Close', city: 'Liverpool', postcode: 'L3 5GH' },
      },
      {
        id: 'EMP005',
        employeeNumber: 'EMP005',
        firstName: 'Lisa',
        lastName: 'Taylor',
        email: 'lisa.taylor@company.com',
        phone: '+44 7700 900005',
        dateOfBirth: '1988-09-12',
        nationalInsurance: 'IJ567890G',
        annualSalary: 38000,
        hireDate: '2020-09-14',
        status: 'Active',
        address: { line1: '654 Cedar Lane', city: 'Bristol', postcode: 'BS4 6IJ' },
      },
    ];

    const found = demoEmployees.find((e) => e.id === employeeId) || null;
    setEmployee(found);
    if (found) calculateAutoEnrollmentStatus(found);
    setLoading(false);
  }, [employeeId]);

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return 0;
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const calculateAutoEnrollmentStatus = (emp: Employee) => {
    const age = calculateAge(emp.dateOfBirth);
    // UK Auto-enrolment thresholds 2025-2026
    if (age >= 22 && age < 75 && emp.annualSalary >= 10000) {
      setAutoEnrollmentStatus('Eligible (Auto-enrolled into workplace pension)');
    } else if (age >= 16 && age < 75 && emp.annualSalary >= 6240) {
      setAutoEnrollmentStatus('Entitled (Can opt-in to workplace pension)');
    } else {
      setAutoEnrollmentStatus('Not eligible (Below age or salary thresholds)');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card}>
            <h1 style={styles.title}>Loading employee details…</h1>
            <p style={styles.sub}>Tax year 2025-2026</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card}>
            <h1 style={styles.title}>Employee not found</h1>
            <p style={styles.sub}>The employee you're looking for doesn't exist.</p>
            <a href="/dashboard/employees" style={styles.linkSecondary}>
              ← Back to employee list
            </a>
          </div>
        </div>
      </div>
    );
  }

  const age = calculateAge(employee.dateOfBirth);

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.headerRow}>
          <a href="/dashboard/employees" style={styles.linkSecondary}>← Back to employees</a>
          <a href={`/dashboard/employees/${employee.id}/edit`} style={styles.link}>✏️ Edit employee</a>
        </div>

        {/* Employee Details */}
        <div style={styles.card}>
          <h1 style={styles.title}>
            {employee.firstName} {employee.lastName}
          </h1>
          <p style={styles.sub}>
            Employee #{employee.employeeNumber} · Status: {employee.status} · Tax year 2025-2026
          </p>
        </div>

        {/* Details Grid */}
        <div style={styles.card}>
          <div style={styles.grid2}>
            {/* Personal Information */}
            <div>
              <h2 style={styles.sectionTitle}>Personal information</h2>
              <div style={styles.grid2}>
                <div>
                  <p style={styles.label}>Full name</p>
                  <p style={styles.value}>
                    {employee.firstName} {employee.lastName}
                  </p>
                </div>
                <div>
                  <p style={styles.label}>Email</p>
                  <p style={styles.value}>{employee.email}</p>
                </div>
                <div>
                  <p style={styles.label}>Phone</p>
                  <p style={styles.value}>{employee.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p style={styles.label}>Date of birth</p>
                  <p style={styles.value}>
                    {formatDateUK(employee.dateOfBirth)} (Age {age})
                  </p>
                </div>
                <div>
                  <p style={styles.label}>National Insurance</p>
                  <p style={styles.value}>{employee.nationalInsurance || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div>
              <h2 style={styles.sectionTitle}>Employment information</h2>
              <div style={styles.grid2}>
                <div>
                  <p style={styles.label}>Annual salary</p>
                  <p style={styles.valueEm}>{formatCurrencyUK(employee.annualSalary)}</p>
                  <p style={styles.sub}>Monthly: {formatCurrencyUK(employee.annualSalary / 12)}</p>
                </div>
                <div>
                  <p style={styles.label}>Hire date</p>
                  <p style={styles.value}>{formatDateUK(employee.hireDate)}</p>
                </div>
                <div>
                  <p style={styles.label}>RTI</p>
                  <span style={styles.badgeOk}>Up to date</span>
                </div>
              </div>
            </div>

            {/* Address */}
            {employee.address && (
              <div>
                <h2 style={styles.sectionTitle}>Address</h2>
                <p style={styles.value}>
                  {employee.address.line1}
                  <br />
                  {employee.address.city}
                  <br />
                  {employee.address.postcode}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Auto-Enrolment – 2025-2026 */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            UK auto-enrolment status (2025-2026)
          </h2>
          <p style={styles.valueEm}>{autoEnrollmentStatus}</p>
          <div style={styles.statusContainer}>
            <p style={styles.value}>• Eligible: Age 22-74 and earn £10,000+ per year</p>
            <p style={styles.value}>• Entitled: Age 16-74 and earn £6,240+ per year</p>
            <p style={styles.value}>• Not eligible: Below thresholds</p>
          </div>
        </div>
      </div>
    </div>
  );
}