// C:\Projects\wageflow01\app\dashboard\payroll\[id]\PayItemsModal.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";

type EmployeeRowLite = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
};

type PayItem = {
  id: string;
  code: string;
  name: string;
  amount: number;
  description_override: string | null;
  side: "earning" | "deduction";
  taxable_for_paye: boolean;
  nic_earnings: boolean;
  pensionable: boolean;
  ae_qualifying: boolean;
  is_basic: boolean;
  is_read_only: boolean;
};

type AvailableType = {
  code: string;
  name: string;
  side: "earning" | "deduction";
  taxable_for_paye: boolean;
  nic_earnings: boolean;
  pensionable: boolean;
  ae_qualifying: boolean;
};

type LoadResponse = {
  ok: boolean;
  run?: {
    id: string;
    status: string;
  };
  employee?: {
    id: string;
    employeeNumber: string;
    employeeName: string;
  };
  payroll_run_employee_id?: string;
  canEdit?: boolean;
  availableTypes?: AvailableType[];
  items?: PayItem[];
  error?: string;
};

type EditableDraftItem = {
  code: string;
  amount: string;
  description_override: string;
};

type Props = {
  runId: string;
  rows: EmployeeRowLite[];
  initialEmployeeId: string | null;
  isOpen: boolean;
  canEditRun: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
};

const WF_BLUE = "var(--wf-blue)";
const WF_GREEN = "#059669";
const MISSING = "—";

function toNumberSafe(value: string | number): number {
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function buildEditableDraft(items: PayItem[]): EditableDraftItem[] {
  return items
    .filter((item) => !item.is_basic)
    .map((item) => ({
      code: item.code,
      amount: item.amount > 0 ? item.amount.toFixed(2) : "",
      description_override: item.description_override ?? "",
    }));
}

function emptyDraftItem(defaultCode = ""): EditableDraftItem {
  return {
    code: defaultCode,
    amount: "",
    description_override: "",
  };
}

export default function PayItemsModal(props: Props) {
  const { runId, rows, initialEmployeeId, isOpen, canEditRun, onClose, onSaved } = props;

  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(initialEmployeeId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [employeeName, setEmployeeName] = useState<string>(MISSING);
  const [employeeNumber, setEmployeeNumber] = useState<string>(MISSING);
  const [availableTypes, setAvailableTypes] = useState<AvailableType[]>([]);
  const [basicItems, setBasicItems] = useState<PayItem[]>([]);
  const [draftItems, setDraftItems] = useState<EditableDraftItem[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveEmployeeId(initialEmployeeId);
  }, [isOpen, initialEmployeeId]);

  const employeeIndex = useMemo(() => {
    if (!activeEmployeeId) return -1;
    return rows.findIndex((row) => row.employeeId === activeEmployeeId);
  }, [rows, activeEmployeeId]);

  const hasPrev = employeeIndex > 0;
  const hasNext = employeeIndex >= 0 && employeeIndex < rows.length - 1;

  const activeRow = employeeIndex >= 0 ? rows[employeeIndex] : null;

  async function loadEmployee(employeeId: string) {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/payroll/${runId}/elements/${employeeId}`, {
        cache: "no-store",
      });

      const json: LoadResponse = await res.json().catch(() => ({ ok: false, error: "Failed to load pay items" }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed to load pay items (${res.status})`);
      }

      const types = Array.isArray(json.availableTypes) ? json.availableTypes : [];
      const items = Array.isArray(json.items) ? json.items : [];
      const basic = items.filter((item) => item.is_basic);
      const editableDraft = buildEditableDraft(items);

      setEmployeeName(String(json.employee?.employeeName ?? activeRow?.employeeName ?? MISSING));
      setEmployeeNumber(String(json.employee?.employeeNumber ?? activeRow?.employeeNumber ?? MISSING));
      setAvailableTypes(types);
      setBasicItems(basic);
      setDraftItems(editableDraft);
      setDirty(false);
    } catch (error: any) {
      setErr(error?.message || "Failed to load pay items");
      setAvailableTypes([]);
      setBasicItems([]);
      setDraftItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !activeEmployeeId) return;
    loadEmployee(activeEmployeeId);
  }, [isOpen, activeEmployeeId, runId]);

  function updateDraftItem(index: number, patch: Partial<EditableDraftItem>) {
    setDraftItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, ...patch };
      })
    );
    setDirty(true);
  }

  function addDraftItem() {
    const firstCode = availableTypes[0]?.code ?? "";
    setDraftItems((prev) => [...prev, emptyDraftItem(firstCode)]);
    setDirty(true);
  }

  function removeDraftItem(index: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function saveCurrentEmployee() {
    if (!activeEmployeeId) return false;

    setSaving(true);
    setErr(null);

    try {
      const normalised = draftItems.map((item) => ({
        code: String(item.code || "").trim(),
        amount: toNumberSafe(item.amount),
        description_override: String(item.description_override || "").trim(),
      }));

      const populated = normalised.filter(
        (item) => item.code || item.amount > 0 || item.description_override
      );

      for (let i = 0; i < populated.length; i++) {
        const item = populated[i];
        const rowNumber = i + 1;

        if (!item.code) {
          throw new Error(`Select a pay item type on row ${rowNumber}.`);
        }

        if (!(item.amount > 0)) {
          throw new Error(`Enter an amount greater than 0 on row ${rowNumber}.`);
        }
      }

      const payload = {
        items: populated.map((item) => ({
          code: item.code,
          amount: item.amount,
          description_override: item.description_override || null,
        })),
      };

      const res = await fetch(`/api/payroll/${runId}/elements/${activeEmployeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({ ok: false, error: "Failed to save pay items" }));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to save pay items (${res.status})`);
      }

      if (onSaved) {
        await onSaved();
      }

      setDirty(false);
      await loadEmployee(activeEmployeeId);
      return true;
    } catch (error: any) {
      setErr(error?.message || "Failed to save pay items");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function moveToEmployee(direction: -1 | 1, saveFirst: boolean) {
    const targetIndex = employeeIndex + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    if (dirty && !saveFirst) {
      const proceed = window.confirm("You have unsaved pay item changes. Continue without saving?");
      if (!proceed) return;
    }

    if (saveFirst) {
      const ok = await saveCurrentEmployee();
      if (!ok) return;
    }

    setActiveEmployeeId(rows[targetIndex].employeeId);
  }

  async function handleClose() {
    if (dirty) {
      const proceed = window.confirm("You have unsaved pay item changes. Close without saving?");
      if (!proceed) return;
    }
    onClose();
  }

  if (!isOpen || !activeEmployeeId) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-xl ring-1 ring-neutral-300 overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-base font-extrabold text-slate-900">
                Edit pay items: {employeeName}
              </div>
              <div className="mt-1 text-sm text-slate-700">
                Employee number: {employeeNumber || MISSING}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-600">
                Basic pay is shown read-only. Save pay items, then run calculation on the payroll page.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => moveToEmployee(-1, false)}
                disabled={!hasPrev || saving || loading}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: WF_BLUE,
                  opacity: !hasPrev || saving || loading ? 0.6 : 1,
                  cursor: !hasPrev || saving || loading ? "not-allowed" : "pointer",
                }}
              >
                Previous employee
              </button>

              <button
                type="button"
                onClick={() => moveToEmployee(1, false)}
                disabled={!hasNext || saving || loading}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: WF_BLUE,
                  opacity: !hasNext || saving || loading ? 0.6 : 1,
                  cursor: !hasNext || saving || loading ? "not-allowed" : "pointer",
                }}
              >
                Next employee
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: "#334155",
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {err ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {err}
            </div>
          ) : null}

          {!canEditRun ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              This run is not editable. Pay items can only be changed while the run is Draft or Processing.
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-8 text-sm text-slate-700">
              Loading pay items...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="bg-neutral-100 px-4 py-3 text-sm font-extrabold text-slate-900">
                  Current BASIC item
                </div>
                <div className="p-4">
                  {basicItems.length === 0 ? (
                    <div className="text-sm text-slate-700">No BASIC item found for this employee in this run.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {basicItems.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-3 md:grid-cols-[1.2fr_0.8fr_1fr]"
                        >
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{item.name}</div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">£{item.amount.toFixed(2)}</div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Description</div>
                            <div className="mt-1 text-sm text-slate-700">{item.description_override || "Read-only"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="flex items-center justify-between gap-2 bg-neutral-100 px-4 py-3">
                  <div className="text-sm font-extrabold text-slate-900">Extra pay items</div>

                  <button
                    type="button"
                    onClick={addDraftItem}
                    disabled={!canEditRun || saving || availableTypes.length === 0}
                    className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                    style={{
                      backgroundColor: WF_GREEN,
                      opacity: !canEditRun || saving || availableTypes.length === 0 ? 0.6 : 1,
                      cursor: !canEditRun || saving || availableTypes.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    Add item
                  </button>
                </div>

                <div className="p-4">
                  {draftItems.length === 0 ? (
                    <div className="text-sm text-slate-700">No extra pay items entered yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {draftItems.map((item, index) => (
                        <div
                          key={`${item.code || "blank"}-${index}`}
                          className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-3 md:grid-cols-[1.1fr_0.8fr_1.2fr_auto]"
                        >
                          <div>
                            <label className="block text-sm text-neutral-800">Type</label>
                            <select
                              value={item.code}
                              onChange={(e) => updateDraftItem(index, { code: e.target.value })}
                              disabled={!canEditRun || saving}
                              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                            >
                              <option value="">Select pay item</option>
                              {availableTypes.map((type) => (
                                <option key={type.code} value={type.code}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm text-neutral-800">Amount</label>
                            <input
                              value={item.amount}
                              onChange={(e) => updateDraftItem(index, { amount: e.target.value })}
                              disabled={!canEditRun || saving}
                              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                              inputMode="decimal"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-neutral-800">Description override (optional)</label>
                            <input
                              value={item.description_override}
                              onChange={(e) =>
                                updateDraftItem(index, { description_override: e.target.value })
                              }
                              disabled={!canEditRun || saving}
                              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                              placeholder="Optional description"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeDraftItem(index)}
                              disabled={!canEditRun || saving}
                              className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                              style={{
                                backgroundColor: "#991b1b",
                                opacity: !canEditRun || saving ? 0.6 : 1,
                                cursor: !canEditRun || saving ? "not-allowed" : "pointer",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 text-xs font-semibold text-slate-600">
                    Save the items here, then use Run calculation on the payroll run page to refresh gross, PAYE, NI, pension, and net.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-semibold text-slate-600">
              {dirty ? "Unsaved changes" : "No unsaved changes"}
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => saveCurrentEmployee()}
                disabled={!canEditRun || saving || loading}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: WF_BLUE,
                  opacity: !canEditRun || saving || loading ? 0.6 : 1,
                  cursor: !canEditRun || saving || loading ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                onClick={() => moveToEmployee(1, true)}
                disabled={!canEditRun || saving || loading || !hasNext}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: WF_GREEN,
                  opacity: !canEditRun || saving || loading || !hasNext ? 0.6 : 1,
                  cursor: !canEditRun || saving || loading || !hasNext ? "not-allowed" : "pointer",
                }}
              >
                Save & Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}