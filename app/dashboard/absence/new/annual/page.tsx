// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\annual\page.tsx
/* @ts-nocheck */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";

const CARD =
  "rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6";

type FormState = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  startDate: string;
  endDate: string;
  totalDays: string;
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
  startDate: "",
  endDate: "",
  totalDays: "",
  notes: "",
};

export default function AnnualLeaveWizardPage() {
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

    if (!form.totalDays.trim()) {
      nextErrors.totalDays = "Total days is required";
    } else {
      const n = Number(form.totalDays);
      if (!Number.isFinite(n) || n <= 0) {
        nextErrors.totalDays = "Enter a valid number of days";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);

      const payload = {
        employeeId: form.employeeId || null,
        employeeName: form.employeeName,
        employeeNumber: form.employeeNumber || null,
        startDate: form.startDate,
        endDate: form.endDate,
        totalDays: form.totalDays,
        notes: form.notes,
      };

      const res = await fetch("/api/absence/annual", {
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
          data?.message ||
          "The server could not save this annual leave record.";
        console.error("Annual leave wizard error", { status: res.status, data });
        alert(
          "Something went wrong saving the form.\n\n" +
            message +
            "\n\nCheck the server logs for more detail."
        );
        return;
      }

      alert("Annual leave recorded. It now appears in the Absence list.");
      setForm(initialState);
      setSearchResults([]);
      setSearchError(null);
      router.push("/dashboard/absence");
    } catch (err) {
      console.error("Annual leave wizard unexpected error", err);
      alert("Something went wrong saving the form.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTemplate
      title="Annual leave"
      currentSection="absence"
      headerMode="wizard"
      backHref="/dashboard/absence/new"
      backLabel="Back"
    >
      <div className={CARD}>
        <div className="mb-4 text-sm text-neutral-700">
          Record a block of paid annual leave. These days will feed into holiday
          pay calculations for the relevant pay period.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-neutral-900">
              Employee details
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Employee name
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={form.employeeName}
                    onChange={(e) => handleEmployeeSearchChange(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                    <p className="mt-1 text-xs text-neutral-600">Searching…</p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-300 bg-white shadow-lg">
                      {searchResults.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectEmployee(emp)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
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
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Employee number (optional)
                </label>
                <input
                  type="text"
                  value={form.employeeNumber}
                  onChange={(e) => updateField("employeeNumber", e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Payroll number if known"
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
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
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {errors.startDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  End date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {errors.endDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Total days of leave
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.totalDays}
                  onChange={(e) => updateField("totalDays", e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-right text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g. 5"
                />
                {errors.totalDays && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.totalDays}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-neutral-600">
                  Use half days where needed. For example 1.5 for one and a half
                  days.
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-neutral-900">
              Notes and context
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Any comments that help you reconcile this leave with the rota or payroll."
              />
            </div>
          </section>

          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[11px] text-neutral-600">
              Once holiday pay is wired into the payroll engine, the days
              recorded here will drive the HOLIDAY_PAY element for the relevant
              pay period.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard/absence/new")}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save annual leave"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </PageTemplate>
  );
}
