'use client';

import React from 'react';

type Employee = {
  id: string;
  name: string;
};

type Props = {
  value?: string | null;
  onChange?: (employeeId: string | null) => void;
  employees?: Employee[];
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
  className?: string;
};

const defaultEmployees: Employee[] = [
  { id: 'stub-1', name: 'Alice Example' },
  { id: 'stub-2', name: 'Bob Example' },
];

export default function EmployeePicker({
  value = null,
  onChange,
  employees = defaultEmployees,
  placeholder = 'Select employee',
  disabled = false,
  name = 'employee_id',
  id = 'employee_id',
  required = false,
  className = 'w-full rounded-md border px-3 py-2',
}: Props) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value || null;
    onChange?.(v);
  }

  return (
    <select
      id={id}
      name={name}
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      className={className}
    >
      <option value="">{placeholder}</option>
      {employees.map(emp => (
        <option key={emp.id} value={emp.id}>
          {emp.name}
        </option>
      ))}
    </select>
  );
}
