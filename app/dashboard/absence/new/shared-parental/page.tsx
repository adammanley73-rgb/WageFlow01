// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\shared-parental\page.tsx
/* @ts-nocheck */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";

const INTRO_CARD = "rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6";

type FormState = {
employeeId: string;
employeeName: string;
employeeNumber: string;
startDate: string;
endDate: string;
childArrivalDate: string;
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
childArrivalDate: "",
notes: "",
};

export default function SharedParentalLeaveWizardPage() {
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

  const res = await fetch(`/api/employees/search?q=${encodeURIComponent(trimmed)}`);

  if (!res.ok) {
    setSearchResults([]);
    setSearchError("Search failed. Try again.");
    return;
  }

  const data = await res.json();
  const employees: SearchEmployee[] = Array.isArray(data?.employees) ? data.employees : [];
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

if (!form.employeeName.trim()) nextErrors.employeeName = "Employee name is required";
if (!form.startDate) nextErrors.startDate = "Start date is required";
if (!form.endDate) nextErrors.endDate = "End date is required";

if (form.startDate && form.endDate && form.startDate > form.endDate) {
  nextErrors.endDate = "End date cannot be before start date";
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
    startDate: form.startDate,
    endDate: form.endDate,
    childArrivalDate: form.childArrivalDate || null,
    notes: form.notes || null,
  };

  const res = await fetch("/api/absence/shared-parental", {
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

  if (!res.ok || data?.ok === false) {
    const message =
      data?.message ||
      data?.error ||
      "The server could not save this shared parental leave record.";
    console.error("Shared parental wizard error", { status: res.status, data });

    alert(
      "Something went wrong saving the form.\n\n" +
        message +
        "\n\nCheck Supabase logs for more detail."
    );
    return;
  }

  alert("Shared parental leave recorded. It now appears in the Absence list.");
  setForm(initialState);
  setSearchResults([]);
  setSearchError(null);
  router.push("/dashboard/absence");
} catch (err) {
  console.error("Shared parental wizard unexpected error", err);
  alert("Something went wrong saving the form.");
} finally {
  setSubmitting(false);
}


}

return (
<PageTemplate title="Shared parental leave" currentSection="absence" headerMode="wizard" backHref="/dashboard/absence/new" backLabel="Back" >
<div className="flex flex-col gap-4 flex-1 min-h-0">
<div className={INTRO_CARD}>
<div className="text-sm text-neutral-700">
Record a shared parental leave period for an employee. This creates an absence record for compliance and future ShPP wiring.
</div>
</div>

    <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 px-4 py-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-neutral-900">Employee details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Employee name</label>

              <div className="relative">
                <input
                  type="text"
                  value={form.employeeName}
                  onChange={(e) => handleEmployeeSearchChange(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Start typing the employee name"
                />

                {errors.employeeName && (
                  <p className="mt-1 text-xs text-red-600">{errors.employeeName}</p>
                )}

                {searchError && <p className="mt-1 text-xs text-red-600">{searchError}</p>}

                {searching && !searchError && (
                  <p className="mt-1 text-xs text-neutral-600">Searching...</p>
                )}

                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-neutral-300 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
                      >
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-[11px] text-neutral-600">
                          {emp.employeeNumber ? `Employee no: ${emp.employeeNumber}` : "No employee number set"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Employee number (optional)</label>
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

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-neutral-900">Child details (optional for v1)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Child birth or placement date</label>
              <input
                type="date"
                value={form.childArrivalDate}
                onChange={(e) => updateField("childArrivalDate", e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <p className="mt-1 text-[11px] text-neutral-600">
                Stored for future eligibility checks and ShPP calculations.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-neutral-900">Leave period</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Start date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">End date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
            </div>

            <div className="hidden md:block" />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">Notes and context</h2>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="Any context that helps you reconcile this leave with statutory rules and scheduling."
            />
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mt-2">
          <p className="text-[11px] text-neutral-600">
            This wizard records the leave period now. ShPP calculation and multi-block SPL scheduling can be layered in once statutory flows are fully stabilised.
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
              {submitting ? "Saving..." : "Save shared parental leave"}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</PageTemplate>


);
}