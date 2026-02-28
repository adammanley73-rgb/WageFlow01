// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\maternity\page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";

// ID rules for this wizard:
// - Use employees.id (employee_row_id) in all API calls.
// - Use companies.id as company_id on the server side.
// - Any UI "employee id" shown on cards is display, not a foreign key.

const CARD = "rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6";

type EmployeeResult = {
  id: string;
  companyId?: string;
  name: string;
  employeeNumber?: string;
};

export default function MaternityWizardPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<EmployeeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeResult | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ewcDate, setEwcDate] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const trimmedSearch = useMemo(() => searchTerm.trim(), [searchTerm]);

  // Debounced employee search (align with Annual wizard GET behaviour)
  useEffect(() => {
    setSearchError(null);
    setSubmitSuccess(false);

    const q = trimmedSearch;

    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setIsSearching(true);

        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSearchResults([]);
          setSearchError("Search failed. Try again.");
          return;
        }

        const data = await res.json();
        const employees: EmployeeResult[] = Array.isArray(data?.employees)
          ? data.employees
          : [];

        if (!cancelled) setSearchResults(employees);
      } catch (err) {
        console.error("Maternity wizard employee search error", err);
        if (!cancelled) {
          setSearchResults([]);
          setSearchError("Search failed. Check your connection.");
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmedSearch]);

  function selectEmployee(emp: EmployeeResult) {
    setSelectedEmployee(emp);
    setSearchTerm(
      emp.employeeNumber ? `${emp.name} (${emp.employeeNumber})` : emp.name
    );
    setSearchResults([]);
    setSearchError(null);
  }

  function validate(): string | null {
    if (!selectedEmployee) return "Select an employee.";
    if (!startDate) return "Start date is required.";
    if (!endDate) return "End date is required.";
    if (startDate && endDate && startDate > endDate)
      return "End date cannot be before start date.";
    if (!ewcDate) return "Expected week of childbirth (EWC) date is required.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submitting) return;

    setSubmitError(null);
    setSubmitSuccess(false);

    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }

    if (!selectedEmployee) {
      setSubmitError("Select an employee.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        employee_id: selectedEmployee.id,
        start_date: startDate,
        end_date: endDate,
        ewc_date: ewcDate,
        notes: notes || null,
      };

      const res = await fetch("/api/absence/maternity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data || data.ok === false) {
        const msg =
          data?.message ||
          "Could not create maternity absence. Please check the details and try again.";
        setSubmitError(msg);
        setSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      router.push("/dashboard/absence");
    } catch (error) {
      console.error("Maternity wizard submit error", error);
      setSubmitError("Unexpected error while saving this maternity absence.");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.push("/dashboard/absence/new");
  }

  return (
    <PageTemplate
      title="Maternity absence"
      currentSection="absence"
      headerMode="wizard"
      backHref="/dashboard/absence/new"
      backLabel="Back"
    >
      <div className={CARD}>
        <div className="text-sm text-neutral-700">
          Record maternity leave. This wizard saves a maternity absence record and
          stores the SMP schedule details on the record.
        </div>

        {submitSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Saved. Redirecting to Absence.
          </div>
        )}

        {submitError && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {submitError}
          </div>
        )}

        {searchError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {searchError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-neutral-900">
              Employee details
            </h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Employee
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedEmployee(null);
                  }}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                  placeholder="Start typing the employee name"
                />

                {isSearching && (
                  <p className="mt-2 text-xs text-neutral-500">Searching…</p>
                )}

                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
                    {searchResults.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          selectEmployee(emp);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                      >
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-[11px] text-neutral-600">
                          {emp.employeeNumber
                            ? `Employee no: ${emp.employeeNumber}`
                            : "No employee number set"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedEmployee && (
                <p className="mt-2 text-xs text-neutral-600">
                  Selected: {selectedEmployee.name}
                  {selectedEmployee.employeeNumber
                    ? ` (${selectedEmployee.employeeNumber})`
                    : ""}
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-neutral-900">
              Leave dates
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  EWC date
                </label>
                <input
                  type="date"
                  value={ewcDate}
                  onChange={(e) => setEwcDate(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                />
                <p className="mt-1 text-[11px] text-neutral-600">
                  Expected week of childbirth. Used for eligibility and SMP schedule.
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Notes and context
            </h2>

            <label className="text-sm font-medium text-neutral-700">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
              placeholder="Any notes to help reconcile with payroll and HR records."
            />
          </section>

          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save maternity absence"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </PageTemplate>
  );
}