'use client';

import { useState, useEffect } from 'react';

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  hireDate: string;
  annualSalary: number;
  status: 'active' | 'inactive';
  autoEnrollmentStatus: 'eligible' | 'entitled' | 'non_eligible';
  jobTitle?: string;
  department?: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Load employees from real API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        console.log('🔄 Loading employees from API...');
        setLoading(true);

        const response = await fetch('/api/employees');
        console.log('📡 API Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('📊 Received employee data:', data);

          const employeeData = Array.isArray(data) ? data : [];

          // Transform to match your existing format
          const transformedEmployees: Employee[] = employeeData.map((emp: any) => ({
            id: emp.id,
            employeeNumber: emp.employeeNumber,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            phone: emp.phone || '',
            dateOfBirth: emp.dateOfBirth,
            hireDate: emp.hireDate,
            annualSalary: emp.annualSalary,
            status: emp.status,
            autoEnrollmentStatus: calculateAutoEnrollment(emp.dateOfBirth, emp.annualSalary),
            jobTitle: emp.jobTitle,
            department: emp.department,
          }));

          console.log('✅ Transformed employees:', transformedEmployees);
          setEmployees(transformedEmployees);
        } else {
          console.error('❌ Failed to fetch employees:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading employees:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  // ✅ Helper function to calculate auto-enrollment (with correct return type)
  const calculateAutoEnrollment = (
    dateOfBirth: string,
    annualSalary: number
  ): 'eligible' | 'entitled' | 'non_eligible' => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    const actualAge =
      monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;

    // UK Auto-enrollment thresholds 2024/25
    if (actualAge >= 22 && actualAge < 75 && annualSalary >= 10000) {
      return 'eligible'; // Auto-enrolled
    } else if (actualAge >= 16 && actualAge < 75 && annualSalary >= 6240) {
      return 'entitled'; // Opt-in available
    } else {
      return 'non_eligible'; // Not eligible
    }
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      `${employee.firstName} ${employee.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: 'active' | 'inactive') => {
    const base: React.CSSProperties = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      textTransform: 'capitalize',
      border: '1px solid transparent',
      display: 'inline-block',
    };
    const variants: Record<'active' | 'inactive', React.CSSProperties> = {
      active: { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #22c55e' },
      inactive: { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #ef4444' },
    };

    return <span style={{ ...base, ...variants[status] }}>{status}</span>;
  };

  const getAutoEnrollmentBadge = (status: 'eligible' | 'entitled' | 'non_eligible') => {
    const base: React.CSSProperties = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      display: 'inline-block',
    };
    const styles: Record<typeof status, React.CSSProperties> = {
      eligible: { backgroundColor: '#dcfce7', color: '#166534' },
      entitled: { backgroundColor: '#fef3c7', color: '#92400e' },
      non_eligible: { backgroundColor: '#f3f4f6', color: '#374151' },
    };

    const labels: Record<typeof status, string> = {
      eligible: 'Eligible',
      entitled: 'Entitled',
      non_eligible: 'Not Eligible',
    };

    return <span style={{ ...base, ...styles[status] }}>{labels[status]}</span>;
  };

  const styles = {
    container: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
      minHeight: '100vh',
      padding: '40px 20px',
    } as React.CSSProperties,
    maxWidth: { maxWidth: '1200px', margin: '0 auto' } as React.CSSProperties,
    headerCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '20px 40px',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    } as React.CSSProperties,
    title: { fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 } as React.CSSProperties,
    nav: { display: 'flex', gap: '24px' } as React.CSSProperties,
    navLink: {
      color: '#000000',
      textDecoration: 'none',
      fontWeight: 'bold',
      padding: '8px 16px',
      borderRadius: '6px',
      backgroundColor: '#10b981',
      border: '1px solid #059669',
    } as React.CSSProperties,
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    } as React.CSSProperties,
    cardHeader: {
      padding: '32px 40px 24px 40px',
      borderBottom: '1px solid #e5e7eb',
    } as React.CSSProperties,
    h2: { fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' } as React.CSSProperties,
    sub: { color: '#6b7280', margin: 0 } as React.CSSProperties,
    searchRow: {
      padding: '24px 40px',
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #e5e7eb',
    } as React.CSSProperties,
    searchInput: {
      flex: 1,
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      maxWidth: '400px',
    } as React.CSSProperties,
    actionRow: { display: 'flex', gap: '12px' } as React.CSSProperties,
    refreshBtn: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      border: '1px solid #d1d5db',
      cursor: 'pointer',
    } as React.CSSProperties,
    addBtn: {
      backgroundColor: '#10b981',
      color: '#000000',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    loading: { padding: '60px 40px', textAlign: 'center' } as React.CSSProperties,
    loadingMain: { fontSize: '18px', color: '#6b7280', marginBottom: '8px' } as React.CSSProperties,
    loadingSub: { fontSize: '14px', color: '#9ca3af' } as React.CSSProperties,
    content: { padding: '24px 40px' } as React.CSSProperties,
    empty: {
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px dashed #d1d5db',
    } as React.CSSProperties,
    emptyIcon: { fontSize: '48px', marginBottom: '16px' } as React.CSSProperties,
    emptyH3: { fontSize: '18px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' } as React.CSSProperties,
    emptyP: { color: '#6b7280', margin: '0 0 20px 0' } as React.CSSProperties,
    emptyAddBtn: {
      backgroundColor: '#10b981',
      color: '#000000',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    tableWrap: { overflowX: 'auto' } as React.CSSProperties,
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
    } as React.CSSProperties,
    th: {
      backgroundColor: '#f9fafb',
      padding: '12px 16px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: 600,
      color: '#374151',
      borderBottom: '1px solid #e5e7eb',
      whiteSpace: 'nowrap',
    } as React.CSSProperties,
    tr: { borderBottom: '1px solid #f3f4f6' } as React.CSSProperties,
    td: { padding: '16px', verticalAlign: 'top' } as React.CSSProperties,
    name: { fontWeight: 600, color: '#111827', marginBottom: '2px' } as React.CSSProperties,
    meta: { fontSize: '12px', color: '#6b7280' } as React.CSSProperties,
    phone: { fontSize: '12px', color: '#6b7280', marginTop: '2px' } as React.CSSProperties,
    salary: { fontWeight: 600, color: '#111827' } as React.CSSProperties,
    actionLinks: { display: 'flex', gap: '8px' } as React.CSSProperties,
    viewLink: {
      color: '#3b82f6',
      textDecoration: 'none',
      fontSize: '12px',
      fontWeight: 500,
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: '#eff6ff',
      border: '1px solid #dbeafe',
    } as React.CSSProperties,
    editLink: {
      color: '#059669',
      textDecoration: 'none',
      fontSize: '12px',
      fontWeight: 500,
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: '#ecfdf5',
      border: '1px solid #d1fae5',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Navigation Header */}
        <div style={styles.headerCard}>
          <div>
            <h1 style={styles.title}>
              💼 <span style={{ color: '#3b82f6' }}>WageFlow</span> Employee Management
            </h1>
          </div>
          <nav style={styles.nav}>
            <a href="/dashboard" style={styles.navLink}>
              Dashboard
            </a>
            <a href="/dashboard/payroll" style={styles.navLink}>
              Payroll
            </a>
          </nav>
        </div>

        {/* Main Content Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>Employee Management ({employees.length})</h2>
            <p style={styles.sub}>Manage your workforce and track auto-enrollment status</p>
          </div>

          {/* Search and Actions */}
          <div style={styles.searchRow}>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <div style={styles.actionRow}>
              <button onClick={() => window.location.reload()} style={styles.refreshBtn}>
                🔄 Refresh
              </button>
              <a href="/dashboard/employees/new" style={styles.addBtn}>
                👤 Add New Employee
              </a>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={styles.loading}>
              <div style={styles.loadingMain}>🔄 Loading employees...</div>
              <div style={styles.loadingSub}>Fetching employee data from API</div>
            </div>
          )}

          {/* Employee Table */}
          {!loading && (
            <div style={styles.content}>
              {filteredEmployees.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>👥</div>
                  <h3 style={styles.emptyH3}>
                    {searchTerm ? 'No employees found' : 'No employees yet'}
                  </h3>
                  <p style={styles.emptyP}>
                    {searchTerm
                      ? `No employees match "${searchTerm}". Try a different search term.`
                      : 'Get started by adding your first employee to the system.'}
                  </p>
                  {!searchTerm && (
                    <a href="/dashboard/employees/new" style={styles.emptyAddBtn}>
                      👤 Add First Employee
                    </a>
                  )}
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Employee</th>
                        <th style={styles.th}>Contact</th>
                        <th style={styles.th}>Salary</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Auto-Enrollment</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div>
                              <div style={styles.name}>
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div style={styles.meta}>
                                {employee.employeeNumber}
                                {employee.jobTitle && ` • ${employee.jobTitle}`}
                                {employee.department && ` • ${employee.department}`}
                              </div>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontSize: '14px', color: '#374151' }}>{employee.email}</div>
                            {employee.phone && <div style={styles.phone}>{employee.phone}</div>}
                          </td>
                          <td style={styles.td}>
                            <div style={styles.salary}>{formatCurrency(employee.annualSalary)}</div>
                            <div style={styles.meta}>annual</div>
                          </td>
                          <td style={styles.td}>{getStatusBadge(employee.status)}</td>
                          <td style={styles.td}>
                            {getAutoEnrollmentBadge(employee.autoEnrollmentStatus)}
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actionLinks}>
                              <a href={`/dashboard/employees/${employee.id}`} style={styles.viewLink}>
                                👁️ View
                              </a>
                              <a
                                href={`/dashboard/employees/${employee.id}/edit`}
                                style={styles.editLink}
                              >
                                ✏️ Edit
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
