'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'apprentice';

type PaySchedule = {
  id: string;
  name: string;
  description?: string;
  frequency: 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly';
  payDayOfMonth?: number;
  payDayOfWeek?: number;
};

const PAY_SCHEDULES: PaySchedule[] = [
  {
    id: 'monthly-25th',
    name: 'Monthly — 25th',
    description: 'Pays on the 25th of each month',
    frequency: 'monthly',
    payDayOfMonth: 25,
  },
  {
    id: 'monthly-last',
    name: 'Monthly — Last Working Day',
    description: 'Pays on the last working day of the month',
    frequency: 'monthly',
  },
  {
    id: 'weekly-fri',
    name: 'Weekly — Friday',
    description: 'Pays every Friday',
    frequency: 'weekly',
    payDayOfWeek: 5,
  },
];

type Address = {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
};

type FormState = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationalInsurance: string;
  annualSalary: string;
  hireDate: string;
  employmentType: EmploymentType;
  payScheduleId: string;
  jobTitle: string;
  department: string;
  status: string;
  address: Address;
};

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
    padding: '24px',
  } as const,
  max: { maxWidth: '800px', margin: '0 auto' } as const,
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 25px 70px rgba(0,0,0,0.2), 0 10px 25px rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.2)',
    textAlign: 'center' as const,
  },
  loadingTitle: { fontSize: '18px', color: '#6b7280', marginBottom: '8px' } as const,
  loadingSub: { fontSize: '14px', color: '#9ca3af' } as const,
  notFoundTitle: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' } as const,
  notFoundText: { color: '#6b7280', margin: '0 0 16px 0' } as const,
  backLinkLight: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '16px',
    opacity: 0.9,
  } as const,
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.2), 0 10px 25px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  } as const,
  headerH1: { fontSize: '32px', fontWeight: 'bold', color: 'white', margin: '16px 0 8px 0' } as const,
  headerP: { color: 'rgba(255,255,255,0.9)', fontSize: '16px', margin: 0 } as const,
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px',
  } as const,
  gridAuto: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  } as const,
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
  } as const,
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '6px',
  } as const,
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    borderTop: '2px solid #e5e7eb',
    paddingTop: '24px',
  } as const,
  cancelBtn: {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    transition: 'all 0.2s',
    border: '2px solid #e5e7eb',
  } as const,
  saveBtn: (loading: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    backgroundColor: loading ? '#9ca3af' : '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } as const,
};

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = (params as { id?: string })?.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingEmployee, setLoadingEmployee] = useState(true);
  const [paySchedules, setPaySchedules] = useState<PaySchedule[]>([]);
  const [originalEmployee, setOriginalEmployee] = useState<any>(null);
  const [formData, setFormData] = useState<FormState>({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationalInsurance: '',
    annualSalary: '',
    hireDate: '',
    employmentType: 'full_time',
    payScheduleId: '',
    jobTitle: '',
    department: '',
    status: 'active',
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
    },
  });
  const [errors, setErrors] = useState<string[]>([]);

  // ✅ Load employee data from API
  useEffect(() => {
    const loadEmployee = async () => {
      try {
        console.log('🔍 Loading employee for edit, ID:', employeeId);
        setLoadingEmployee(true);

        const response = await fetch('/api/employees');
        if (response.ok) {
          const allEmployees = await response.json();
          const employee = allEmployees.find((emp: any) => emp.id === employeeId);

          if (employee) {
            console.log('✅ Found employee for editing:', employee);
            setOriginalEmployee(employee);

            // Populate form with existing data
            setFormData({
              employeeNumber: employee.employeeNumber || '',
              firstName: employee.firstName || '',
              lastName: employee.lastName || '',
              email: employee.email || '',
              phone: employee.phone || '',
              dateOfBirth: employee.dateOfBirth || '',
              nationalInsurance: employee.nationalInsurance || '',
              annualSalary: employee.annualSalary?.toString() || '',
              hireDate: employee.hireDate || '',
              employmentType: employee.employmentType || 'full_time',
              payScheduleId: employee.payScheduleId || '',
              jobTitle: employee.jobTitle || '',
              department: employee.department || '',
              status: employee.status || 'active',
              address: {
                line1: employee.address?.line1 || '',
                line2: employee.address?.line2 || '',
                city: employee.address?.city || '',
                county: employee.address?.county || '',
                postcode: employee.address?.postcode || '',
              },
            });
          } else {
            console.error('❌ Employee not found:', employeeId);
          }
        }
      } catch (error) {
        console.error('❌ Error loading employee:', error);
      } finally {
        setLoadingEmployee(false);
      }
    };

    setPaySchedules(PAY_SCHEDULES);
    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.firstName.trim()) newErrors.push('First name is required');
    if (!formData.lastName.trim()) newErrors.push('Last name is required');
    if (!formData.email.trim()) newErrors.push('Email is required');
    if (!formData.dateOfBirth) newErrors.push('Date of birth is required');
    if (!formData.annualSalary || parseFloat(formData.annualSalary) <= 0) {
      newErrors.push('Valid annual salary is required');
    }
    if (!formData.hireDate) newErrors.push('Hire date is required');
    if (!formData.payScheduleId) newErrors.push('Pay schedule is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.push('Valid email address is required');
    }

    if (formData.nationalInsurance) {
      const niRegex = /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i;
      if (!niRegex.test(formData.nationalInsurance.replace(/\s/g, ''))) {
        newErrors.push('Valid National Insurance number is required (e.g., AB123456C)');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // ✅ Update employee via API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const employeeData = {
        id: employeeId,
        employeeNumber: formData.employeeNumber,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        dateOfBirth: formData.dateOfBirth,
        nationalInsurance: formData.nationalInsurance
          ? formData.nationalInsurance.replace(/\s/g, '').toUpperCase()
          : null,
        annualSalary: parseFloat(formData.annualSalary),
        hireDate: formData.hireDate,
        employmentType: formData.employmentType,
        payScheduleId: formData.payScheduleId,
        jobTitle: formData.jobTitle.trim() || null,
        department: formData.department.trim() || null,
        status: formData.status,
        address: {
          line1: formData.address.line1.trim() || null,
          line2: formData.address.line2.trim() || null,
          city: formData.address.city.trim() || null,
          county: formData.address.county.trim() || null,
          postcode: formData.address.postcode.trim() || null,
        },
        updatedAt: new Date().toISOString(),
      };

      console.log('📤 Updating employee with data:', employeeData);

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error:', error);
        throw new Error(error.error || 'Failed to update employee');
      }

      const result = await response.json();
      console.log('✅ Employee updated successfully:', result);

      alert(
        `✅ Employee updated successfully!\n\nEmployee: ${employeeData.firstName} ${employeeData.lastName}\nEmployee Number: ${employeeData.employeeNumber}`
      );
      router.push(`/dashboard/employees/${employeeId}`);
    } catch (error) {
      console.error('❌ Failed to update employee:', error);
      setErrors([
        error instanceof Error ? error.message : 'Failed to update employee. Please try again.',
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getPayScheduleInfo = (scheduleId: string) => {
    const schedule = paySchedules.find((s) => s.id === scheduleId);
    if (!schedule) return '';

    const frequency = schedule.frequency.replace('_', '-');
    let payDay = '';
    if (schedule.payDayOfMonth) {
      const n = schedule.payDayOfMonth;
      const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
      payDay = `${n}${suffix} of month`;
    } else if (schedule.payDayOfWeek) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      payDay = days[(schedule.payDayOfWeek || 1) - 1];
    }
    return `${frequency} - ${payDay}`;
  };

  if (loadingEmployee) {
    return (
      <div style={S.page}>
        <div style={S.max}>
          <div style={S.loadingCard}>
            <div style={S.loadingTitle}>🔄 Loading employee data...</div>
            <div style={S.loadingSub}>Loading details for employee ID: {employeeId}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!originalEmployee) {
    return (
      <div style={S.page}>
        <div style={S.max}>
          <div style={S.loadingCard}>
            <h1 style={S.notFoundTitle}>Employee Not Found</h1>
            <p style={S.notFoundText}>
              The employee with ID "{employeeId}" could not be found.
            </p>
            <Link href="/dashboard/employees" style={S.backLinkLight}>
              ← Back to Employees
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.max}>
        <div style={{ marginBottom: '32px' }}>
          <Link
            href={`/dashboard/employees/${employeeId}`}
            style={S.backLinkLight}
          >
            ← Back to Employee Details
          </Link>
          <h1 style={S.headerH1}>✏️ Edit Employee</h1>
          <p style={S.headerP}>
            Update {originalEmployee.firstName} {originalEmployee.lastName}&apos;s information
          </p>
        </div>

        <div style={S.card}>
          {errors.length > 0 && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <h3
                style={{
                  color: '#dc2626',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '0 0 8px 0',
                }}
              >
                Please fix the following errors:
              </h3>
              <ul style={{ color: '#dc2626', margin: 0, paddingLeft: '20px' }}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '32px' }}>
              <h2 style={S.sectionTitle}>📋 Basic Information</h2>
              <div style={S.gridAuto}>
                <div>
                  <label style={S.label}>Employee Number *</label>
                  <input type="text" value={formData.employeeNumber} style={S.input} readOnly />
                </div>
                <div>
                  <label style={S.label}>First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                    style={S.input}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                    style={S.input}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    style={S.input}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    style={S.input}
                    placeholder="07700 900123"
                  />
                </div>
                <div>
                  <label style={S.label}>Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    style={S.input}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h2 style={S.sectionTitle}>💼 Employment Details</h2>
              <div style={S.gridAuto}>
                <div>
                  <label style={S.label}>National Insurance Number</label>
                  <input
                    type="text"
                    value={formData.nationalInsurance}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, nationalInsurance: e.target.value }))
                    }
                    style={S.input}
                    placeholder="AB123456C"
                  />
                </div>
                <div>
                  <label style={S.label}>Annual Salary (£) *</label>
                  <input
                    type="number"
                    value={formData.annualSalary}
                    onChange={(e) => setFormData((p) => ({ ...p, annualSalary: e.target.value }))}
                    style={S.input}
                    min={0}
                    step={100}
                    placeholder="35000"
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Hire Date *</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData((p) => ({ ...p, hireDate: e.target.value }))}
                    style={S.input}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Employment Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                    style={S.input as React.CSSProperties}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        employmentType: e.target.value as EmploymentType,
                      }))
                    }
                    style={S.input as React.CSSProperties}
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData((p) => ({ ...p, jobTitle: e.target.value }))}
                    style={S.input}
                    placeholder="Software Developer"
                  />
                </div>
                <div>
                  <label style={S.label}>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                    style={S.input}
                    placeholder="Engineering"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h2 style={S.sectionTitle}>💰 Pay Schedule Assignment</h2>
              <div>
                <label style={S.label}>Pay Schedule *</label>
                <select
                  value={formData.payScheduleId}
                  onChange={(e) => setFormData((p) => ({ ...p, payScheduleId: e.target.value }))}
                  style={S.input as React.CSSProperties}
                  required
                >
                  <option value="">Select pay schedule...</option>
                  {paySchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </option>
                  ))}
                </select>
                {formData.payScheduleId && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#0369a1', fontWeight: 500 }}>
                      📅 {getPayScheduleInfo(formData.payScheduleId)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#0284c7', marginTop: '4px' }}>
                      {paySchedules.find((s) => s.id === formData.payScheduleId)?.description}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h2 style={S.sectionTitle}>🏠 Address</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div>
                  <label style={S.label}>Address Line 1</label>
                  <input
                    type="text"
                    value={formData.address.line1}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, address: { ...p.address, line1: e.target.value } }))
                    }
                    style={S.input}
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label style={S.label}>Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address.line2}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, address: { ...p.address, line2: e.target.value } }))
                    }
                    style={S.input}
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                  }}
                >
                  <div>
                    <label style={S.label}>City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, address: { ...p.address, city: e.target.value } }))
                      }
                      style={S.input}
                      placeholder="London"
                    />
                  </div>
                  <div>
                    <label style={S.label}>County</label>
                    <input
                      type="text"
                      value={formData.address.county}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, address: { ...p.address, county: e.target.value } }))
                      }
                      style={S.input}
                      placeholder="Greater London"
                    />
                  </div>
                  <div>
                    <label style={S.label}>Postcode</label>
                    <input
                      type="text"
                      value={formData.address.postcode}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          address: { ...p.address, postcode: e.target.value.toUpperCase() },
                        }))
                      }
                      style={S.input}
                      placeholder="SW1A 1AA"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={S.actions}>
              <Link href={`/dashboard/employees/${employeeId}`} style={S.cancelBtn}>
                Cancel
              </Link>
              <button type="submit" disabled={loading} style={S.saveBtn(loading)}>
                {loading ? (
                  <>
                    <div style={S.spinner} />
                    Updating Employee...
                  </>
                ) : (
                  <>💾 Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

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
