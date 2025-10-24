// lib/data/employees.types.ts
// Pure types. No imports. Safe everywhere.

export type EmployeeRow = {
  id: string;
  employee_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  ni_number?: string | null;
  job_title?: string | null;
  hourly_rate?: number | null;
  annual_salary?: number | null;
  pay_frequency?: string | null;
  created_at?: string | null;
};

export type EmployeeListItem = {
  id: string;
  name: string;
  email: string | null;
  ni_number: string | null;
  job_title: string | null;
  hourly_rate: number | null;
  annual_salary: number | null;
};

export type EmployeePickerOption = {
  value: string;
  label: string;
  subtitle?: string;
};
