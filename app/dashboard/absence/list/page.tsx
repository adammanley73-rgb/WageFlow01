// C:\Projects\wageflow01\app\dashboard\absence\list\page.tsx
/* @ts-nocheck */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTemplate from "@/components/layout/PageTemplate";

const CARD = "rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6";

type SearchEmployee = {
  id: string;
  name: string;
  employeeNumber: string | null;
};

type AbsenceItem = {
  id: string;
  employeeId: string;
  employeeLabel: string;
  type: string | null;
  status: string | null;
  firstDay: string | null;
  lastDayExpected: string | null;
  lastDayActual: string | null;
  notes: string | null;
};

type AbsenceTypeItem = {
  code: string;
  label: string;
  endpoint?: string;
  category?: string;
  paid_default?: boolean;
  effective_from?: string | null;
};

const STATUS_OPTIONS = [
  { code: "", label: "All statuses" },
  { code: "draft", label: "Draft" },
  { code: "scheduled", label: "Scheduled" },
  { code: "active", label: "Active" },
  { code: "completed", label: "Completed" },
  { code: "cancelled", label: "Cancelled" },
];

function shortText(s: string | null | undefined, max = 70) {
  const t = String(s || "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

export default function AbsenceListPage() {
  const [items, setItems] = useState<AbsenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [types, setTypes] = useState<AbsenceTypeItem[]>([]);
  const [typesError, setTypesError] = useState<string | null>(null);

  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");

  const [searchResults, setSearchResults] = useState<SearchEmployee[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const typeLabelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of types || []) {
      if (t?.code) m[String(t.code)] = String(t.label || t.code);
    }
    return m;
  }, [types]);

  function resetEmployeeSelection() {
    setEmployeeId("");
    setEmployeeNumber("");
  }

  function selectEmployee(emp: SearchEmployee) {
    setEmployeeId(emp.id);
    setEmployeeName(emp.name);
    setEmployeeNumber(emp.employeeNumber ?? "");
    setSearchResults([]);
    setSearchError(null);
  }

  async function loadTypes() {
    try {
      setTypesError(null);
      const res = await fetch("/api/absence/types", { method: "GET" });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setTypes([]);
        setTypesError(data?.error || data?.message || "Could not load absence types.");
        return;
      }

      const next = Array.isArray(data?.items) ? data.items : [];
      setTypes(next);
    } catch (e) {
      setTypes([]);
      setTypesError("Could not load absence types.");
    }
  }

  async function loadAbsences(filters?: {
    employeeId?: string;
    status?: string;
    type?: string;
  }) {
    try {
      setLoading(true);
      setLoadError(null);

      const qs = new URLSearchParams();
      qs.set("limit", "200");

      const eId = String(filters?.employeeId || "").trim();
      const st = String(filters?.status || "").trim();
      const ty = String(filters?.type || "").trim();

      if (eId) qs.set("employeeId", eId);
      if (st) qs.set("status", st);
      if (ty) qs.set("type", ty);

      const res = await fetch("/api/absence/list?" + qs.toString(), { method: "GET" });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setItems([]);
        setLoadError(data?.message || data?.error || "Could not load absences.");
        return;
      }

      const next = Array.isArray(data?.items) ? data.items : [];
      setItems(next);
    } catch (e) {
      setItems([]);
      setLoadError("Could not load absences.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    const q = String(employeeName || "").trim();
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

        const data = await res.json().catch(() => null);
        const employees: SearchEmployee[] = Array.isArray(data?.employees) ? data.employees : [];
        if (!cancelled) setSearchResults(employees);
      } catch (e) {
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
  }, [employeeName]);

  useEffect(() => {
    let cancelled = false;

    const t = setTimeout(() => {
      if (cancelled) return;
      loadAbsences({ employeeId, status: statusFilter, type: typeFilter });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [employeeId, statusFilter, typeFilter]);

  return (
    <PageTemplate title="Absence list" currentSection="absence">
      <div className={CARD}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-neutral-700">
              View and filter saved absences. Use the New absence hub to create records.
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/dashboard/absence/new"
                className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--wf-blue)" }}
              >
                New absence
              </Link>
              <button
                type="button"
                onClick={() => loadAbsences({ employeeId, status: statusFilter, type: typeFilter })}
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {typesError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {typesError}
            </div>
          ) : null}

          {loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Employee</label>

              <div className="relative">
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => {
                    setEmployeeName(e.target.value);
                    resetEmployeeSelection();
                  }}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Type a name to filter"
                />

                {searching ? <p className="mt-1 text-xs text-neutral-600">Searching…</p> : null}
                {searchError ? <p className="mt-1 text-xs text-red-600">{searchError}</p> : null}

                {searchResults.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-300 bg-white shadow-lg">
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

              {employeeId ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                  <div>
                    Filtering by: <span className="font-semibold">{employeeName}</span>
                    {employeeNumber ? <span className="text-neutral-500"> ({employeeNumber})</span> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeName("");
                      setEmployeeId("");
                      setEmployeeNumber("");
                      setSearchResults([]);
                    }}
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All types</option>
                {(types || []).map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label || t.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.code || "all"} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-neutral-300 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-50">
                  <tr className="text-neutral-700">
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Start</th>
                    <th className="px-4 py-3 font-semibold">End expected</th>
                    <th className="px-4 py-3 font-semibold">End actual</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-neutral-600">
                        Loading…
                      </td>
                    </tr>
                  ) : null}

                  {!loading && items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-neutral-600">
                        No absences found for the selected filters.
                      </td>
                    </tr>
                  ) : null}

                  {!loading &&
                    items.map((a) => {
                      const typeLabel = a.type ? typeLabelMap[a.type] || a.type : "";
                      return (
                        <tr key={a.id} className="border-t border-neutral-200">
                          <td className="px-4 py-3 text-neutral-900">{a.employeeLabel || "Employee"}</td>
                          <td className="px-4 py-3 text-neutral-900">{typeLabel}</td>
                          <td className="px-4 py-3 text-neutral-900">{a.status || ""}</td>
                          <td className="px-4 py-3 text-neutral-900">{a.firstDay || ""}</td>
                          <td className="px-4 py-3 text-neutral-900">{a.lastDayExpected || ""}</td>
                          <td className="px-4 py-3 text-neutral-900">{a.lastDayActual || ""}</td>
                          <td className="px-4 py-3 text-neutral-700">{shortText(a.notes, 60)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/dashboard/absence/${a.id}`}
                                className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                              >
                                View
                              </Link>
                              <Link
                                href={`/dashboard/absence/${a.id}/edit`}
                                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                                style={{ backgroundColor: "var(--wf-blue)" }}
                              >
                                Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}