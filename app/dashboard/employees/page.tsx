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
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setEmployees([
        {
          id: 'emp-001',
          employeeNumber: 'EMP001',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@company.com',
          phone: '+44 7700 900123',
          dateOfBirth: '1983-05-15',
          hireDate: '2020-01-15',
          annualSalary: 35000,
          status: 'active',
          autoEnrollmentStatus: 'eligible'
        },
        {
          id: 'emp-002',
          employeeNumber: 'EMP002',
          firstName: 'James',
          lastName: 'Wilson',
          email: 'james.wilson@company.com',
          phone: '+44 7700 900124',
          dateOfBirth: '1990-08-22',
          hireDate: '2021-03-10',
          annualSalary: 28000,
          status: 'active',
          autoEnrollmentStatus: 'eligible'
        },
        {
          id: 'emp-003',
          employeeNumber: 'EMP003',
          firstName: 'Emma',
          lastName: 'Brown',
          email: 'emma.brown@company.com',
          phone: '+44 7700 900125',
          dateOfBirth: '1985-12-03',
          hireDate: '2019-09-01',
          annualSalary: 45000,
          status: 'active',
          autoEnrollmentStatus: 'eligible'
        },
        {
          id: 'emp-004',
          employeeNumber: 'EMP004',
          firstName: 'Michael',
          lastName: 'Davis',
          email: 'michael.davis@company.com',
          phone: '+44 7700 900126',
          dateOfBirth: '1992-04-18',
          hireDate: '2022-02-01',
          annualSalary: 32000,
          status: 'active',
          autoEnrollmentStatus: 'eligible'
        },
        {
          id: 'emp-005',
          employeeNumber: 'EMP005',
          firstName: 'Lisa',
          lastName: 'Taylor',
          email: 'lisa.taylor@company.com',
          phone: '+44 7700 900127',
          dateOfBirth: '1988-09-12',
          hireDate: '2020-09-14',
          annualSalary: 38000,
          status: 'active',
          autoEnrollmentStatus: 'eligible'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredEmployees = employees.filter(emp =>
    emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        padding: '40px 20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center' as const,
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h1 style={{ color: '#1f2937', margin: '0' }}>Loading Employee Management...</h1>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        
        {/* Navigation Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px 40px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: '0'
            }}>
              👥 Employee Management
            </h1>
          </div>
          <nav style={{
            display: 'flex',
            gap: '24px'
          }}>
            <a href="/dashboard" style={{
              color: '#4b5563',
              textDecoration: 'none',
              fontWeight: '500',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              Dashboard
            </a>
            <a href="/dashboard/employees" style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: '600',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe'
            }}>
              Employees
            </a>
            <a href="/dashboard/payroll" style={{
              color: '#4b5563',
              textDecoration: 'none',
              fontWeight: '500',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              Payroll
            </a>
          </nav>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>👥</div>
              <div>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: '0'
                }}>
                  Total Employees
                </h3>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: '0'
                }}>
                  {employees.length}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>✅</div>
              <div>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: '0'
                }}>
                  Active Employees
                </h3>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#059669',
                  margin: '0'
                }}>
                  {employees.filter(emp => emp.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>🎯</div>
              <div>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: '0'
                }}>
                  Auto-Enrolled
                </h3>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#7c3aed',
                  margin: '0'
                }}>
                  {employees.filter(emp => emp.autoEnrollmentStatus === 'eligible').length}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>💷</div>
              <div>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: '0'
                }}>
                  Total Payroll
                </h3>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#dc2626',
                  margin: '0'
                }}>
                  {formatCurrency(employees.reduce((sum, emp) => sum + emp.annualSalary, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add Employee */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ flex: '1', marginRight: '20px' }}>
              <input
                type="text"
                placeholder="Search employees by name, number, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              />
            </div>
            <a
              href="/dashboard/employees/new"
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'inline-block'
              }}
            >
              + Add Employee
            </a>
          </div>
        </div>

        {/* Employee Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse' as const
            }}>
              <thead style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <tr>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left' as const,
                    fontWeight: '600',
                    color: '#374151'
                  }}>Employee</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left' as const,
                    fontWeight: '600',
                    color: '#374151'
                  }}>Contact</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left' as const,
                    fontWeight: '600',
                    color: '#374151'
                  }}>Details</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left' as const,
                    fontWeight: '600',
                    color: '#374151'
                  }}>Salary</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left' as const,
                    fontWeight: '600',
                    color: '#374151'
                  }}>Status</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left' as const,
                    fontWeight: '600',
                    color: '#374151'
                  }}>Auto-Enrollment</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left' as const,
                    fontWeight: '600',
                    color: '#374151'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee, index) => (
                  <tr key={employee.id} style={{
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
                  }}>
                    <td style={{ padding: '16px' }}>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '4px'
                        }}>
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {employee.employeeNumber}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px' }}>
                        <div style={{ marginBottom: '2px' }}>
                          <a href={`mailto:${employee.email}`} style={{
                            color: '#2563eb',
                            textDecoration: 'none'
                          }}>
                            {employee.email}
                          </a>
                        </div>
                        <div style={{
                          color: '#6b7280',
                          fontSize: '12px'
                        }}>
                          {employee.phone}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px' }}>
                        <div style={{ marginBottom: '2px' }}>
                          Age: {calculateAge(employee.dateOfBirth)}
                        </div>
                        <div style={{
                          color: '#6b7280',
                          fontSize: '12px'
                        }}>
                          Hired: {formatDate(employee.hireDate)}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#059669'
                      }}>
                        {formatCurrency(employee.annualSalary)}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        per year
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: employee.status === 'active' ? '#dcfce7' : '#fef2f2',
                        color: employee.status === 'active' ? '#166534' : '#dc2626',
                        border: `1px solid ${employee.status === 'active' ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        {employee.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#f0f9ff',
                        color: '#0369a1',
                        border: '1px solid #bae6fd'
                      }}>
                        {employee.autoEnrollmentStatus === 'eligible' ? 'Auto-Enrolled' : 
                         employee.autoEnrollmentStatus === 'entitled' ? 'Entitled' : 'Non-Eligible'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a
                          href={`/dashboard/employees/${employee.id}`}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          View
                        </a>
                        <a
                          href={`/dashboard/employees/${employee.id}/edit`}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Edit
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredEmployees.length === 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center' as const
          }}>
            <h3 style={{
              color: '#6b7280',
              margin: '0 0 16px 0'
            }}>No employees found</h3>
            <p style={{
              color: '#9ca3af',
              margin: '0 0 24px 0'
            }}>
              {searchTerm ? 'Try adjusting your search criteria' : 'Add your first employee to get started'}
            </p>
            <a
              href="/dashboard/employees/new"
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Add First Employee
            </a>
          </div>
        )}

      </div>
    </div>
  );
}