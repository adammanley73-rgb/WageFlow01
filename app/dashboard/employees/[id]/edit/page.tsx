'use client';

import React, { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, User, MapPin, Briefcase, Calculator } from 'lucide-react';

// UK date formatting helper – dd-mm-yyyy (display only)
const formatDateUK = (isoOrDateString: string): string => {
const d = new Date(isoOrDateString);
if (isNaN(d.getTime())) return '';
const day = String(d.getDate()).padStart(2, '0');
const month = String(d.getMonth() + 1).padStart(2, '0');
const year = d.getFullYear();
return `${day}-${month}-${year}`;
};

// If you ever accept dd-mm-yyyy text, convert to ISO yyyy-mm-dd
const parseDDMMYYYYtoISO = (s: string): string => {
const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
if (!m) return s; // assume already ISO
const [_, dd, mm, yyyy] = m;
return `${yyyy}-${mm}-${dd}`;
};

// UK currency helper – £ with 0 decimals
const formatCurrencyUK = (amount: number): string => {
if (typeof amount !== 'number' || isNaN(amount)) return '£0';
return new Intl.NumberFormat('en-GB', {
style: 'currency',
currency: 'GBP',
minimumFractionDigits: 0,
maximumFractionDigits: 0
}).format(amount);
};

const styles: Record<string, CSSProperties> = {
container: {
fontFamily: 'system-ui, -apple-system, sans-serif',
backgroundColor: '#f8fafc',
minHeight: '100vh',
padding: '20px'
},
maxWidth: {
maxWidth: '1200px',
margin: '0 auto'
},
card: {
backgroundColor: '#ffffff',
padding: '24px',
borderRadius: '12px',
boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
marginBottom: '24px',
border: '1px solid #e5e7eb'
},
header: {
display: 'flex',
alignItems: 'center',
justifyContent: 'space-between',
marginBottom: '24px'
},
title: {
fontSize: '28px',
fontWeight: 700,
color: '#1f2937',
margin: '0 0 8px 0'
},
subtitle: {
color: '#64748b',
margin: 0
},
grid: {
display: 'grid',
gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
gap: '20px'
},
button: {
backgroundColor: '#2563eb',
color: '#ffffff',
border: 'none',
padding: '12px 24px',
borderRadius: '8px',
fontSize: '14px',
fontWeight: 600,
cursor: 'pointer',
display: 'flex',
alignItems: 'center',
gap: '8px'
},
buttonOutline: {
backgroundColor: 'transparent',
color: '#374151',
border: '1px solid #d1d5db',
padding: '12px 24px',
borderRadius: '8px',
fontSize: '14px',
fontWeight: 600,
cursor: 'pointer',
display: 'flex',
alignItems: 'center',
gap: '8px'
},
input: {
width: '100%',
padding: '12px',
border: '1px solid #d1d5db',
borderRadius: '8px',
fontSize: '14px',
fontFamily: 'inherit'
},
label: {
display: 'block',
fontSize: '14px',
fontWeight: 500,
color: '#374151',
marginBottom: '8px'
},
error: {
color: '#dc2626',
fontSize: '12px',
marginTop: '4px'
},
helperMuted: {
fontSize: '12px',
color: '#6b7280',
marginTop: '4px'
}
};

interface Employee {
id: string;
employeeNumber: string;
firstName: string;
lastName: string;
email: string;
phone?: string;
dateOfBirth: string; // ISO yyyy-mm-dd for input type="date"
nationalInsurance?: string;
hireDate: string; // ISO yyyy-mm-dd
employmentType: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'apprentice';
annualSalary: number;
status: 'active' | 'inactive';
autoEnrollmentStatus: string;
address: {
line1: string;
line2?: string;
city: string;
county?: string;
postcode: string;
country: string;
};
}

const employeeService = {
async getEmployee(_id: string): Promise<Employee> {
// Throw to demonstrate demo fallback. Replace with real fetch when ready.
throw new Error('Service not available');
},
async updateEmployee(_id: string, data: any): Promise<Employee> {
// Replace with real API call
console.log('Updating employee:', _id, data);
return data as Employee;
}
};

const editEmployeeSchema = z.object({
firstName: z.string().min(1, 'First name required').max(50),
lastName: z.string().min(1, 'Last name required').max(50),
email: z.string().email('Invalid email address'),
phone: z.string().optional(),
dateOfBirth: z.string().min(1, 'Date of birth required'),
nationalInsurance: z.string().optional(),
hireDate: z.string().min(1, 'Hire date required'),
employmentType: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'apprentice']),
annualSalary: z.number().min(0, 'Salary must be positive').max(1_000_000, 'Salary must be less than 1,000,000'),
addressLine1: z.string().min(1, 'Address required'),
addressLine2: z.string().optional(),
addressCity: z.string().min(1, 'City required'),
addressCounty: z.string().optional(),
addressPostcode: z.string().min(1, 'Postcode required')
});

type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>;

interface EmployeeEditPageProps {
params: { id: string };
}

const employmentTypes = [
{ value: 'full_time', label: 'Full Time' },
{ value: 'part_time', label: 'Part Time' },
{ value: 'contract', label: 'Contract' },
{ value: 'temporary', label: 'Temporary' },
{ value: 'apprentice', label: 'Apprentice' }
];

export default function EmployeeEditPage({ params }: EmployeeEditPageProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoEnrollmentStatus, setAutoEnrollmentStatus] = useState('Not calculated');

  // Add the missing onSubmit function
  const onSubmit = async (data: EditEmployeeFormData) => {
    setSaving(true);
    try {
      const updatedEmployee = await employeeService.updateEmployee(params.id, {
        ...employee,
        ...data,
        address: {
          line1: data.addressLine1,
          line2: data.addressLine2,
          city: data.addressCity,
          county: data.addressCounty,
          postcode: data.addressPostcode,
          country: employee?.address.country || 'United Kingdom'
        }
      });
      setEmployee(updatedEmployee);
      router.push(`/dashboard/employees/${params.id}`);
    } catch (error) {
      // Optionally handle error
      alert('Failed to save employee changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card}>
            <h2 style={{ ...styles.title, color: '#6b7280' }}>Loading employee details…</h2>
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
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <User size={64} style={{ color: '#6b7280', margin: '0 auto 16px' }} />
              <h1 style={{ ...styles.title, marginBottom: '16px' }}>Employee not found</h1>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                The employee could not be loaded.
              </p>
              <button
                style={styles.buttonOutline}
                onClick={() => router.push('/dashboard/employees')}
              >
                <ArrowLeft size={16} />
                Back to Employees
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

const {
register,
handleSubmit,
watch,
reset,
formState: { errors, isValid, isDirty }
} = useForm<EditEmployeeFormData>({
resolver: zodResolver(editEmployeeSchema),
mode: 'onChange',
defaultValues: {
firstName: '',
lastName: '',
email: '',
phone: '',
dateOfBirth: '',
nationalInsurance: '',
hireDate: '',
employmentType: 'full_time',
annualSalary: 0,
addressLine1: '',
addressLine2: '',
addressCity: '',
addressCounty: '',
addressPostcode: ''
}
});

const dateOfBirth = watch('dateOfBirth');
const annualSalary = watch('annualSalary');

useEffect(() => {
const load = async () => {
try {
setLoading(true);
const employeeData = await employeeService.getEmployee(params.id);
setEmployee(employeeData);
reset({
firstName: employeeData.firstName,
lastName: employeeData.lastName,
email: employeeData.email,
phone: employeeData.phone || '',
dateOfBirth: employeeData.dateOfBirth,
nationalInsurance: employeeData.nationalInsurance || '',
hireDate: employeeData.hireDate,
employmentType: employeeData.employmentType,
annualSalary: employeeData.annualSalary,
addressLine1: employeeData.address.line1,
addressLine2: employeeData.address.line2 || '',
addressCity: employeeData.address.city,
addressCounty: employeeData.address.county || '',
addressPostcode: employeeData.address.postcode
});
} catch {
const demo: Employee = {
id: params.id,
employeeNumber: 'EMP001',
firstName: 'Sarah',
lastName: 'Johnson',
email: 'sarah.johnson@company.com',
phone: '+44 7700 900001',
dateOfBirth: '1985-03-15', // ISO for input
nationalInsurance: 'AB123456C',
hireDate: '2023-01-15', // ISO for input
employmentType: 'full_time',
annualSalary: 35000,
status: 'active',
autoEnrollmentStatus: 'eligible',
address: {
line1: '123 High Street',
line2: '',
city: 'London',
county: 'Greater London',
postcode: 'SW1A 1AA',
country: 'United Kingdom'
}
};
setEmployee(demo);
reset({
firstName: demo.firstName,
lastName: demo.lastName,
email: demo.email,
phone: demo.phone,
dateOfBirth: demo.dateOfBirth,
nationalInsurance: demo.nationalInsurance,
hireDate: demo.hireDate,
employmentType: demo.employmentType,
annualSalary: demo.annualSalary,
addressLine1: demo.address.line1,
addressLine2: demo.address.line2,
addressCity: demo.address.city,
addressCounty: demo.address.county,
addressPostcode: demo.address.postcode
});
} finally {
setLoading(false);
}
};
load();
}, [params.id, reset]);

// Auto-enrolment for UK 2025-2026
useEffect(() => {
if (!dateOfBirth || annualSalary == null) return;
const today = new Date();
const dob = new Date(dateOfBirth);
if (isNaN(dob.getTime())) return;

let age = today.getFullYear() - dob.getFullYear();
const m = today.getMonth() - dob.getMonth();
if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

// Thresholds (2025-2026): Eligible >= £10,000 and age 22-74. Entitled 16-74 and £6,240-£9,999.
if (age >= 22 && age < 75 && annualSalary >= 10000) {
  setAutoEnrollmentStatus(`Eligible (Auto-enrolled) – ${formatCurrencyUK(annualSalary)}`);
} else if (age >= 16 && age < 75 && annualSalary >= 6240) {
  setAutoEnrollmentStatus(`Entitled (Opt-in) – ${formatCurrencyUK(annualSalary)}`);
} else {
  setAutoEnrollmentStatus(`Not eligible – ${formatCurrencyUK(annualSalary)}`);
}
}, [dateOfBirth, annualSalary]);

const handleCancel = () => {
  router.push(`/dashboard/employees/${params.id}`);
};

if (loading) {
return (
<div style={styles.container}>
<div style={styles.maxWidth}>
<div style={styles.card}>
<h2 style={{ ...styles.title, color: '#6b7280' }}>Loading employee details…</h2>
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
<div style={{ textAlign: 'center', padding: '40px' }}>
<User size={64} style={{ color: '#6b7280', margin: '0 auto 16px' }} />
<h1 style={{ ...styles.title, marginBottom: '16px' }}>Employee not found</h1>
<p style={{ color: '#6b7280', marginBottom: '24px' }}>
The employee could not be loaded.
</p>
<button
style={styles.buttonOutline}
onClick={() => router.push('/dashboard/employees')}
>
<ArrowLeft size={16} />
Back to Employees
</button>
</div>
</div>
</div>
</div>
);
}

return (
<div style={styles.container}>
<div style={styles.maxWidth}>
<div style={styles.card}>
<div style={styles.header}>
<div>
<h1 style={styles.title}>
Edit employee: {employee.firstName} {employee.lastName}
</h1>
<p style={styles.subtitle}>
Update details and view auto-enrolment impact | Tax year 2025-2026
</p>
<p style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }}>
Last updated: {formatDateUK(new Date().toISOString())} ·
Current salary: {formatCurrencyUK(employee.annualSalary)}
</p>
</div>
<button style={styles.buttonOutline} onClick={handleCancel}>
<ArrowLeft size={16} />
Back to profile
</button>
</div>
</div>

    <div style={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Calculator size={20} style={{ color: '#2563eb' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          UK auto-enrolment status (2025-2026)
        </h2>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
        {autoEnrollmentStatus}
      </div>
      <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
        <p style={{ margin: '4px 0' }}>• Eligible: Age 22-74 and earn £10,000+ per year</p>
        <p style={{ margin: '4px 0' }}>• Entitled: Age 16-74 and earn £6,240-£9,999</p>
        <p style={{ margin: '4px 0' }}>• Not eligible: Under 16, over 75, or below £6,240</p>
      </div>
    </div>

    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <User size={20} style={{ color: '#2563eb' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Personal information
          </h2>
        </div>
        <div style={styles.grid}>
          <div>
            <label style={styles.label}>First name <span style={{ color: '#dc2626' }}>*</span></label>
            <input style={styles.input} {...register('firstName')} />
            {errors.firstName && <div style={styles.error}>{errors.firstName.message}</div>}
          </div>
          <div>
            <label style={styles.label}>Last name <span style={{ color: '#dc2626' }}>*</span></label>
            <input style={styles.input} {...register('lastName')} />
            {errors.lastName && <div style={styles.error}>{errors.lastName.message}</div>}
          </div>
          <div>
            <label style={styles.label}>Email <span style={{ color: '#dc2626' }}>*</span></label>
            <input type="email" style={styles.input} {...register('email')} />
            {errors.email && <div style={styles.error}>{errors.email.message}</div>}
          </div>
          <div>
            <label style={styles.label}>Phone</label>
            <input style={styles.input} placeholder="+44 7700 900000" {...register('phone')} />
            {errors.phone && <div style={styles.error}>{errors.phone.message}</div>}
          </div>
          <div>
            <label style={styles.label}>Date of birth (dd-mm-yyyy) <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="date"
              style={styles.input}
              // input type="date" expects ISO yyyy-mm-dd; display elsewhere uses dd-mm-yyyy
              {...register('dateOfBirth')}
            />
            {errors.dateOfBirth && <div style={styles.error}>{errors.dateOfBirth.message}</div>}
            {dateOfBirth && (
              <div style={styles.helperMuted}>Display: {formatDateUK(dateOfBirth)}</div>
            )}
          </div>
          <div>
            <label style={styles.label}>National Insurance number</label>
            <input style={styles.input} placeholder="AB123456C" {...register('nationalInsurance')} />
            {errors.nationalInsurance && <div style={styles.error}>{errors.nationalInsurance.message}</div>}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Briefcase size={20} style={{ color: '#2563eb' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Employment information
          </h2>
        </div>
        <div style={styles.grid}>
          <div>
            <label style={styles.label}>Hire date (dd-mm-yyyy) <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="date"
              style={styles.input}
              {...register('hireDate')}
            />
            {errors.hireDate && <div style={styles.error}>{errors.hireDate.message}</div>}
          </div>
          <div>
            <label style={styles.label}>Employment type <span style={{ color: '#dc2626' }}>*</span></label>
            <select style={styles.input} {...register('employmentType')}>
              {employmentTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.employmentType && <div style={styles.error}>{errors.employmentType.message}</div>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>Annual salary (£) <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="number"
              style={styles.input}
              placeholder="35000"
              {...register('annualSalary', { valueAsNumber: true })}
            />
            {errors.annualSalary && <div style={styles.error}>{errors.annualSalary.message}</div>}
            {typeof annualSalary === 'number' && !isNaN(annualSalary) && (
              <div style={styles.helperMuted}>
                Annual: {formatCurrencyUK(annualSalary)} · Monthly: {formatCurrencyUK(annualSalary / 12)} · Weekly: {formatCurrencyUK(annualSalary / 52)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <MapPin size={20} style={{ color: '#2563eb' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            UK address information
          </h2>
        </div>
        <div style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={styles.label}>Address line 1 <span style={{ color: '#dc2626' }}>*</span></label>
            <input style={styles.input} placeholder="123 High Street" {...register('addressLine1')} />
            {errors.addressLine1 && <div style={styles.error}>{errors.addressLine1.message}</div>}
          </div>
          <div>
            <label style={styles.label}>Address line 2</label>
            <input style={styles.input} placeholder="Flat 2A" {...register('addressLine2')} />
          </div>
          <div style={styles.grid}>
            <div>
              <label style={styles.label}>City/Town <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={styles.input} placeholder="London" {...register('addressCity')} />
              {errors.addressCity && <div style={styles.error}>{errors.addressCity.message}</div>}
            </div>
            <div>
              <label style={styles.label}>County</label>
              <input style={styles.input} placeholder="Greater London" {...register('addressCounty')} />
            </div>
            <div>
              <label style={styles.label}>Postcode <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={styles.input} placeholder="SW1A 1AA" {...register('addressPostcode')} />
              {errors.addressPostcode && <div style={styles.error}>{errors.addressPostcode.message}</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" style={styles.buttonOutline} onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: !isValid || !isDirty || saving ? 0.5 : 1,
              cursor: !isValid || !isDirty || saving ? 'not-allowed' : 'pointer'
            }}
            disabled={!isValid || !isDirty || saving}
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  </div>
</div>


);
}