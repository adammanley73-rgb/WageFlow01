"use client"

import React, { useMemo } from "react"

type Option = { id: string; name: string }

export type EmployeePickerProps = {
  value?: string
  onSelect?: (employeeId: string) => void
  options?: Option[]
  placeholder?: string
}

/**
 * Minimal preview-safe picker.
 * Works both with and without props.
 * If no options are passed, shows a tiny mock list.
 */
export default function EmployeePicker({
  value,
  onSelect,
  options,
  placeholder = "Select employee"
}: EmployeePickerProps) {
  const items = useMemo<Option[]>(
    () =>
      options && options.length
        ? options
        : [
            { id: "emp-001", name: "Alex Carter" },
            { id: "emp-002", name: "Jamie Patel" },
            { id: "emp-003", name: "Sam O'Neill" }
          ],
    [options]
  )

  return (
    <div className="inline-flex items-center gap-2">
      <label className="text-sm text-gray-600">Employee</label>
      <select
        className="border rounded px-2 py-1 text-sm"
        aria-label="Employee"
        value={value ?? ""}
        onChange={(e) => onSelect?.(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {items.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  )
}
