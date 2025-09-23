"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ensureStoreReady,
  fireRefresh,
} from "@/lib/storeVersion";

/**
 * Minimal Employee shape for pickers.
 * Keep it in sync with what Absence pages need.
 */
export type Employee = {
  id: string;
  firstName?: string;
  lastName?: string;
  niNumber?: string;
  payGroup?: string;
};

type Props = {
  value?: string; // employee id
  onChange: (employeeId: string) => void;
  required?: boolean;
  allowClear?: boolean;
  className?: string;
  placeholder?: string;
};

/**
 * Reads employees from our single localStorage namespace.
 * Falls back gracefully if schema drifts.
 */
function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem("wfStore");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.employees) ? parsed.employees : [];
    // normalize ids and names
    return list
      .filter((e: any) => e && typeof e.id === "string")
      .map((e: any) => ({
        id: String(e.id),
        firstName: e.firstName ?? "",
        lastName: e.lastName ?? "",
        niNumber: typeof e.niNumber === "string" ? e.niNumber.toUpperCase() : e.niNumber,
        payGroup: e.payGroup ?? "",
      })) as Employee[];
  } catch {
    return [];
  }
}

function formatName(e: Employee) {
  const name = `${e.firstName || ""} ${e.lastName || ""}`.trim() || "(no name)";
  const ni = e.niNumber ? ` • ${e.niNumber}` : "";
  const pg = e.payGroup ? ` • ${e.payGroup}` : "";
  return `${name}${ni}${pg}`;
}

export default function EmployeePicker({
  value,
  onChange,
  required,
  allowClear,
  className,
  placeholder = "Select employee",
}: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    ensureStoreReady();
    setEmployees(loadEmployees());
    setHydrated(true);

    // live refresh if other tabs mutate the store
    const handler = () => setEmployees(loadEmployees());
    window.addEventListener("wageflow:store-refresh", handler);
    return () => window.removeEventListener("wageflow:store-refresh", handler);
  }, []);

  // crude search across name, NI and pay group
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return employees;
    return employees.filter((e) => {
      const blob = `${e.firstName || ""} ${e.lastName || ""} ${e.niNumber || ""} ${e.payGroup || ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [q, employees]);

  function clear() {
    onChange("");
  }

  function refresh() {
    setEmployees(loadEmployees());
    fireRefresh();
  }

  if (!hydrated) {
    return (
      <div className={className}>
        <label className="text-sm font-medium block mb-1">Employee</label>
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="text-sm font-medium block mb-1">Employee</label>

      {/* Search input */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, NI, pay group"
          className="border rounded-md px-3 py-2 w-full"
          aria-label="Search employees"
        />
        <button type="button" onClick={refresh} className="px-3 py-2 border rounded-md">
          Refresh
        </button>
        {allowClear && (
          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 border rounded-md"
            disabled={!value}
            aria-label="Clear employee selection"
          >
            Clear
          </button>
        )}
      </div>

      {/* Select */}
      <select
        className="border rounded-md px-3 py-2 w-full"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required || false}
        aria-label="Select employee"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {filtered.length === 0 ? (
          <option value="" disabled>
            No employees found
          </option>
        ) : (
          filtered.map((e) => (
            <option key={e.id} value={e.id}>
              {formatName(e)}
            </option>
          ))
        )}
      </select>

      {/* Tiny helper text */}
      <div className="text-xs text-gray-500 mt-1">
        {employees.length} employees. Showing {filtered.length}.
      </div>
    </div>
  );
}
