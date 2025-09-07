'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'apprentice';

type PaySchedule = {
  id: string;
  name: string;
  description?: string;
  frequency: 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly';
  payDayOfMonth?: number;
  payDayOfWeek?: number; // 1 = Monday ... 7 = Sunday
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
  address: Address;
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
    padding: '24px',
  },
  wrap: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '32px',
  },
  backLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '16px',
    opacity: 0.9,
  },
  h1: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    margin: '16px 0 8px 0',
  },
  pDesc: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '16px',
    margin: 0,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.2), 0 10px 25px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  },
  errorList: {
    color: '#dc2626',
    margin: 0,
    paddingLeft: '20px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#ffffff',
  },
  inputMuted: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#f9fafb',
  },
  payInfo: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
  },
  payInfoTitle: {
    fontSize: '14px',
    color: '#0369a1',
    fontWeight: 500,
  },
  payInfoSub: {
    fontSize: '13px',
    color: '#0284c7',
    marginTop: '4px',
  },
  addressGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
  },
  addressRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    borderTop: '2px solid #e5e7eb',
    paddingTop: '24px',
  },
  cancel: {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    transition: 'all 0.2s',
    border: '2px solid #e5e7eb',
  },
  submit: (loading: boolean) => ({
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
  },
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paySchedules, setPaySchedules] = useState<PaySchedule[]>([]);
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
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
    },
  });
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setPaySchedules(PAY_SCHEDULES);
    generateEmployeeNumber();
  }, []);

  const generateEmployeeNumber = async () => {
    const nextNumber = `EMP${String(Date.now()).slice(-3).padStart(3, '0')}`;
    setFormData((prev) => ({ ...prev, employeeNumber: nextNumber }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const employeeData = {
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
        address: {
          line1: formData.address.line1.trim() || null,
          line2: formData.address.line2.trim() || null,
          city: formData.address.city.trim() || null,
          county: formData.address.county.trim() || null,
          postcode: formData.address.postcode.trim() || null,
        },
      };

      console.log('📤 Submitting employee data:', employeeData);

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error:', error);
        throw new Error(error.error || 'Failed to create employee');
      }

      const result = await response.json();
      console.log('✅ Employee created successfully:', result);

      alert(
        `✅ Employee created successfully!\n\nEmployee: ${employeeData.firstName} ${employeeData.lastName}\nEmployee Number: ${employeeData.employeeNumber}`
      );
      router.push('/dashboard/employees');
    } catch (error) {
      console.error('❌ Failed to create employee:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to create employee. Please try again.']);
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
      payDay = days[schedule.payDayOfWeek - 1];
    }
    return `${frequency} - ${payDay}`;
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.header}>
          <Link href="/dashboard/employees" style={styles.backLink}>
            ← Back to Employees
          </Link>
          <h1 style={styles.h1}>👥 Add New Employee</h1>
          <p style={styles.pDesc}>Enter employee details and assign pay schedule</p>
        </div>

        <div style={styles.card}>
          {errors.length > 0 && (
            <div style={styles.errorBox}>
              <h3 style={styles.errorTitle}>Please fix the following errors:</h3>
              <ul style={styles.errorList}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>📋 Basic Information</h2>
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Employee Number *</label>
                  <input
                    type="text"
                    value={formData.employeeNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, employeeNumber: e.target.value }))
                    }
                    style={styles.inputMuted}
                    readOnly
                  />
                </div>
                <div>
                  <label style={styles.label}>First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    style={styles.input}
                    placeholder="07700 900123"
                  />
                </div>
                <div>
                  <label style={styles.label}>Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                    }
                    style={styles.input}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>💼 Employment Details</h2>
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>National Insurance Number</label>
                  <input
                    type="text"
                    value={formData.nationalInsurance}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nationalInsurance: e.target.value }))
                    }
                    style={styles.input}
                    placeholder="AB123456C"
                  />
                </div>
                <div>
                  <label style={styles.label}>Annual Salary (£) *</label>
                  <input
                    type="number"
                    value={formData.annualSalary}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, annualSalary: e.target.value }))
                    }
                    style={styles.input}
                    min={0}
                    step={100}
                    placeholder="35000"
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Hire Date *</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hireDate: e.target.value }))}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        employmentType: e.target.value as EmploymentType,
                      }))
                    }
                    style={styles.input as any}
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))}
                    style={styles.input}
                    placeholder="Software Developer"
                  />
                </div>
                <div>
                  <label style={styles.label}>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, department: e.target.value }))
                    }
                    style={styles.input}
                    placeholder="Engineering"
                  />
                </div>
              </div>
            </div>

            {/* Pay Schedule */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>💰 Pay Schedule Assignment</h2>
              <div>
                <label style={styles.label}>Pay Schedule *</label>
                <select
                  value={formData.payScheduleId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payScheduleId: e.target.value }))}
                  style={styles.input as any}
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
                  <div style={styles.payInfo}>
                    <div style={styles.payInfoTitle}>📅 {getPayScheduleInfo(formData.payScheduleId)}</div>
                    <div style={styles.payInfoSub}>
                      {paySchedules.find((s) => s.id === formData.payScheduleId)?.description}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🏠 Address</h2>
              <div style={styles.addressGrid}>
                <div>
                  <label style={styles.label}>Address Line 1</label>
                  <input
                    type="text"
                    value={formData.address.line1}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: { ...prev.address, line1: e.target.value },
                      }))
                    }
                    style={styles.input}
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label style={styles.label}>Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address.line2}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: { ...prev.address, line2: e.target.value },
                      }))
                    }
                    style={styles.input}
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>
                <div style={styles.addressRow}>
                  <div>
                    <label style={styles.label}>City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: { ...prev.address, city: e.target.value },
                        }))
                      }
                      style={styles.input}
                      placeholder="London"
                    />
                  </div>
                  <div>
                    <label style={styles.label}>County</label>
                    <input
                      type="text"
                      value={formData.address.county}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: { ...prev.address, county: e.target.value },
                        }))
                      }
                      style={styles.input}
                      placeholder="Greater London"
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Postcode</label>
                    <input
                      type="text"
                      value={formData.address.postcode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: { ...prev.address, postcode: e.target.value.toUpperCase() },
                        }))
                      }
                      style={styles.input}
                      placeholder="SW1A 1AA"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <Link href="/dashboard/employees" style={styles.cancel}>
                Cancel
              </Link>
              <button type="submit" disabled={loading} style={styles.submit(loading)}>
                {loading ? (
                  <>
                    <div style={styles.spinner} />
                    Creating Employee...
                  </>
                ) : (
                  <>✅ Create Employee</>
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
