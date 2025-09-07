export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'apprentice';
export type EmploymentStatus = 'active' | 'inactive' | 'terminated';

export interface PaySchedule {
  id: string;
  name: string;
  frequency: 'weekly' | 'bi_weekly' | 'monthly';
  payDayOfWeek?: number;
  payDayOfMonth?: number;
  description?: string;
  isActive: boolean;
}

export const PAY_SCHEDULES: PaySchedule[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Monthly Salary',
    frequency: 'monthly',
    payDayOfMonth: 25,
    description: 'Salaried staff paid monthly on 25th',
    isActive: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Weekly Operations',
    frequency: 'weekly',
    payDayOfWeek: 5,
    description: 'Operations staff paid weekly on Friday',
    isActive: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Bi-Weekly Mixed',
    frequency: 'bi_weekly',
    payDayOfWeek: 5,
    description: 'Mixed departments paid every other Friday',
    isActive: true,
  },
];

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
  status: EmploymentStatus;
  employmentType: EmploymentType;
  autoEnrollmentStatus: 'eligible' | 'entitled' | 'non_eligible';
  payScheduleId?: string;
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
    annualSalary: 35_000,
    hireDate: '2020-01-15',
    status: 'active',
    employmentType: 'full_time',
    autoEnrollmentStatus: 'eligible',
    payScheduleId: '11111111-1111-1111-1111-111111111111',
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
    annualSalary: 28_000,
    hireDate: '2021-03-10',
    status: 'active',
    employmentType: 'full_time',
    autoEnrollmentStatus: 'entitled',
    payScheduleId: '22222222-2222-2222-2222-222222222222',
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
    dateOfBirth: '1992-11-08',
    nationalInsurance: 'EF345678E',
    annualSalary: 22_000,
    hireDate: '2023-03-10',
    status: 'active',
    employmentType: 'part_time',
    autoEnrollmentStatus: 'entitled',
    payScheduleId: '22222222-2222-2222-2222-222222222222',
    address: {
      line1: '789 Pine Avenue',
      city: 'Birmingham',
      postcode: 'B1 3CD',
    },
  },
  {
    id: 'EMP004',
    employeeNumber: 'EMP004',
    firstName: 'Michael',
    lastName: 'Davis',
    email: 'michael.davis@company.co.uk',
    phone: '+44 7700 900126',
    dateOfBirth: '1985-05-20',
    nationalInsurance: 'GH456789F',
    annualSalary: 42_000,
    hireDate: '2022-11-01',
    status: 'active',
    employmentType: 'full_time',
    autoEnrollmentStatus: 'eligible',
    payScheduleId: '11111111-1111-1111-1111-111111111111',
    address: {
      line1: '321 Elm Street',
      city: 'Leeds',
      postcode: 'LS1 4EF',
    },
  },
  {
    id: 'EMP005',
    employeeNumber: 'EMP005',
    firstName: 'Lisa',
    lastName: 'Taylor',
    email: 'lisa.taylor@company.co.uk',
    phone: '+44 7700 900127',
    dateOfBirth: '1991-09-12',
    nationalInsurance: 'IJ567890G',
    annualSalary: 38_000,
    hireDate: '2023-01-20',
    status: 'active',
    employmentType: 'full_time',
    autoEnrollmentStatus: 'eligible',
    payScheduleId: '33333333-3333-3333-3333-333333333333',
    address: {
      line1: '654 Birch Close',
      city: 'Bristol',
      postcode: 'BS1 5GH',
    },
  },
];

export const getEmployeeById = (id: string): Employee | undefined =>
  DEMO_EMPLOYEES.find((emp) => emp.id === id);

export const getAllEmployees = (): Employee[] => [...DEMO_EMPLOYEES];

export const getEmployeesByPaySchedule = (scheduleId?: string): Employee[] => {
  // return all active employees if scheduleId is undefined or empty
  const activeEmps = DEMO_EMPLOYEES.filter((emp) => emp.status === 'active');
  if (!scheduleId || scheduleId === '') return activeEmps;
  return activeEmps.filter((emp) => emp.payScheduleId === scheduleId);
};

export const getPayScheduleById = (id: string): PaySchedule | undefined => {
  return PAY_SCHEDULES.find((schedule) => schedule.id === id);
};

export const getPayScheduleName = (scheduleId?: string): string => {
  if (!scheduleId) return 'No Schedule Assigned';
  const schedule = getPayScheduleById(scheduleId);
  return schedule ? schedule.name : 'No Schedule Assigned';
};

export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};
