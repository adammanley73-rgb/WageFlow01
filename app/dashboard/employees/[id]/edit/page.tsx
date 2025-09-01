'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, User, MapPin, Briefcase, Calculator } from 'lucide-react';

// UK Date formatting helper - DD-MM-YYYY
const formatDateUK = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// UK Currency formatting helper - £ GBP
const formatCurrencyUK = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Basic Employee interface
interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  nationalInsurance?: string;
  hireDate: string;
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

// Basic employeeService mock
const employeeService = {
  async getEmployee(id: string): Promise<Employee> {
    // Mock service - replace with actual API call
    throw new Error('Service not available');
  },
  
  async updateEmployee(id: string, data: any): Promise<Employee> {
    // Mock service - replace with actual API call
    console.log('Updating employee:', id, data);
    return {} as Employee;
  }
};

// Basic UI Components
const Button = ({ 
  children, 
  onClick, 
  disabled, 
  type = 'button', 
  variant = 'default',
  className = '',
  ...props 
}: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded ${
      variant === 'outline' 
        ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50' 
        : 'bg-blue-600 text-white hover:bg-blue-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Input = ({ 
  label, 
  error, 
  required, 
  className = '', 
  ...props 
}: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
    {error && (
      <p className="text-sm text-red-600 mt-1">{error}</p>
    )}
  </div>
);

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white shadow rounded-lg ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: any) => (
  <div className="px-6 py-4 border-b border-gray-200">
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }: any) => (
  <h3 className={`text-lg font-medium text-gray-900 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }: any) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

const editEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(50),
  lastName: z.string().min(1, 'Last name required').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth required'),
  nationalInsurance: z.string().optional(),
  hireDate: z.string().min(1, 'Hire date required'),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'apprentice']),
  annualSalary: z.number().min(0, 'Salary must be positive').max(1000000),
  addressLine1: z.string().min(1, 'Address required'),
  addressLine2: z.string().optional(),
  addressCity: z.string().min(1, 'City required'),
  addressCounty: z.string().optional(),
  addressPostcode: z.string().min(1, 'Postcode required'),
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
  { value: 'apprentice', label: 'Apprentice' },
];

export default function EmployeeEditPage({ params }: EmployeeEditPageProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoEnrollmentStatus, setAutoEnrollmentStatus] = useState('Not calculated');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
  });

  const dateOfBirth = watch('dateOfBirth');
  const annualSalary = watch('annualSalary');

  useEffect(() => {
    loadEmployee();
  }, [params.id]);

  // Auto-enrollment calculation with UK thresholds 2025-2026
  useEffect(() => {
    if (dateOfBirth && annualSalary) {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      
      // UK Auto-enrollment thresholds 2025-2026 Tax Year
      if (age >= 22 && age < 75 && annualSalary >= 10000) {
        setAutoEnrollmentStatus(`✅ Eligible (Auto-enrolled) - ${formatCurrencyUK(annualSalary)}`);
      } else if (age >= 16 && age < 75 && annualSalary >= 6240) {
        setAutoEnrollmentStatus(`⚪ Entitled (Opt-in available) - ${formatCurrencyUK(annualSalary)}`);
      } else {
        setAutoEnrollmentStatus(`❌ Not Eligible - ${formatCurrencyUK(annualSalary)}`);
      }
    }
  }, [dateOfBirth, annualSalary]);

  const loadEmployee = async () => {
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
        addressPostcode: employeeData.address.postcode,
      });
      
    } catch (error) {
      // Demo data fallback with UK formatting
      const demoEmployee: Employee = {
        id: params.id,
        employeeNumber: 'EMP001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@company.com',
        phone: '+44 7700 900001',
        dateOfBirth: '1985-03-15',
        nationalInsurance: 'AB123456C',
        hireDate: '2023-01-15',
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
      
      setEmployee(demoEmployee);
      reset({
        firstName: demoEmployee.firstName,
        lastName: demoEmployee.lastName,
        email: demoEmployee.email,
        phone: demoEmployee.phone,
        dateOfBirth: demoEmployee.dateOfBirth,
        nationalInsurance: demoEmployee.nationalInsurance,
        hireDate: demoEmployee.hireDate,
        employmentType: demoEmployee.employmentType,
        annualSalary: demoEmployee.annualSalary,
        addressLine1: demoEmployee.address.line1,
        addressLine2: demoEmployee.address.line2,
        addressCity: demoEmployee.address.city,
        addressCounty: demoEmployee.address.county,
        addressPostcode: demoEmployee.address.postcode,
      });
      
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: EditEmployeeFormData) => {
    try {
      setSaving(true);
      
      const updateData = {
        ...data,
        address: {
          line1: data.addressLine1,
          line2: data.addressLine2 || '',
          city: data.addressCity,
          county: data.addressCounty || '',
          postcode: data.addressPostcode,
          country: 'United Kingdom'
        }
      };
      
      await employeeService.updateEmployee(params.id, updateData);
      router.push(`/dashboard/employees/${params.id}`);
      
    } catch (error) {
      console.error('Failed to update employee:', error);
      alert('Failed to update employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/employees/${params.id}`);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1024px', margin: '0 auto' }}>
        <div style={{ animation: 'pulse 2s infinite', gap: '24px' }}>
          <div style={{ height: '32px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '33%', marginBottom: '16px' }}></div>
          <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '25%', marginBottom: '8px' }}></div>
          <div style={{ height: '40px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ padding: '24px', maxWidth: '1024px', margin: '0 auto', textAlign: 'center', paddingTop: '48px', paddingBottom: '48px' }}>
        <User size={64} style={{ color: '#9ca3af', margin: '0 auto 16px auto' }} />
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Employee Not Found</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          The employee you're trying to edit doesn't exist or couldn't be loaded.
        </p>
        <Button onClick={() => router.push('/dashboard/employees')}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1024px', margin: '0 auto' }}>
      {/* Header with DD-MM-YYYY formatting */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            style={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={16} style={{ marginRight: '8px' }} />
            <span>Back to Profile</span>
          </Button>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
              Edit Employee: {employee.firstName} {employee.lastName}
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '4px' }}>
              Update employee information and view auto-enrollment impact
            </p>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              Last updated: {formatDateUK(new Date().toISOString())} | 
              Current salary: {formatCurrencyUK(employee.annualSalary)}
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Enrollment Status - 2025-2026 Tax Year */}
      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center' }}>
            <Calculator size={20} style={{ marginRight: '8px' }} />
            <span>UK Auto-Enrollment Status (2025-2026 Tax Year)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{autoEnrollmentStatus}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <p style={{ marginBottom: '4px' }}>• <strong>Eligible:</strong> Age 22-74 and earn £10,000+ per year (2025-2026)</p>
            <p style={{ marginBottom: '4px' }}>• <strong>Entitled:</strong> Age 16-74 and earn £6,240-£9,999 per year (2025-2026)</p>
            <p>• <strong>Not Eligible:</strong> Under 16, over 75, or earn less than £6,240</p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Personal Information */}
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center' }}>
              <User size={20} style={{ marginRight: '8px' }} />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <Input
              label="First Name"
              {...register('firstName')}
              error={errors.firstName?.message}
              required
            />
            <Input
              label="Last Name"
              {...register('lastName')}
              error={errors.lastName?.message}
              required
            />
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              required
            />
            <Input
              label="Phone (UK Format)"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="+44 7700 900000"
            />
            <Input
              label="Date of Birth (DD-MM-YYYY)"
              type="date"
              {...register('dateOfBirth')}
              error={errors.dateOfBirth?.message}
              required
            />
            <Input
              label="National Insurance Number"
              {...register('nationalInsurance')}
              error={errors.nationalInsurance?.message}
              placeholder="AB123456C"
            />
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center' }}>
              <Briefcase size={20} style={{ marginRight: '8px' }} />
              <span>Employment Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <Input
              label="Hire Date (DD-MM-YYYY)"
              type="date"
              {...register('hireDate')}
              error={errors.hireDate?.message}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('employmentType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {employmentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.employmentType && (
                <p className="text-sm text-red-600 mt-1">{errors.employmentType.message}</p>
              )}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <Input
                label="Annual Salary (£)"
                type="number"
                {...register('annualSalary', { valueAsNumber: true })}
                error={errors.annualSalary?.message}
                required
                placeholder="35000"
              />
              {annualSalary && (
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  Annual salary: {formatCurrencyUK(annualSalary)} | 
                  Monthly: {formatCurrencyUK(annualSalary / 12)} | 
                  Weekly: {formatCurrencyUK(annualSalary / 52)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* UK Address Information */}
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center' }}>
              <MapPin size={20} style={{ marginRight: '8px' }} />
              <span>UK Address Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ marginBottom: '16px' }}>
              <Input
                label="Address Line 1"
                {...register('addressLine1')}
                error={errors.addressLine1?.message}
                required
                placeholder="123 High Street"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Input
                label="Address Line 2"
                {...register('addressLine2')}
                error={errors.addressLine2?.message}
                placeholder="Flat 2A"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <Input
                label="City/Town"
                {...register('addressCity')}
                error={errors.addressCity?.message}
                required
                placeholder="London"
              />
              <Input
                label="County"
                {...register('addressCounty')}
                error={errors.addressCounty?.message}
                placeholder="Greater London"
              />
              <Input
                label="Postcode"
                {...register('addressPostcode')}
                error={errors.addressPostcode?.message}
                required
                placeholder="SW1A 1AA"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || !isDirty || saving}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Save size={16} style={{ marginRight: '8px' }} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}