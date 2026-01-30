/* C:\Users\adamm\Projects\wageflow01\app\lib\data\employees.ts */

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
  employmentType: "full_time" | "part_time" | "contract" | "temporary" | "apprentice";
  autoEnrollmentStatus: "eligible" | "entitled" | "non_eligible";
  payScheduleId?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
  };
}

export interface PaySchedule {
  id: string;
  name: string;
  frequency: "weekly" | "bi_weekly" | "fortnightly" | "four_weekly" | "monthly";
  payDayOfWeek?: number;
  payDayOfMonth?: number;
  description?: string;
  isActive: boolean;
}

export const PAY_SCHEDULES: PaySchedule[] = [
  {
    id: "demo-monthly-25th",
    name: "Monthly - 25th",
    frequency: "monthly",
    payDayOfMonth: 25,
    description: "Demo schedule paid monthly on the 25th",
    isActive: true,
  },
  {
    id: "demo-weekly-friday",
    name: "Weekly - Friday",
    frequency: "weekly",
    payDayOfWeek: 5,
    description: "Demo schedule paid weekly on Friday",
    isActive: true,
  },
  {
    id: "demo-fortnightly-friday",
    name: "Fortnightly - Friday",
    frequency: "fortnightly",
    payDayOfWeek: 5,
    description: "Demo schedule paid every other Friday",
    isActive: true,
  },
];

export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: "EMP001",
    employeeNumber: "EMP001",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@company.co.uk",
    phone: "07700 900123",
    dateOfBirth: "1990-03-15",
    nationalInsurance: "AB123456C",
    annualSalary: 35000,
    hireDate: "2023-01-15",
    status: "active",
    employmentType: "full_time",
    autoEnrollmentStatus: "eligible",
    payScheduleId: "demo-monthly-25th",
    address: {
      line1: "123 Main Street",
      city: "London",
      postcode: "SW1A 1AA",
    },
  },
  {
    id: "EMP002",
    employeeNumber: "EMP002",
    firstName: "James",
    lastName: "Wilson",
    email: "james.wilson@company.co.uk",
    phone: "07700 900124",
    dateOfBirth: "1988-07-22",
    nationalInsurance: "CD234567D",
    annualSalary: 28000,
    hireDate: "2023-02-01",
    status: "active",
    employmentType: "full_time",
    autoEnrollmentStatus: "eligible",
    payScheduleId: "demo-weekly-friday",
    address: {
      line1: "456 Oak Road",
      city: "Manchester",
      postcode: "M1 2AB",
    },
  },
  {
    id: "EMP003",
    employeeNumber: "EMP003",
    firstName: "Emma",
    lastName: "Brown",
    email: "emma.brown@company.co.uk",
    phone: "07700 900125",
    dateOfBirth: "1992-11-08",
    nationalInsurance: "EF345678E",
    annualSalary: 22000,
    hireDate: "2023-03-10",
    status: "active",
    employmentType: "part_time",
    autoEnrollmentStatus: "entitled",
    payScheduleId: "demo-weekly-friday",
    address: {
      line1: "789 Pine Avenue",
      city: "Birmingham",
      postcode: "B1 3CD",
    },
  },
  {
    id: "EMP004",
    employeeNumber: "EMP004",
    firstName: "Michael",
    lastName: "Davis",
    email: "michael.davis@company.co.uk",
    phone: "07700 900126",
    dateOfBirth: "1985-05-20",
    nationalInsurance: "GH456789F",
    annualSalary: 42000,
    hireDate: "2022-11-01",
    status: "active",
    employmentType: "full_time",
    autoEnrollmentStatus: "eligible",
    payScheduleId: "demo-monthly-25th",
    address: {
      line1: "321 Elm Street",
      city: "Leeds",
      postcode: "LS1 4EF",
    },
  },
  {
    id: "EMP005",
    employeeNumber: "EMP005",
    firstName: "Lisa",
    lastName: "Taylor",
    email: "lisa.taylor@company.co.uk",
    phone: "07700 900127",
    dateOfBirth: "1991-09-12",
    nationalInsurance: "IJ567890G",
    annualSalary: 38000,
    hireDate: "2023-01-20",
    status: "active",
    employmentType: "full_time",
    autoEnrollmentStatus: "eligible",
    payScheduleId: "demo-fortnightly-friday",
    address: {
      line1: "654 Birch Close",
      city: "Bristol",
      postcode: "BS1 5GH",
    },
  },
];

export const getEmployeeById = (id: string): Employee | undefined =>
  DEMO_EMPLOYEES.find((emp) => emp.id === id);

export const getEmployeesByPaySchedule = (scheduleId: string): Employee[] =>
  DEMO_EMPLOYEES.filter((emp) => emp.payScheduleId === scheduleId);

export const getPayScheduleById = (id: string): PaySchedule | undefined =>
  PAY_SCHEDULES.find((schedule) => schedule.id === id);

export const getPayScheduleName = (scheduleId: string): string => {
  const schedule = getPayScheduleById(scheduleId);
  return schedule ? schedule.name : "No Schedule Assigned";
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
