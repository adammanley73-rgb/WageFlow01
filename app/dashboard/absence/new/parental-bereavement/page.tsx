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

// Minimal employee shape for this page
type Emp = {
  id: string;
  firstName?: string;
  lastName?: string;
  niNumber?: string;
  payGroup?: string;
};

// SPBP schedule/result shapes
type SPBPScheduleItem = {
  weekStart: string; // ISO date for start of pay week
  amount?: number;
  note?: string;
};

type SPBPResult = {
  total: number;
  schedule: SPBPScheduleItem[];
  meta?: Record<string, unknown>;
};

// Stored record
type AbsenceRecord = {
  id: string;
  type: "parental-bereavement";
  employeeId: string;
  employeeName: string;
  bereavementDate: string; // ISO date of death of child
  startDate: string; // leave start ISO
  endDate: string; // leave end ISO
  childNameOrRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  spbp?: SPBPResult;
  _version: 1;
};

// Helpers
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

// Defensive SPBP loader using alias "@/lib/spbp"
async function tryCalculateSPBP(params: {
  employee: Emp;
  bereavementDate: string;
  leaveStart: string;
  leaveEnd: string;
}) {
  try {
    const mod: any = await import("@/lib/spbp");
    const fn =
      mod.calculateSPBP ||
      mod.computeSPBP ||
      mod.getSPBPSchedule ||
      mod.buildSPBPSchedule;

    if (typeof fn !== "function") return null;

    const shapes = [
      // positional
      [params.employee, params.bereavementDate, params.leaveStart, params.leaveEnd],
      // named common
      [
        {
          employee: params.employee,
          bereavementDate: params.bereavementDate,
          startDate: params.leaveStart,
          endDate: params.leaveEnd,
        },
      ],
      // alt keys
      [
        {
          employee: params.employee,
          referenceDate: params.bereavementDate,
          leaveStart: params.leaveStart,
          leaveEnd: params.leaveEnd,
        },
      ],
    ];

    for (const args of shapes) {
      try {
        const out = await fn(...(Array.isArray(args) ? args : [args]));
        if (!out) continue;

        if (typeof out.total === "number" && Array.isArray(out.schedule)) {
          return {
            total: out.total,
            schedule: out.schedule as SPBPScheduleItem[],
            meta: out.meta ?? {},
          } as SPBPResult;
        }
        if (Array.isArray(out)) {
          const schedule = out as SPBPScheduleItem[];
          const total = schedule.reduce((sum, w) => sum + (w.amount || 0), 0);
          return { total, schedule };
        }
        if (out && Array.isArray(out.weeks) && typeof out.amount === "number") {
          return { total: out.amount, schedule: out.weeks, meta: { source: "spbp.weeks+amount" } };
        }
      } catch {
        // try next shape
      }
    }
  } catch {
    // module missing in this build; page still saves the absence
  }
  return null;
}

export default function NewParentalBereavementAbsencePage() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [bereavementDate, setBereavementDate] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [childNameOrRef, setChildNameOrRef] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    ensureStoreReady();
    setHydrated(true);
  }, []);

  // resolve employee for name
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
    setBereavementDate("");
    setLeaveStart("");
    setLeaveEnd("");
    setChildNameOrRef("");
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
    if (!isValidDateStr(bereavementDate)) {
      setError("Enter a valid bereavement date.");
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
      type: "parental-bereavement",
      employeeId: emp.id,
      employeeName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
      bereavementDate: isoDate(bereavementDate),
      startDate: isoDate(leaveStart),
      endDate: isoDate(leaveEnd),
      childNameOrRef: childNameOrRef?.trim() || undefined,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _version: 1,
    };

    setSaving(true);
    try {
      const spbp = await tryCalculateSPBP({
        employee: emp,
        bereavementDate: record.bereavementDate,
        leaveStart: record.startDate,
        leaveEnd: record.endDate,
      });
      if (spbp) record.spbp = spbp;

      const current = (nsReadAbsences() as AbsenceRecord[]) ?? [];
      nsWriteAbsences([record, ...current]);

      setInfo(
        spbp
          ? `Saved. SPBP total £${spbp.total.toFixed(2)} with ${spbp.schedule.length} weeks.`
          : "Saved. SPBP schedule not available in this build."
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
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Record Parental Bereavement Absence</h1>
      <p className="text-sm text-gray-600 mb-6">
        Enter the bereavement and leave dates. Saves to localStorage and updates Absence stats.
      </p>

      <form onSubmit={onSave} className="grid gap-4">
        <EmployeePicker value={employeeId} onChange={setEmployeeId} required allowClear />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label htmlFor="bereavementDate" className="text-sm font-medium">
              Bereavement date
            </label>
            <input
              id="bereavementDate"
              type="date"
              value={bereavementDate}
              onChange={(e) => setBereavementDate(e.target.value)}
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
        </div>

        <div className="grid gap-2">
          <label htmlFor="childNameOrRef" className="text-sm font-medium">
            Child name or reference
          </label>
          <input
            id="childNameOrRef"
            type="text"
            value={childNameOrRef}
            onChange={(e) => setChildNameOrRef(e.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="Optional"
          />
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
    bereavementDate,
    startDate: leaveStart,
    endDate: leaveEnd,
    childNameOrRef: childNameOrRef || undefined,
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

