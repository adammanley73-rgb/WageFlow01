"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EmployeePicker from "@/app/components/employees/EmployeePicker";
import {
  ensureStoreReady,
  readAbsences,
  writeAbsences,
  readEmployees,
} from "@/lib/storeVersion";
// Static import to avoid editor/bundler drama
import * as SAP from "@/lib/sap";

/* utils */
function uid() {
  return "abs_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function isoDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isValidDateStr(s?: string) {
  if (!s) return false;
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

/* SAP adapter: tolerate different API shapes in lib/sap.ts */
async function tryCalculateSAP(params: {
  employee: any; // keep loose here to avoid type import issues
  startDate: string;
  placementDate?: string;
}) {
  try {
    const fn =
      // prefer explicit calculators, then schedule builders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((SAP as any).calculateSAP ||
        (SAP as any).computeSAP ||
        (SAP as any).getSAPSchedule ||
        (SAP as any).buildSAPSchedule) as
        | ((...args: any[]) => any)
        | undefined;

    if (typeof fn !== "function") return null;

    const shapes: any[] = [
      [params.employee, params.startDate, params.placementDate],
      [{ employee: params.employee, startDate: params.startDate, placementDate: params.placementDate }],
      [{ employee: params.employee, start: params.startDate, placement: params.placementDate }],
      [params],
    ];

    for (const args of shapes) {
      try {
        const out = Array.isArray(args) ? await fn(...args) : await fn(args);
        if (!out) continue;

        // Normalise to { total, schedule[] }
        if (Array.isArray(out)) {
          const total = out.reduce((s: number, w: any) => s + Number(w?.amount ?? w?.value ?? 0), 0);
          return { schedule: out, total: Math.round(total * 100) / 100 };
        }
        if (out?.schedule && Array.isArray(out.schedule)) {
          const total =
            typeof out.total === "number"
              ? out.total
              : out.schedule.reduce((s: number, w: any) => s + Number(w?.amount ?? w?.value ?? 0), 0);
          return { schedule: out.schedule, total: Math.round(total * 100) / 100 };
        }
        if (out?.weeks && Array.isArray(out.weeks)) {
          const total = out.weeks.reduce((s: number, w: any) => s + Number(w?.amount ?? w?.value ?? 0), 0);
          return { schedule: out.weeks, total: Math.round(total * 100) / 100 };
        }
      } catch {
        // keep trying
      }
    }
  } catch {
    // engines missing is acceptable in demo
  }
  return null;
}

export default function NewAdoptionAbsencePage() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // form state
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [placementDate, setPlacementDate] = useState("");
  const [notes, setNotes] = useState("");

  /* storage readiness */
  useEffect(() => {
    ensureStoreReady();
    setHydrated(true);
  }, []);

  /* resolve employee */
  const employee = useMemo(() => {
    try {
      const list = readEmployees();
      return list.find((e) => e.id === employeeId);
    } catch {
      return undefined;
    }
  }, [employeeId]);

  function resetForm() {
    setEmployeeId("");
    setStartDate("");
    setPlacementDate("");
    setNotes("");
    setError(null);
    setInfo(null);
  }

  function validate(): string | null {
    if (!employeeId) return "Select an employee.";
    if (!startDate || !isValidDateStr(startDate)) return "Enter a valid start date.";
    if (placementDate && !isValidDateStr(placementDate)) return "Enter a valid placement date.";
    return null;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    try {
      const record: any = {
        id: uid(),
        type: "adoption",
        employeeId,
        employeeName: employee ? [employee.firstName, employee.lastName].filter(Boolean).join(" ") : "",
        startDate: isoDate(startDate),
        placementDate: placementDate ? isoDate(placementDate) : undefined,
        notes: notes?.trim() || undefined,
      };

      if (employee) {
        const sap = await tryCalculateSAP({
          employee,
          startDate: isoDate(startDate),
          placementDate: placementDate ? isoDate(placementDate) : undefined,
        });
        if (sap) {
          record.sap = { total: sap.total, schedule: sap.schedule };
        }
      }

      const current = readAbsences();
      writeAbsences([record, ...current]);

      setInfo(
        record.sap
          ? `Saved. SAP total £${Number(record.sap.total).toFixed(2)} with ${record.sap.schedule.length} weekly entries.`
          : "Saved. SAP schedule not available in this build."
      );

      resetForm();
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
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Record New Adoption Absence</h1>
      <p className="text-sm text-gray-600 mb-6">
        Create an adoption absence. Schedule is computed client side when statutory engines are present.
      </p>

      <form onSubmit={onSave} className="grid gap-5">
        {/* Employee */}
        <div className="grid gap-3 border rounded-md p-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Employee</label>
            <EmployeePicker value={employeeId} onChange={setEmployeeId} />
            <div className="text-xs text-gray-500">Picker reads from local demo storage.</div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid gap-3 border rounded-md p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-1">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-md px-3 py-2"
                required
              />
            </div>

            <div className="grid gap-1">
              <label htmlFor="placementDate" className="text-sm font-medium">
                Placement date
              </label>
              <input
                id="placementDate"
                type="date"
                value={placementDate}
                onChange={(e) => setPlacementDate(e.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="Optional"
              />
              <div className="text-xs text-gray-500">Optional. Used by some SAP engines.</div>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Employee name</label>
              <div className="h-[38px] flex items-center px-3 border rounded-md bg-gray-50">
                {employee ? [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "—" : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="grid gap-3 border rounded-md p-3">
          <div className="grid gap-1">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border rounded-md px-3 py-2"
              rows={3}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Actions */}
        {error && <div className="px-3 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}
        {info && <div className="px-3 py-2 rounded-md bg-green-50 text-green-700 text-sm">{info}</div>}

        <div className="flex flex-wrap gap-3 pt-1">
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
        </div>

        {/* Preview */}
        <details className="mt-2 border rounded-md p-3">
          <summary className="cursor-pointer text-sm font-medium">Preview payload</summary>
          <pre className="text-xs overflow-auto mt-2">
{JSON.stringify(
  {
    type: "adoption",
    employeeId,
    employeeName: employee ? [employee.firstName, employee.lastName].filter(Boolean).join(" ") : "",
    startDate,
    placementDate: placementDate || undefined,
    notes: notes || undefined,
  },
  null,
  2
)}
          </pre>
        </details>
      </form>
    </div>
  );
}
