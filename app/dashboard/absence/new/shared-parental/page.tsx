/* @ts-nocheck */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EmployeePicker from "@/app/components/employees/EmployeePicker";
import {
  ensureStoreReady,
  readAbsences as nsReadAbsences,
  writeAbsences as nsWriteAbsences,
} from "@/lib/storeVersion";

/**
 * Minimal employee shape needed by calculators and UI.
 */
type Emp = {
  id: string;
  firstName?: string;
  lastName?: string;
  niNumber?: string;
  payGroup?: string;
};

/**
 * SPP schedule/result shapes.
 * Expect weekly schedule items from client-side engines.
 */
type SPPScheduleItem = {
  weekStart: string; // ISO date for pay week
  amount?: number;
  note?: string;
};

type SPPResult = {
  total: number;
  schedule: SPPScheduleItem[];
  meta?: Record<string, unknown>;
};

/**
 * Stored record for Paternity.
 */
type AbsenceRecord = {
  id: string;
  type: "paternity";
  employeeId: string;
  employeeName: string;
  startDate: string; // leave start ISO
  endDate: string; // leave end ISO
  birthDate: string; // ISO, for SPP eligibility
  partnerName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  spp?: SPPResult;
  _version: 1;
};

// ---------- helpers ----------
function uid() {
  return "ab_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isoDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidDateStr(s: string) {
  if (!s) return false;
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

/**
 * Defensive SPP loader using alias "@/lib/spp".
 * Supports multiple common API shapes so this page survives refactors.
 */
async function tryCalculateSPP(params: {
  employee: Emp;
  birthDate: string;
  leaveStart: string;
  leaveEnd: string;
}) {
  try {
    const mod: any = await import("@/lib/spp");
    const fn =
      mod.calculateSPP ||
      mod.computeSPP ||
      mod.getSPPSchedule ||
      mod.buildSPPSchedule;

    if (typeof fn !== "function") return null;

    const shapes = [
      // positional, conservative
      [params.employee, params.birthDate, params.leaveStart, params.leaveEnd],
      // named, common keys
      [
        {
          employee: params.employee,
          birthDate: params.birthDate,
          startDate: params.leaveStart,
          endDate: params.leaveEnd,
        },
      ],
      // slight variants
      [
        {
          employee: params.employee,
          dueOrBirth: params.birthDate,
          leaveStart: params.leaveStart,
          leaveEnd: params.leaveEnd,
        },
      ],
    ];

    for (const args of shapes) {
      try {
        const out = await fn(...(Array.isArray(args) ? args : [args]));
        if (!out) continue;

        // Normalize a few shapes
        if (typeof out.total === "number" && Array.isArray(out.schedule)) {
          return {
            total: out.total,
            schedule: out.schedule as SPPScheduleItem[],
            meta: out.meta ?? {},
          } as SPPResult;
        }
        if (Array.isArray(out)) {
          const schedule = out as SPPScheduleItem[];
          const total = schedule.reduce((sum, w) => sum + (w.amount || 0), 0);
          return { total, schedule };
        }
        if (out && Array.isArray(out.weeks) && typeof out.amount === "number") {
          return {
            total: out.amount,
            schedule: out.weeks,
            meta: { source: "spp.weeks+amount" },
          };
        }
      } catch {
        // try next shape
      }
    }
  } catch {
    // module not present or alias unresolved at runtime
  }
  return null;
}

// ---------- page ----------
export default function NewPaternityAbsencePage() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    ensureStoreReady();
    setHydrated(true);
  }, []);

  // resolve employee for display and calc
  const selectedEmployee = useMemo(() => {
    try {
      const raw = localStorage.getItem("wfStore");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed?.employees) ? (parsed.employees as Emp[]) : ([] as Emp[]);
      return list.find((e) => e.id === employeeId);
    } catch {
      return undefined;
    }
  }, [employeeId]);

  function resetForm() {
    setEmployeeId("");
    setBirthDate("");
    setLeaveStart("");
    setLeaveEnd("");
    setPartnerName("");
    setNotes("");
    setError(null);
    setInfo(null);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!employeeId) {
      setError("Select an employee.");
      return;
    }
    if (!isValidDateStr(birthDate)) {
      setError("Enter a valid birth date.");
      return;
    }
    if (!isValidDateStr(leaveStart)) {
      setError("Enter a valid leave start date.");
      return;
    }
    if (!isValidDateStr(leaveEnd)) {
      setError("Enter a valid leave end date.");
      return;
    }
    if (new Date(leaveEnd) < new Date(leaveStart)) {
      setError("Leave end date cannot be before leave start.");
      return;
    }

    const emp = selectedEmployee as Emp;
    const record: AbsenceRecord = {
      id: uid(),
      type: "paternity",
      employeeId: emp.id,
      employeeName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
      startDate: isoDate(leaveStart),
      endDate: isoDate(leaveEnd),
      birthDate: isoDate(birthDate),
      partnerName: partnerName?.trim() || undefined,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _version: 1,
    };

    setSaving(true);
    try {
      const spp = await tryCalculateSPP({
        employee: emp,
        birthDate: record.birthDate,
        leaveStart: record.startDate,
        leaveEnd: record.endDate,
      });
      if (spp) record.spp = spp;

      const current = (nsReadAbsences() as AbsenceRecord[]) ?? [];
      nsWriteAbsences([record, ...current]);

      setInfo(
        spp
          ? `Saved. SPP total £${spp.total.toFixed(2)} with ${spp.schedule.length} weeks.`
          : "Saved. SPP schedule not available in this build."
      );
    } catch {
      setError("Failed to save absence. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Record Paternity Absence</h1>
      <p className="text-sm text-gray-600 mb-6">
        Enter birth and leave dates. Saves to localStorage and updates Absence stats.
      </p>

      <form onSubmit={onSave} className="grid gap-4">
        <EmployeePicker value={employeeId} onChange={setEmployeeId} required allowClear />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label htmlFor="birthDate" className="text-sm font-medium">
              Child birth date
            </label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="border rounded-md px-3 py-2"
              required
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="leaveStart" className="text-sm font-medium">
              Leave start date
            </label>
            <input
              id="leaveStart"
              type="date"
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
              className="border rounded-md px-3 py-2"
              required
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="leaveEnd" className="text-sm font-medium">
              Leave end date
            </label>
            <input
              id="leaveEnd"
              type="date"
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
              className="border rounded-md px-3 py-2"
              required
            />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label htmlFor="partnerName" className="text-sm font-medium">
              Partner name
            </label>
            <input
              id="partnerName"
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className="border rounded-md px-3 py-2"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="Optional"
          />
        </div>

        {error && <div className="px-3 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}
        {info && <div className="px-3 py-2 rounded-md bg-green-50 text-green-700 text-sm">{info}</div>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-700 text-white font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={resetForm} className="px-4 py-2 rounded-md border">
            Reset
          </button>
          <button type="button" onClick={() => router.push("/dashboard/absence")} className="px-4 py-2 rounded-md border">
            Cancel
          </button>
          <button type="button" onClick={() => router.push("/dashboard/absence/list")} className="px-4 py-2 rounded-md border">
            Go to Absence list
          </button>
        </div>

        {employeeId && (
          <details className="mt-4 border rounded-md p-3">
            <summary className="cursor-pointer text-sm font-medium">Preview payload</summary>
            <pre className="text-xs overflow-auto mt-2">
{JSON.stringify(
  {
    employeeId,
    birthDate,
    startDate: leaveStart,
    endDate: leaveEnd,
    partnerName: partnerName || undefined,
    notes: notes || undefined,
  },
  null,
  2
)}
            </pre>
          </details>
        )}
      </form>
    </div>
  );
}

