// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\paternity\page.tsx
/* @ts-nocheck */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import PageTemplate from "@/components/layout/PageTemplate";

const inter = Inter({ subsets: ["latin"] });

type FormState = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  dueDate: string;
  startDate: string;
  endDate: string;
  weeksOfLeave: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

type SearchEmployee = {
  id: string;
  name: string;
  employeeNumber: string | null;
};

const initialState: FormState = {
  employeeId: "",
  employeeName: "",
  employeeNumber: "",
  dueDate: "",
  startDate: "",
  endDate: "",
  weeksOfLeave: "",
  notes: "",
};

export default function PaternityLeaveWizardPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchEmployee[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleEmployeeSearchChange(value: string) {
    setForm((prev) => ({
      ...prev,
      employeeName: value,
      employeeNumber: "",
      employeeId: "",
    }));
    setErrors((prev) => ({ ...prev, employeeName: undefined }));

    const trimmed = value.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);

      const res = await fetch(
        `/api/employees/search?q=${encodeURIComponent(trimmed)}`
      );

      if (!res.ok) {
        setSearchResults([]);
        setSearchError("Search failed. Try again.");
        return;
      }

      const data = await res.json();
      const employees: SearchEmployee[] = Array.isArray(data?.employees)
        ? data.employees
        : [];

      setSearchResults(employees);
    } catch (err) {
      console.error("Employee search error", err);
      setSearchResults([]);
      setSearchError("Search failed. Check your connection.");
    } finally {
      setSearching(false);
    }
  }

  function handleSelectEmployee(emp: SearchEmployee) {
    setForm((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeNumber: emp.employeeNumber ?? "",
    }));
    setErrors((prev) => ({ ...prev, employeeName: undefined }));
    setSearchResults([]);
    setSearchError(null);
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!form.employeeName.trim()) {
      nextErrors.employeeName = "Employee name is required";
    }

    if (!form.startDate) {
      nextErrors.startDate = "Start date is required";
    }

    if (!form.endDate) {
      nextErrors.endDate = "End date is required";
    }

    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      nextErrors.endDate = "End date cannot be before start date";
    }

    if (!form.weeksOfLeave.trim()) {
      nextErrors.weeksOfLeave = "Weeks of leave is required";
    } else {
      const n = Number(form.weeksOfLeave);
      if (!Number.isFinite(n) || n <= 0) {
        nextErrors.weeksOfLeave = "Enter a valid number of weeks";
      } else if (n > 2) {
        nextErrors.weeksOfLeave = "Paternity leave is typically 1 or 2 weeks";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);

      const payload = {
        employeeId: form.employeeId || null,
        employeeName: form.employeeName,
        employeeNumber: form.employeeNumber || null,
        dueDate: form.dueDate || null,
        startDate: form.startDate,
        endDate: form.endDate,
        weeksOfLeave: form.weeksOfLeave,
        notes: form.notes,
      };

      const res = await fetch("/api/absence/paternity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore
      }

      if (!res.ok || data?.ok === false) {
        const message =
          data?.message || data?.error || "The server could not save this record.";
        console.error("Paternity wizard error", { status: res.status, data });
        alert(
          "Something went wrong saving the form.\n\n" +
            message +
            "\n\nCheck the console or Supabase logs for more detail."
        );
        return;
      }

      alert("Paternity leave recorded. It now appears in the Absence list.");
      setForm(initialState);
      setSearchResults([]);
      setSearchError(null);
      router.push("/dashboard/absence");
    } catch (err) {
      console.error("Paternity wizard unexpected error", err);
      alert("Something went wrong saving the form. Check the console.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTemplate title="Absence" currentSection="absence">
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Header card */}
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0f3c85]">
            Paternity leave wizard
          </h1>
          <p className="mt-1 text-sm text-neutral-800">
            Record paternity leave for an employee. This creates an Absence record
            and will later feed statutory pay scheduling when that layer is fully wired.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 px-4 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Employee details */}
            <section className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-neutral-900">
                Employee details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Employee name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.employeeName}
                      onChange={(e) => handleEmployeeSearchChange(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      placeholder="Start typing the employee name"
                    />

                    {errors.employeeName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.employeeName}
                      </p>
                    )}

                    {searchError && (
                      <p className="mt-1 text-xs text-red-600">{searchError}</p>
                    )}
                    {searching && !searchError && (
                      <p className="mt-1 text-xs text-neutral-600">Searchingâ€¦</p>
                    )}

                    {searchResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-neutral-300 bg-white shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => handleSelectEmployee(emp)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Employee number (optional)
                  </label>
                  <input
                    type="text"
                    value={form.employeeNumber}
                    onChange={(e) => updateField("employeeNumber", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Payroll number if known"
                  />
                </div>
              </div>
            </section>

            {/* Child details */}
            <section className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-neutral-900">
                Child details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Due date (optional)
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => updateField("dueDate", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
            </section>

            {/* Leave details */}
            <section className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-neutral-900">
                Leave dates
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    End date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Weeks of leave
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="2"
                    step="1"
                    value={form.weeksOfLeave}
                    onChange={(e) => updateField("weeksOfLeave", e.target.value)}
                    className={
                      inter.className +
                      " w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    }
                    placeholder="1 or 2"
                  />
                  {errors.weeksOfLeave && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.weeksOfLeave}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-neutral-600">
                    Most cases are 1 or 2 weeks. This field supports validation
                    and later statutory scheduling.
                  </p>
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-neutral-900">
                Notes and context
              </h2>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Any notes that help you reconcile this leave with payroll."
                />
              </div>
            </section>

            {/* Footer actions */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mt-2">
              <p className="text-[11px] text-neutral-600">
                This records the absence with the intended dates. Statutory pay
                elements (SPP) will be generated during the statutory pay wiring phase.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/absence")}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "Savingâ€¦" : "Save paternity leave"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </PageTemplate>
  );
}
