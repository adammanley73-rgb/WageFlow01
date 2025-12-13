// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\maternity\page.tsx
/* @ts-nocheck */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";

// ID rules for this wizard:
// - Use employees.id (employee_row_id) in all API calls.
// - Use companies.id as company_id on the server side.
// - Any UI “employee id” shown on cards is just display, not a foreign key.

const CARD =
  "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";
const ACTION_BTN =
  "rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white";

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
    setIsSearching(true);

    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/employees/search?q=${encodeURIComponent(q)}`
        );

        if (!res.ok) {
          throw new Error(`Search failed with status ${res.status}`);
        }

        const json = await res.json();

        if (cancelled) return;

        const rawEmployees = Array.isArray(json?.employees)
          ? json.employees
          : Array.isArray(json?.data)
          ? json.data
          : [];

        const list: EmployeeResult[] = rawEmployees
          .map((row: any) => {
            const id =
              row?.id ??
              row?.employee_id ??
              row?.employeeId ??
              row?.employee_row_id ??
              null;

            const employeeNumber =
              row?.employeeNumber ?? row?.employee_number ?? null;

            const companyId = row?.companyId ?? row?.company_id ?? null;

            const name =
              row?.name ??
              row?.full_name ??
              [row?.first_name, row?.last_name].filter(Boolean).join(" ");

            if (!id || !name) return null;

            return {
              id: String(id),
              companyId: companyId ? String(companyId) : undefined,
              name: String(name),
              employeeNumber: employeeNumber
                ? String(employeeNumber)
                : undefined,
            };
          })
          .filter(Boolean);

        setSearchResults(list);
      } catch (err: any) {
        if (cancelled) return;
        console.error("employee search error", err);
        setSearchError("Unable to search employees right now.");
        setSearchResults([]);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmedSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!selectedEmployee) {
      setSubmitError("Please choose an employee.");
      return;
    }

    if (!startDate || !endDate) {
      setSubmitError("Start date and end date are required.");
      return;
    }

    if (endDate < startDate) {
      setSubmitError("End date must be on or after start date.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/absence/maternity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          startDate,
          endDate,
          ewcDate: ewcDate || null,
          notes: notes || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        console.error("maternity wizard submit error", json);
        setSubmitError(
          json?.message ||
            json?.error ||
            "Failed to save maternity absence. Please try again."
        );
        setSubmitSuccess(false);
        return;
      }

      setSubmitSuccess(true);

      // Keep selected employee so user can see who was processed
      setStartDate("");
      setEndDate("");
      setEwcDate("");
      setNotes("");
    } catch (err: any) {
      console.error("maternity wizard submit unexpected error", err);
      setSubmitError(
        err?.message || "Unexpected error while saving maternity absence."
      );
      setSubmitSuccess(false);
    } finally {
      setSubmitting(false);
    }
  }

  function renderSelectedEmployeeSummary() {
    if (!selectedEmployee) return null;

    const labelParts = [
      selectedEmployee.name || "",
      selectedEmployee.employeeNumber
        ? `(${selectedEmployee.employeeNumber})`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm">
        <div className="font-medium">{labelParts}</div>
        <div className="text-xs text-neutral-600">
          Internal employee ID: {selectedEmployee.id}
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => {
              setSelectedEmployee(null);
              setSearchResults([]);
              setSearchError(null);
              // leave searchTerm as-is so user can continue searching immediately
            }}
            className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Change employee
          </button>
        </div>
      </div>
    );
  }

  function renderSearchResults() {
    if (trimmedSearch.length < 2) return null;

    if (isSearching) {
      return <div className="mt-2 text-xs text-neutral-700">Searching…</div>;
    }

    if (searchError) {
      return <div className="mt-2 text-xs text-red-700">{searchError}</div>;
    }

    if (!searchResults.length) {
      // Key fix: don't mislead the user if they've already selected someone
      if (selectedEmployee) return null;

      return (
        <div className="mt-2 text-xs text-neutral-600">
          No employees found matching that search.
        </div>
      );
    }

    return (
      <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white text-sm ring-1 ring-neutral-200">
        {searchResults.map((emp) => {
          const labelParts = [
            emp.name || "",
            emp.employeeNumber ? `(${emp.employeeNumber})` : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                setSelectedEmployee(emp);
                setSearchResults([]);
                setSearchError(null);
                // Make the input reflect the selection so the UI feels coherent
                setSearchTerm(emp.name || labelParts);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-neutral-100"
              title="Click to select this employee"
            >
              <span className="truncate">{labelParts}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <PageTemplate title="Absence" currentSection="Absence">
      <div className="space-y-4">
        {/* Lightweight header card to match your wizard pattern */}
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0f3c85]">
            Maternity / SMP wizard
          </h1>
          <p className="mt-1 text-sm text-neutral-800">
            Create a maternity absence that will be used to drive SMP pay in
            payroll runs.
          </p>
        </div>

        {submitError && (
          <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800">
            {submitError}
          </div>
        )}

        {submitSuccess && (
          <div className="rounded-lg bg-green-100 px-4 py-3 text-sm text-green-800">
            Maternity absence saved successfully. SMP will be created for this
            employee when you run the absence sync for the relevant payroll run.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Employee card */}
            <div className={CARD}>
              <h2 className="mb-2 text-lg font-semibold">1. Choose employee</h2>
              <label className="mb-1 block text-sm font-medium">Employee</label>
              <input
                type="text"
                className="w-full rounded-md border border-neutral-400 px-3 py-2 text-sm"
                placeholder="Type at least 2 characters"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // If user starts typing again, we don't auto-clear selection,
                  // but the "Change employee" button is there for clarity.
                }}
              />
              <p className="mt-1 text-xs text-neutral-700">
                Min 2 characters. Results will appear below. Click a result to
                select.
              </p>

              {renderSearchResults()}
              {renderSelectedEmployeeSummary()}
            </div>

            {/* Maternity dates card */}
            <div className={CARD}>
              <h2 className="mb-2 text-lg font-semibold">2. Maternity dates</h2>

              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium">
                  Start date
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border border-neutral-400 px-3 py-2 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium">
                  End date
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border border-neutral-400 px-3 py-2 text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium">
                  Expected week of childbirth (optional)
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border border-neutral-400 px-3 py-2 text-sm"
                  value={ewcDate}
                  onChange={(e) => setEwcDate(e.target.value)}
                />
                <p className="mt-1 text-xs text-neutral-700">
                  You can leave this blank for now. It will still create the
                  maternity absence.
                </p>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">
                  Notes (optional)
                </label>
                <textarea
                  className="h-24 w-full rounded-md border border-neutral-400 px-3 py-2 text-sm"
                  placeholder="Any extra info you want to store for this maternity absence."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/absence")}
                  className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={ACTION_BTN}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save maternity absence"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageTemplate>
  );
}
