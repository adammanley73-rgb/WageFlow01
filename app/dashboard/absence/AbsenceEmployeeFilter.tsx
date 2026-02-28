// C:\Projects\wageflow01\app\dashboard\absence\AbsenceEmployeeFilter.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type EmployeeOption = {
  id: string;
  label: string;
  employeeNumber?: string | null;
};

type AbsenceRow = {
  id: string;
  employeeId: string;
  employee: string;
  startDate: string;
  endDate: string;
  type: string;
  processedInPayroll: boolean;
};

type Props = {
  employees: EmployeeOption[];
  absences: AbsenceRow[];
  deleteAbsenceAction: (formData: FormData) => Promise<void>;
};

function norm(s: string) {
  return String(s || "").trim().toLowerCase();
}

export default function AbsenceEmployeeFilter({
  employees,
  absences,
  deleteAbsenceAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((e) => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  const matchingEmployees = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    return employees
      .filter((e) => {
        const hay = norm(e.label + " " + (e.employeeNumber || ""));
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [employees, query]);

  const filteredAbsences = useMemo(() => {
    if (!selectedEmployeeId) return absences;
    return absences.filter((a) => a.employeeId === selectedEmployeeId);
  }, [absences, selectedEmployeeId]);

  function handlePick(emp: EmployeeOption) {
    setSelectedEmployeeId(emp.id);
    setQuery(emp.label);
    setShowDropdown(false);
  }

  function clearFilter() {
    setSelectedEmployeeId("");
    setQuery("");
    setShowDropdown(false);
  }

  return (
    <div>
      <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Absence records</div>
            <div className="text-xs text-neutral-700">
              Search by employee to see all their absences, newest first.
            </div>
          </div>

          <div className="shrink-0 text-xs text-neutral-600">
            Use New Absence wizard to add records.
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-lg">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Employee
            </label>

            <div className="relative">
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
                placeholder="Start typing an employee name or number"
              />

              {showDropdown && matchingEmployees.length > 0 ? (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-neutral-300 bg-white shadow-lg max-h-56 overflow-y-auto">
                  {matchingEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePick(emp)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
                    >
                      <div className="font-medium">{emp.label}</div>
                      {emp.employeeNumber ? (
                        <div className="text-[11px] text-neutral-600">
                          Employee no: {emp.employeeNumber}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedEmployee ? (
              <div className="mt-2 text-xs text-neutral-700">
                Showing absences for: <span className="font-semibold">{selectedEmployee.label}</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-neutral-600">
                Showing all absences
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <div className="text-xs text-neutral-700">
              Showing {filteredAbsences.length} record{filteredAbsences.length === 1 ? "" : "s"}
            </div>

            <button
              type="button"
              onClick={clearFilter}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              disabled={!query && !selectedEmployeeId}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <colgroup>
            <col className="w-[22rem]" />
            <col className="w-[10rem]" />
            <col className="w-[10rem]" />
            <col className="w-[12rem]" />
            <col className="w-[12rem]" />
          </colgroup>

          <thead className="bg-neutral-100">
            <tr className="border-b-2 border-neutral-300">
              <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">Employee</th>
              <th className="text-left px-4 py-3">Start Date</th>
              <th className="text-left px-4 py-3">End Date</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredAbsences.length === 0 ? (
              <tr className="border-b-2 border-neutral-300">
                <td className="px-4 py-6 sticky left-0 bg-white" colSpan={4}>
                  <div className="text-neutral-800">No absences found.</div>
                  <div className="text-neutral-700 text-xs">
                    Try clearing the search, or pick a different employee.
                  </div>
                </td>
                <td className="px-4 py-6 text-right bg-white" />
              </tr>
            ) : (
              filteredAbsences.map((a) => (
                <tr key={a.id} className="border-b-2 border-neutral-300">
                  <td className="px-4 py-3 sticky left-0 bg-white">{a.employee}</td>
                  <td className="px-4 py-3">{a.startDate}</td>
                  <td className="px-4 py-3">{a.endDate}</td>
                  <td className="px-4 py-3">{a.type}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2 items-center justify-end">
                      <Link
                        href={`/dashboard/absence/${a.id}/edit`}
                        className="rounded-xl px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                      >
                        Edit
                      </Link>

                      <form action={deleteAbsenceAction}>
                        <input type="hidden" name="absenceId" value={a.id} />
                        <button
                          type="submit"
                          disabled={a.processedInPayroll}
                          className={
                            "rounded-xl px-5 py-2 font-semibold text-white " +
                            (a.processedInPayroll
                              ? "bg-blue-400 opacity-50 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700")
                          }
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}