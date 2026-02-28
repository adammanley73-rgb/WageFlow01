// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\parental-bereavement\page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";

const CARD = "rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6";

type SearchEmployee = {
  id: string;
  name: string;
  employeeNumber: string | null;
};

type LeaveOption = "one_week" | "two_weeks_together" | "two_weeks_separate";

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function toUtcDate(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

function addDaysUtc(dt: Date, days: number) {
  return new Date(dt.getTime() + days * 24 * 60 * 60 * 1000);
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

export default function ParentalBereavementWizardPage() {
  const router = useRouter();

  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<SearchEmployee | null>(null);

  const [searchResults, setSearchResults] = useState<SearchEmployee[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [eventDate, setEventDate] = useState("");

  const [leaveOption, setLeaveOption] = useState<LeaveOption>("one_week");

  const [block1Start, setBlock1Start] = useState("");
  const [block1End, setBlock1End] = useState("");
  const [block2Start, setBlock2Start] = useState("");
  const [block2End, setBlock2End] = useState("");

  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const trimmedQuery = useMemo(() => employeeQuery.trim(), [employeeQuery]);

  useEffect(() => {
    setSearchError(null);

    const q = trimmedQuery;

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
  }, [trimmedQuery]);

  function selectEmployee(emp: SearchEmployee) {
    setSelectedEmployee(emp);
    setEmployeeQuery(
      emp.employeeNumber ? `${emp.name} (${emp.employeeNumber})` : emp.name
    );
    setSearchResults([]);
    setSearchError(null);
  }

  function validate(): string | null {
    if (!selectedEmployee?.id) return "Select an employee.";

    if (!eventDate || !isIsoDate(eventDate)) {
      return "Date of death or stillbirth is required.";
    }

    const ev = toUtcDate(eventDate);
    if (!ev) return "Date of death or stillbirth must be a valid date.";

    const limit = addDaysUtc(ev, 56 * 7);

    if (!block1Start || !isIsoDate(block1Start)) return "Week 1 start date is required.";
    if (!block1End || !isIsoDate(block1End)) return "Week 1 end date is required.";

    const b1s = toUtcDate(block1Start);
    const b1e = toUtcDate(block1End);
    if (!b1s || !b1e) return "Week 1 dates must be valid.";
    if (b1e < b1s) return "Week 1 end date cannot be before the start date.";
    if (b1s < ev) return "Week 1 must start on or after the event date.";
    if (b1e > limit) return "Leave must finish within 56 weeks of the event date.";

    if (leaveOption === "two_weeks_separate") {
      if (!block2Start || !isIsoDate(block2Start)) return "Week 2 start date is required.";
      if (!block2End || !isIsoDate(block2End)) return "Week 2 end date is required.";

      const b2s = toUtcDate(block2Start);
      const b2e = toUtcDate(block2End);
      if (!b2s || !b2e) return "Week 2 dates must be valid.";
      if (b2e < b2s) return "Week 2 end date cannot be before the start date.";
      if (b2s < ev) return "Week 2 must start on or after the event date.";
      if (b2e > limit) return "Leave must finish within 56 weeks of the event date.";

      if (rangesOverlap(b1s, b1e, b2s, b2e)) {
        return "Week 1 and Week 2 overlap. Separate the dates.";
      }
    }

    if (leaveOption === "two_weeks_together") {
      // still a single record. nothing extra to validate beyond week 1 range.
      // users define the overall period in the single date range.
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setFormError(null);

    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        employeeId: selectedEmployee!.id,
        employeeName: selectedEmployee!.name,
        employeeNumber: selectedEmployee!.employeeNumber || null,
        eventDate,
        leaveOption,
        blocks:
          leaveOption === "two_weeks_separate"
            ? [
                { startDate: block1Start, endDate: block1End },
                { startDate: block2Start, endDate: block2End },
              ]
            : [{ startDate: block1Start, endDate: block1End }],
        notes: notes || null,
      };

      const res = await fetch("/api/absence/parental-bereavement", {
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
        const msg =
          data?.message ||
          data?.error ||
          "The server could not save this parental bereavement record.";
        setFormError(msg);
        setSaving(false);
        return;
      }

      alert("Parental bereavement leave recorded. It now appears in the Absence list.");
      router.push("/dashboard/absence");
    } catch (err2) {
      console.error("Parental bereavement wizard submit error", err2);
      setFormError("Something went wrong saving the form.");
      setSaving(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push("/dashboard/absence/new");
  }

  return (
    <PageTemplate
      title="Parental bereavement"
      currentSection="absence"
      headerMode="wizard"
      backHref="/dashboard/absence/new"
      backLabel="Back"
    >
      <div className={CARD}>
        <div className="mb-4 text-sm text-neutral-700">
          Record parental bereavement leave. Leave must finish within 56 weeks of the date of death or stillbirth.
        </div>

        {formError ? (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {formError}
          </div>
        ) : null}

        {searchError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {searchError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-neutral-900">Employee</h2>

            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Employee name
              </label>

              <input
                type="text"
                value={employeeQuery}
                onChange={(e) => {
                  setEmployeeQuery(e.target.value);
                  setSelectedEmployee(null);
                }}
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                placeholder="Start typing the employee name"
              />

              {searching ? (
                <p className="mt-2 text-xs text-neutral-500">Searching...</p>
              ) : null}

              {searchResults.length > 0 ? (
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
              ) : null}

              {selectedEmployee ? (
                <p className="mt-2 text-xs text-neutral-600">
                  Selected: {selectedEmployee.name}
                  {selectedEmployee.employeeNumber ? ` (${selectedEmployee.employeeNumber})` : ""}
                </p>
              ) : null}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-neutral-900">Event date</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Date of death or stillbirth
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-neutral-900">Leave option</h2>

            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="radio"
                  name="leaveOption"
                  value="one_week"
                  checked={leaveOption === "one_week"}
                  onChange={() => setLeaveOption("one_week")}
                />
                One week
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="radio"
                  name="leaveOption"
                  value="two_weeks_together"
                  checked={leaveOption === "two_weeks_together"}
                  onChange={() => setLeaveOption("two_weeks_together")}
                />
                Two weeks together
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="radio"
                  name="leaveOption"
                  value="two_weeks_separate"
                  checked={leaveOption === "two_weeks_separate"}
                  onChange={() => setLeaveOption("two_weeks_separate")}
                />
                Two separate weeks
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-neutral-900">Leave dates</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {leaveOption === "two_weeks_together" ? "Start date" : "Week 1 start date"}
                </label>
                <input
                  type="date"
                  value={block1Start}
                  onChange={(e) => setBlock1Start(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {leaveOption === "two_weeks_together" ? "End date" : "Week 1 end date"}
                </label>
                <input
                  type="date"
                  value={block1End}
                  onChange={(e) => setBlock1End(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {leaveOption === "two_weeks_separate" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Week 2 start date
                  </label>
                  <input
                    type="date"
                    value={block2Start}
                    onChange={(e) => setBlock2Start(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Week 2 end date
                  </label>
                  <input
                    type="date"
                    value={block2End}
                    onChange={(e) => setBlock2End(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-neutral-900">Notes</h2>

            <label className="text-sm font-medium text-neutral-700">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
              placeholder="Optional notes for this record."
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
                disabled={saving}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save parental bereavement leave"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </PageTemplate>
  );
}