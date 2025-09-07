'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  nationalInsurance?: string;
  annualSalary: number;
  hireDate: string;
  status: string;
  employmentType: string;
  payScheduleId: string;
  jobTitle?: string;
  department?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    county?: string;
    postcode?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export default function EmployeeDetailsPage() {
  const params = useParams();
  const employeeId = (params as { id?: string })?.id as string;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load employee from real API
  useEffect(() => {
    const loadEmployee = async () => {
      try {
        console.log('🔍 Loading employee with ID:', employeeId);
        setLoading(true);

        const response = await fetch('/api/employees');
        console.log('📡 API Response status:', response.status);

        if (response.ok) {
          const allEmployees = await response.json();
          console.log('📊 All employees from API:', allEmployees);

          const foundEmployee = allEmployees.find((emp: any) => emp.id === employeeId);
          console.log('🎯 Found specific employee:', foundEmployee);

          setEmployee(foundEmployee || null);
        } else {
          console.error('❌ Failed to fetch employees:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading employee:', error);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  // Helper functions
  const formatCurrency = (amount: number) => `£${amount?.toFixed(2) || '0.00'}`;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;
  };

  const calculateAutoEnrollmentStatus = (dateOfBirth: string, annualSalary: number) => {
    const age = calculateAge(dateOfBirth);

    if (age >= 22 && age < 75 && annualSalary >= 10000) {
      return { status: 'Eligible for Auto-Enrollment', color: '#166534', bg: '#dcfce7', border: '#22c55e' };
    } else if (age >= 16 && age < 75 && annualSalary >= 6240) {
      return { status: 'Entitled to Opt-In', color: '#92400e', bg: '#fef3c7', border: '#fbbf24' };
    } else {
      return { status: 'Not Eligible', color: '#374151', bg: '#f3f4f6', border: '#d1d5db' };
    }
  };

  const getPayScheduleDisplay = (payScheduleId: string) => {
    const schedules: { [key: string]: string } = {
      'monthly-25th': 'Monthly on 25th',
      'monthly-last': 'Monthly Last Working Day',
      'weekly-fri': 'Weekly on Friday',
    };
    return schedules[payScheduleId] || payScheduleId;
  };

  const styles = {
    container: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
      minHeight: '100vh',
      padding: '40px 20px',
    },
    maxWidth: {
      maxWidth: '1000px',
      margin: '0 auto',
    },
    headerCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px 32px',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0',
    },
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      margin: '4px 0 0 0',
    },
    nav: {
      display: 'flex',
      gap: '16px',
    },
    navLink: {
      color: '#000000',
      textDecoration: 'none',
      fontWeight: 'bold',
      padding: '8px 16px',
      borderRadius: '6px',
      backgroundColor: '#10b981',
      border: '1px solid #059669',
      fontSize: '14px',
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      padding: '32px',
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0 0 20px 0',
      borderBottom: '2px solid #e5e7eb',
      paddingBottom: '8px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    gridItem: {
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
    },
    label: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#6b7280',
      textTransform: 'uppercase' as const,
      marginBottom: '4px',
      display: 'block',
    },
    value: {
      fontSize: '16px',
      color: '#1f2937',
      fontWeight: '500',
      margin: '0',
    },
    badge: {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      border: '1px solid',
    } as React.CSSProperties,
    loading: {
      textAlign: 'center' as const,
      padding: '80px 20px',
      fontSize: '18px',
      color: '#6b7280',
    },
    notFound: {
      textAlign: 'center' as const,
      padding: '80px 20px',
    },
    notFoundTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0 0 12px 0',
    },
    notFoundText: {
      fontSize: '16px',
      color: '#6b7280',
      margin: '0 0 24px 0',
    },
    actionButtons: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'flex-end',
      marginTop: '24px',
    },
    editButton: {
      padding: '12px 24px',
      backgroundColor: '#10b981',
      color: '#000000',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    },
    secondaryButton: {
      padding: '12px 24px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      border: '1px solid #d1d5db',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card}>
            <div style={styles.loading}>
              🔄 Loading employee details...
              <div style={{ marginTop: 8, fontSize: 14, color: '#9ca3af' }}>Employee ID: {employeeId}</div>
            </div>
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
            <div style={styles.notFound}>
              <h1 style={styles.notFoundTitle}>👤 Employee Not Found</h1>
              <p style={styles.notFoundText}>
                The employee with ID "{employeeId}" could not be found in the system.
              </p>
              <a href="/dashboard/employees" style={styles.navLink}>
                ← Back to Employee List
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const autoEnrollment = calculateAutoEnrollmentStatus(employee.dateOfBirth, employee.annualSalary);
  const statusBadgeColors =
    (employee.status || '').toLowerCase() === 'active'
      ? { bg: '#dcfce7', color: '#166534', border: '#22c55e' }
      : { bg: '#fef2f2', color: '#dc2626', border: '#ef4444' };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.headerCard}>
          <div>
            <h1 style={styles.title}>
              💼 <span style={{ color: '#3b82f6' }}>WageFlow</span> Employee Details
            </h1>
            <p style={styles.subtitle}>
              {employee.firstName} {employee.lastName} • {employee.employeeNumber}
            </p>
          </div>
          <nav style={styles.nav}>
            <a href="/dashboard" style={styles.navLink}>
              Dashboard
            </a>
            <a href="/dashboard/employees" style={styles.navLink}>
              ← Employees
            </a>
          </nav>
        </div>

        {/* Basic Information */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📋 Basic Information</h2>
          <div style={styles.grid}>
            <div style={styles.gridItem}>
              <label style={styles.label}>Full Name</label>
              <p style={styles.value}>
                {employee.firstName} {employee.lastName}
              </p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Employee Number</label>
              <p style={styles.value}>{employee.employeeNumber}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Email Address</label>
              <p style={styles.value}>{employee.email}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Phone Number</label>
              <p style={styles.value}>{employee.phone || 'Not provided'}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Date of Birth</label>
              <p style={styles.value}>
                {formatDate(employee.dateOfBirth)} (Age: {calculateAge(employee.dateOfBirth)})
              </p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>National Insurance</label>
              <p style={styles.value}>{employee.nationalInsurance || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>💼 Employment Information</h2>
          <div style={styles.grid}>
            <div style={styles.gridItem}>
              <label style={styles.label}>Job Title</label>
              <p style={styles.value}>{employee.jobTitle || 'Not specified'}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Department</label>
              <p style={styles.value}>{employee.department || 'Not specified'}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Employment Type</label>
              <p style={styles.value}>
                {employee.employmentType?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) ||
                  'Full Time'}
              </p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Hire Date</label>
              <p style={styles.value}>{formatDate(employee.hireDate)}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Status</label>
              <span
                style={{
                  ...styles.badge,
                  backgroundColor: statusBadgeColors.bg,
                  color: statusBadgeColors.color,
                  borderColor: statusBadgeColors.border,
                }}
              >
                {employee.status?.toUpperCase() || 'ACTIVE'}
              </span>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Pay Schedule</label>
              <p style={styles.value}>{getPayScheduleDisplay(employee.payScheduleId)}</p>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>💰 Financial Information</h2>
          <div style={styles.grid}>
            <div style={styles.gridItem}>
              <label style={styles.label}>Annual Salary</label>
              <p style={styles.value}>{formatCurrency(employee.annualSalary)}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Monthly Gross</label>
              <p style={styles.value}>{formatCurrency(employee.annualSalary / 12)}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Auto-Enrollment Status</label>
              <span
                style={{
                  ...styles.badge,
                  backgroundColor: autoEnrollment.bg,
                  color: autoEnrollment.color,
                  borderColor: autoEnrollment.border,
                }}
              >
                {autoEnrollment.status}
              </span>
            </div>
          </div>
        </div>

        {/* Address Information */}
        {employee.address && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>🏠 Address Information</h2>
            <div style={styles.grid}>
              <div style={styles.gridItem}>
                <label style={styles.label}>Address Line 1</label>
                <p style={styles.value}>{employee.address.line1 || 'Not provided'}</p>
              </div>
              <div style={styles.gridItem}>
                <label style={styles.label}>Address Line 2</label>
                <p style={styles.value}>{employee.address.line2 || 'Not provided'}</p>
              </div>
              <div style={styles.gridItem}>
                <label style={styles.label}>City</label>
                <p style={styles.value}>{employee.address.city || 'Not provided'}</p>
              </div>
              <div style={styles.gridItem}>
                <label style={styles.label}>County</label>
                <p style={styles.value}>{employee.address.county || 'Not provided'}</p>
              </div>
              <div style={styles.gridItem}>
                <label style={styles.label}>Postcode</label>
                <p style={styles.value}>{employee.address.postcode || 'Not provided'}</p>
              </div>
            </div>
          </div>
        )}

        {/* System Information */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>ℹ️ System Information</h2>
          <div style={styles.grid}>
            <div style={styles.gridItem}>
              <label style={styles.label}>Employee ID</label>
              <p style={styles.value}>{employee.id}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Created</label>
              <p style={styles.value}>{formatDate(employee.createdAt)}</p>
            </div>
            <div style={styles.gridItem}>
              <label style={styles.label}>Last Updated</label>
              <p style={styles.value}>{formatDate(employee.updatedAt)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <a href={`/dashboard/employees/${employee.id}/payroll`} style={styles.secondaryButton}>
              📊 View Payroll History
            </a>
            <a href={`/dashboard/employees/${employee.id}/edit`} style={styles.editButton}>
              ✏️ Edit Employee
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
