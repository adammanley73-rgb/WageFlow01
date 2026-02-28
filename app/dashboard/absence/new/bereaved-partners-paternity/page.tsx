// C:\Projects\wageflow01\app\dashboard\absence\new\bereaved-partners-paternity\page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";

const CARD = "rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6";

type SearchEmployee = {
  id: string;
  name: string;
  employeeNumber: string | null;
};

type FormErrors = {
  employeeName?: string;
  startDate?: string;
  endDate?: string;
};

const initialState = {
  employeeId: "",
  employeeName: "",
  employeeNumber: "",
  startDate: "",
  endDate: "",
  notes: "",
};

export default function BereavedPartnersPaternityWizardPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchEmployee[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  function updateField(key: string, value: string) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  useEffect(() => {
    const q = String(form.employeeName || "").trim();

    setSearchError(null);

    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setSearching(true);

        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          if (!cancelled) {
            setSearchResults([]);
            setSearchError("Search failed. Try again.");
          }
          return;
        }

        const data = await res.json();
        const employees: SearchEmployee[] = Array.isArray(data?.employees) ? data.employees : [];

        if (!cancelled) setSearchResults(employees);
      } catch (err) {
        console.error("Employee search error", err);
        if (!cancelled) {
          setSearchResults([]);
          setSearchError("Search failed. Check your connection.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.employeeName]);

  function selectEmployee(emp: SearchEmployee) {
    setForm((prev: any) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeNumber: emp.employeeNumber ?? "",
    }));
    setErrors((prev) => ({ ...prev, employeeName: undefined }));
    setSearchResults([]);
    setSearchError(null);
  }

  function validate() {
    const next: FormErrors = {};

    if (!String(form.employeeName || "").trim()) {
      next.employeeName = "Employee name is required";
    }

    if (!form.startDate) next.startDate = "Start date is required";
    if (!form.endDate) next.endDate = "End date is required";
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      next.endDate = "End date cannot be before start date";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    try {
      setSubmitting(true);

      const payload = {
        employeeId: form.employeeId || null,
        employeeName: form.employeeName,
        employeeNumber: form.employeeNumber || null,
        startDate: form.startDate,
        endDate: form.endDate,
        notes: form.notes || null,
      };

      const res = await fetch("/api/absence/bereaved-partners-paternity", {
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
        const code = data?.code || "";
        const msg = data?.message || data?.error || "The server could not save this record.";

        if (code === "ABSENCE_DATE_OVERLAP") {
          alert("Dates overlap an existing absence for this employee.\n\nChange the dates or cancel the other absence.");
        } else {
          alert("Something went wrong saving the form.\n\n" + msg);
        }

        setSubmitting(false);
        return;
      }

      const newId = String(data?.id || data?.absenceId || "").trim();

      if (newId) {
        alert("Saved. Opening the record.");
        router.push(`/dashboard/absence/${newId}`);
        return;
      }

      alert("Saved. It now appears in the Absence list.");
      router.push("/dashboard/absence/list");
    } catch (err) {
      console.error("Bereaved partner's paternity wizard error", err);
      alert("Something went wrong saving the form.");
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTemplate
      title="Bereaved partner's paternity"
      currentSection="absence"
      headerMode="wizard"
      backHref="/dashboard/absence/new"
      backLabel="Back"
    >
      <div className={CARD}>
        {searchError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {searchError}
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          Recordkeeping only. Unpaid by default. New right from April 2026.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-neutral-900">Employee details</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Employee name</label>

                <div className="relative">
                  <input
                    type="text"
                    value={form.employeeName}
                    onChange={(e) => {
                      updateField("employeeName", e.target.value);
                      setForm((prev: any) => ({ ...prev, employeeId: "", employeeNumber: "" }));
                    }}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Start typing the employee name"
                  />

                  {errors.employeeName ? <p className="mt-1 text-xs text-red-600">{errors.employeeName}</p> : null}

                  {searching ? <p className="mt-1 text-xs text-neutral-600">Searching...</p> : null}

                  {searchResults.length > 0 ? (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-300 bg-white shadow-lg">
                      {searchResults.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectEmployee(emp)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
                        >
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-[11px] text-neutral-600">
                            {emp.employeeNumber ? `Employee no: ${emp.employeeNumber}` : "No employee number set"}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Employee number (optional)</label>
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
            <h2 className="text-base font-semibold text-neutral-900">Leave dates</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {errors.startDate ? <p className="mt-1 text-xs text-red-600">{errors.startDate}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">End date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {errors.endDate ? <p className="mt-1 text-xs text-red-600">{errors.endDate}</p> : null}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-neutral-900">Notes and context</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Optional notes for this record."
              />
            </div>
          </section>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/absence")}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save record"}
            </button>
          </div>
        </form>
      </div>
    </PageTemplate>
  );
}