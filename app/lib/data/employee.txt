export interface Employee {
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
  employmentType: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'apprentice';
  autoEnrollmentStatus: 'eligible' | 'entitled' | 'non_eligible';
  address?: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
  };
}

export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    employeeNumber: 'EMP001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@company.co.uk',
    phone: '+44 7700 900123',
    dateOfBirth: '1985-03-15',
    nationalInsurance: 'AB123456C',
    annualSalary: 35000,
    hireDate: '2020-01-15',
    status: 'active',
    employmentType: 'full_time',
    autoEnrollmentStatus: 'eligible',
    address: {
      line1: '123 Main Street',
      line2: 'Apt 4B',
      city: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA',
    },
  },
  {
    id: 'EMP002',
    employeeNumber: 'EMP002',
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@company.co.uk',
    phone: '+44 7700 900124',
    dateOfBirth: '1990-07-22',
    nationalInsurance: 'CD789012E',
    annualSalary: 28000,
    hireDate: '2021-03-10',
    status: 'active',
    employmentType: 'full_time',
    autoEnrollmentStatus: 'entitled',
    address: {
      line1: '456 Oak Road',
      city: 'Manchester',
      postcode: 'M1 1AB',
    },
  },
  {
    id: 'EMP003',
    employeeNumber: 'EMP003',
    firstName: 'Emma',
    lastName: 'Brown',
    email: 'emma.brown@company.co.uk',
    phone: '+44 7700 900125',
    dateOfBirth: '1995-11-08',
    nationalInsurance: 'EF345678G',
    annualSalary: 22000,
    hireDate: '2022-06-20',
    status: 'active',
    employmentType: 'part_time',
    autoEnrollmentStatus: 'non_eligible',
    address: {
      line1: '789 Park Lane',
      city: 'Birmingham',
      county: 'West Midlands',
      postcode: 'B1 2CD',
    },
  },
];

export const getEmployeeById = (id: string): Employee | null =>
  DEMO_EMPLOYEES.find((emp) => emp.id === id) ?? null;
