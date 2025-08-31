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
  address?: {
    line1: string;
    city: string;
    postcode: string;
  };
};

export default function EmployeeDetailsPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params?.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoEnrollmentStatus, setAutoEnrollmentStatus] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      // Demo employee data - matches your employee list
      const demoEmployees: Employee[] = [
        {
          id: 'EMP001',
          employeeNumber: 'EMP001',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@company.com',
          phone: '+44 7700 900001',
          dateOfBirth: '1983-05-15',
          nationalInsurance: 'AB123456C',
          annualSalary: 35000,
          hireDate: '2020-03-15',
          status: 'Active',
          address: { line1: '123 Oak Street', city: 'Manchester', postcode: 'M1 2AB' },
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
          address: { line1: '456 Pine Road', city: 'Birmingham', postcode: 'B2 3CD' },
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
          address: { line1: '789 Elm Avenue', city: 'Leeds', postcode: 'LS1 4EF' },
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

      const foundEmployee = demoEmployees.find((emp) => emp.id === employeeId);
      setEmployee(foundEmployee || null);

      if (foundEmployee) {
        calculateAutoEnrollmentStatus(foundEmployee);
      }

      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [employeeId]);

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

  const calculateAutoEnrollmentStatus = (emp: Employee) => {
    const age = calculateAge(emp.dateOfBirth);

    if (age >= 22 && age < 75 && emp.annualSalary >= 10000) {
      setAutoEnrollmentStatus('✅ Eligible (Auto-enrolled into workplace pension)');
    } else if (age >= 16 && age < 75 && emp.annualSalary >= 6240) {
      setAutoEnrollmentStatus('⚪ Entitled (Can opt-in to workplace pension)');
    } else {
      setAutoEnrollmentStatus('❌ Not Eligible (Below age or salary thresholds)');
    }
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

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
          <h1 style={{ color: '#1f2937', margin: '0' }}>Loading Employee Details...</h1>
        </div>
      </div>
    );
  }

  if (!employee) {
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
            Employee Not Found
          </h1>
          <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
            The employee you're looking for could not be found.
          </p>
          <a
            href="/dashboard/employees"
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
            ← Back to Employees
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
          maxWidth: '800px',
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
              👤 {employee.firstName} {employee.lastName}
            </h1>
            <p style={{ color: '#6b7280', margin: '0' }}>
              Employee #{employee.employeeNumber} • {employee.status}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href="/dashboard/employees"
              style={{
                color: '#4b5563',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              }}
            >
              ← Back to Employees
            </a>
            <a
              href={`/dashboard/employees/${employee.id}/edit`}
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
              ✏️ Edit Employee
            </a>
          </div>
        </div>

        {/* Employee Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}
        >
          {/* Personal Information */}
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
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 20px 0',
                borderBottom: '2px solid #f3f4f6',
                paddingBottom: '8px',
              }}
            >
              Personal Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Email Address
                </label>
                <p style={{ color: '#1f2937', margin: '0', fontSize: '15px' }}>
                  {employee.email}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Phone Number
                </label>
                <p style={{ color: '#1f2937', margin: '0', fontSize: '15px' }}>
                  {employee.phone || 'Not provided'}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Date of Birth
                </label>
                <p style={{ color: '#1f2937', margin: '0', fontSize: '15px' }}>
                  {formatDate(employee.dateOfBirth)} (Age {calculateAge(employee.dateOfBirth)}
                  )
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  National Insurance
                </label>
                <p
                  style={{
                    color: '#1f2937',
                    margin: '0',
                    fontSize: '15px',
                    fontWeight: '600',
                  }}
                >
                  {employee.nationalInsurance || 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Employment Information */}
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
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 20px 0',
                borderBottom: '2px solid #f3f4f6',
                paddingBottom: '8px',
              }}
            >
              Employment Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Employee Number
                </label>
                <p
                  style={{
                    color: '#2563eb',
                    margin: '0',
                    fontSize: '15px',
                    fontWeight: '600',
                  }}
                >
                  {employee.employeeNumber}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Hire Date
                </label>
                <p style={{ color: '#1f2937', margin: '0', fontSize: '15px' }}>
                  {formatDate(employee.hireDate)}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Annual Salary
                </label>
                <p
                  style={{
                    color: '#059669',
                    margin: '0 0 4px 0',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                >
                  {formatCurrency(employee.annualSalary)}
                </p>
                <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>
                  Monthly: {formatCurrency(employee.annualSalary / 12)}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Employment Status
                </label>
                <span
                  style={{
                    color: '#166534',
                    backgroundColor: '#dcfce7',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {employee.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        {employee.address && (
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
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 20px 0',
                borderBottom: '2px solid #f3f4f6',
                paddingBottom: '8px',
              }}
            >
              📍 Address Information
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: '20px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Address Line 1
                </label>
                <p style={{ color: '#1f2937', margin: '0', fontSize: '15px' }}>
                  {employee.address.line1}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  City
                </label>
                <p style={{ color: '#1f2937', margin: '0', fontSize: '15px' }}>
                  {employee.address.city}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px',
                  }}
                >
                  Postcode
                </label>
                <p
                  style={{
                    color: '#2563eb',
                    margin: '0',
                    fontSize: '15px',
                    fontWeight: '600',
                  }}
                >
                  {employee.address.postcode}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Enrollment Status */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: '0 0 16px 0',
            }}
          >
            🎯 Auto-Enrollment Status
          </h2>

          <div
            style={{
              backgroundColor: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <p
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0',
              }}
            >
              {autoEnrollmentStatus}
            </p>
          </div>

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
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                Current Age
              </label>
              <p
                style={{
                  color: '#059669',
                  margin: '0',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {calculateAge(employee.dateOfBirth)} years old
              </p>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                Annual Salary
              </label>
              <p
                style={{
                  color: '#059669',
                  margin: '0',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {formatCurrency(employee.annualSalary)}
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f0f9ff',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e0f2fe',
            }}
          >
            <p
              style={{
                color: '#0c4a6e',
                margin: '0',
                fontSize: '14px',
                lineHeight: '1.6',
              }}
            >
              <strong>UK Auto-Enrollment Requirements:</strong> Eligible workers aged
              22–74 earning £10,000+ per year are automatically enrolled into the workplace
              pension scheme. Workers aged 16–74 earning £6,240+ per year can opt in
              voluntarily.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
