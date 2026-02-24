// C:\Projects\wageflow01\app\dashboard\employees\EmployeesSearchTable.tsx
/* @ts-nocheck */
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function employeeDisplayName(emp: any) {
  const first = String(emp?.first_name ?? "").trim();
  const last = String(emp?.last_name ?? "").trim();
  const name = (first + " " + last).trim();
  return name || "Unnamed employee";
}

function employeeSearchLabel(emp: any) {
  const name = employeeDisplayName(emp);
  const no = String(emp?.employee_number ?? "").trim();
  return no ? `${name} (${no})` : name;
}

export default function EmployeesSearchTable({ employees }: { employees: any[] }) {
  const [query, setQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q) return [];

    return employees
      .filter((emp) => {
        const hay =
          norm(employeeDisplayName(emp)) +
          " " +
          norm(emp?.employee_number) +
          " " +
          norm(emp?.email) +
          " " +
          norm(emp?.ni_number);

        return hay.includes(q);
      })
      .slice(0, 20);
  }, [employees, query]);

  const filteredEmployees = useMemo(() => {
    const q = norm(query);

    if (selectedEmployeeId) {
      return employees.filter((e) => e.id === selectedEmployeeId);
    }

    if (!q) return employees;

    return employees.filter((emp) => {
      const hay =
        norm(employeeDisplayName(emp)) +
        " " +
        norm(emp?.employee_number) +
        " " +
        norm(emp?.email) +
        " " +
        norm(emp?.ni_number);

      return hay.includes(q);
    });
  }, [employees, query, selectedEmployeeId]);

  function pickEmployee(emp: any) {
    setSelectedEmployeeId(emp.id);
    setQuery(employeeSearchLabel(emp));
    setShowDropdown(false);
  }

  function clearSearch() {
    setQuery("");
    setSelectedEmployeeId("");
    setShowDropdown(false);
  }

  const clearDisabled = !query && !selectedEmployeeId;

  return (
    <div>
      <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-neutral-700">Search employee</div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:max-w-lg">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedEmployeeId("");
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="Start typing name, employee number, email, or NI"
              />

              {showDropdown && suggestions.length > 0 ? (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-neutral-300 bg-white shadow-lg max-h-56 overflow-y-auto">
                  {suggestions.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => pickEmployee(emp)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
                    >
                      <div className="font-medium">{employeeDisplayName(emp)}</div>
                      <div className="text-[11px] text-neutral-600">
                        {emp?.employee_number ? `Emp no: ${emp.employee_number}` : "No employee number set"}
                        {emp?.email ? ` · ${emp.email}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={clearSearch}
              disabled={clearDisabled}
              className={
                "inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-w-[88px] " +
                (clearDisabled
                  ? "border-neutral-300 bg-white text-neutral-500 opacity-60 cursor-not-allowed"
                  : "border-[#0f3c85] bg-[#0f3c85] text-white hover:bg-[#0c2f68] focus-visible:ring-[#0f3c85]")
              }
            >
              Clear
            </button>
          </div>

          <div className="text-xs text-neutral-600">
            Showing {filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-200 text-xs font-semibold uppercase text-neutral-700">
            <tr>
              <th className="px-4 py-3">Emp no</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">NI</th>
              <th className="px-4 py-3">Pay frequency</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-neutral-100 divide-y divide-neutral-300">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-sm text-neutral-700">
                  No employees match that search.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                const name = employeeDisplayName(employee);

                const rawStatus = employee?.status ?? "active";
                const isLeaver = rawStatus === "leaver";
                const statusLabel = isLeaver ? "Leaver" : "Active";

                const statusClass = isLeaver
                  ? "border-red-300 bg-red-100 text-red-800"
                  : "border-emerald-300 bg-emerald-100 text-emerald-800";

                const routeId = employee.id;

                return (
                  <tr key={employee.id}>
                    <td className="px-4 py-3 text-neutral-900">
                      {employee?.employee_number ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-neutral-900">{name}</td>
                    <td className="px-4 py-3 text-neutral-800">
                      {employee?.email ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      {employee?.ni_number ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      {employee?.pay_frequency ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/employees/${routeId}`}
                        className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85] min-w-[88px]"
                      >
                        View / edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}