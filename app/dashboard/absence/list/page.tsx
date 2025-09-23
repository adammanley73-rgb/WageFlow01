"use client";

import React, { useEffect, useMemo, useState } from "react";
import EmployeePicker from "@/app/components/employees/EmployeePicker";
import {
  ensureStoreReady,
  readAbsences as nsReadAbsences,
  writeAbsences as nsWriteAbsences,
  fireRefresh,
} from "@/lib/storeVersion";

type AbsenceBase = {
  id: string;
  employeeId: string;
  employeeName: string;
  type:
    | "sickness"
    | "maternity"
    | "adoption"
    | "paternity"
    | "shared-parental"
    | "parental-bereavement";
  startDate: string; // ISO
  endDate: string; // ISO
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  _version: 1;
};

type SicknessExt = {
  type: "sickness";
  partialDayFraction: 0 | 0.25 | 0.5 | 0.75;
  startTime?: string;
  endTime?: string;
  ssp?: {
    total: number;
    schedule: Array<{
      date: string;
      isWaitingDay?: boolean;
      payable?: boolean;
      dailyAmount?: number;
    }>;
  };
};

type AbsenceRecord = AbsenceBase & Partial<SicknessExt>;

function toISO(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string) {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.floor(ms / 86400000) + 1;
}

export default function AbsenceListPage() {
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<AbsenceRecord[]>([]);

  // Filters
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<string>("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    ensureStoreReady();
    load();
    setHydrated(true);

    const onRefresh = () => load();
    window.addEventListener("wageflow:store-refresh", onRefresh);
    return () => window.removeEventListener("wageflow:store-refresh", onRefresh);
  }, []);

  function load() {
    const list = (nsReadAbsences() as AbsenceRecord[]) ?? [];
    setItems(
      list.map((r) => ({
        ...r,
        startDate: toISO(r.startDate),
        endDate: toISO(r.endDate),
      }))
    );
  }

  function clearFilters() {
    setEmployeeId("");
    setType("");
    setQ("");
    setFrom("");
    setTo("");
  }

  function remove(id: string) {
    const list = (nsReadAbsences() as AbsenceRecord[]) ?? [];
    const next = list.filter((r) => r.id !== id);
    nsWriteAbsences(next);
    fireRefresh();
    load();
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const f = from ? new Date(from).getTime() : null;
    const t = to ? new Date(to).getTime() : null;

    return items.filter((r) => {
      if (employeeId && r.employeeId !== employeeId) return false;
      if (type && r.type !== type) return false;

      const s = new Date(r.startDate).getTime();
      const e = new Date(r.endDate).getTime();
      if (f !== null && e < f) return false;
      if (t !== null && s > t) return false;

      if (needle) {
        const blob = `${r.employeeName} ${r.type} ${r.startDate} ${r.endDate} ${r.notes || ""}`.toLowerCase();
        if (!blob.includes(needle)) return false;
      }

      return true;
    });
  }, [items, employeeId, type, q, from, to]);

  function view(id: string) {
    const rec = items.find((x) => x.id === id);
    if (!rec) return;
    alert(
      `Absence\n\nEmployee: ${rec.employeeName}\nType: ${rec.type}\nFrom: ${rec.startDate}\nTo: ${rec.endDate}\nDays: ${daysBetween(
        rec.startDate,
        rec.endDate
      )}\nSSP total: ${
        rec.type === "sickness" && rec.ssp ? `£${rec.ssp.total.toFixed(2)}` : "n/a"
      }\nNotes: ${rec.notes || "-"}`
    );
  }

  function edit(id: string) {
    alert("Edit is not implemented in this demo build.");
  }

  if (!hydrated) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Absence list</h1>
      <p className="text-sm text-gray-600 mb-4">
        Filter, view, and manage absences. Data persists to localStorage under the WageFlow namespace.
      </p>

      {/* Controls */}
      <div className="grid gap-3 border rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Employee</label>
            <EmployeePicker value={employeeId} onChange={setEmployeeId} allowClear />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="type">
              Type
            </label>
            <select
              id="type"
              className="border rounded-md px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="sickness">Sickness</option>
              <option value="maternity">Maternity</option>
              <option value="adoption">Adoption</option>
              <option value="paternity">Paternity</option>
              <option value="shared-parental">Shared parental</option>
              <option value="parental-bereavement">Parental bereavement</option>
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              className="border rounded-md px-3 py-2"
              placeholder="Name, notes, dates"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="from">
              From
            </label>
            <input
              id="from"
              type="date"
              className="border rounded-md px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="to">
              To
            </label>
            <input
              id="to"
              type="date"
              className="border rounded-md px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-3">
            <button type="button" onClick={load} className="px-4 py-2 rounded-md border">
              Refresh
            </button>
            <button type="button" onClick={clearFilters} className="px-4 py-2 rounded-md border">
              Clear
            </button>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-700">
              Showing {filtered.length} of {items.length}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Start</th>
              <th className="px-3 py-2 font-medium">End</th>
              <th className="px-3 py-2 font-medium">Days</th>
              <th className="px-3 py-2 font-medium">SSP total</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                  No absences found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const days = daysBetween(r.startDate, r.endDate);
                const sspTotal =
                  r.type === "sickness" && r.ssp && typeof r.ssp.total === "number"
                    ? `£${r.ssp.total.toFixed(2)}`
                    : "";
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{r.employeeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap capitalize">
                      {r.type.replace("-", " ")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.startDate}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.endDate}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{days}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{sspTotal}</td>
                    <td className="px-3 py-2 max-w-[28ch]">
                      <span className="line-clamp-2">{r.notes || ""}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="px-3 py-1 rounded-md border"
                          onClick={() => view(r.id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-md border"
                          onClick={() => edit(r.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-md border border-red-300 text-red-700"
                          onClick={() => remove(r.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mt-4">
        <a className="px-3 py-2 rounded-md border" href="/dashboard/absence/new/sickness">
          Record sickness
        </a>
        <a className="px-3 py-2 rounded-md border" href="/dashboard/absence/new/maternity">
          Record maternity
        </a>
        <a className="px-3 py-2 rounded-md border" href="/dashboard/absence/new/adoption">
          Record adoption
        </a>
        <a className="px-3 py-2 rounded-md border" href="/dashboard/absence/new/paternity">
          Record paternity
        </a>
        <a className="px-3 py-2 rounded-md border" href="/dashboard/absence/new/shared-parental">
          Record shared parental
        </a>
        <a
          className="px-3 py-2 rounded-md border"
          href="/dashboard/absence/new/parental-bereavement"
        >
          Record parental bereavement
        </a>
      </div>
    </div>
  );
}
