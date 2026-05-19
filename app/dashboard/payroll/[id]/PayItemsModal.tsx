// C:\Projects\wageflow01\app\dashboard\payroll\[id]\PayItemsModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatMoney, formatMoneyInput } from "@/lib/formatMoney";

type CalculationKind = "manual_amount" | "rate_units";

type EmployeeRowLite = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  contractNumber?: string;
  contractJobTitle?: string;
};

type PayRateContext = {
  contractId: string | null;
  payBasis: string | null;
  annualSalary: number | null;
  hourlyRate: number | null;
  hoursPerWeek: number | null;
  baseHourlyRate: number | null;
  baseHourlyRateSource: string | null;
};

type PayItem = {
  id: string;
  code: string;
  name: string;
  amount: number;
  calculation_kind?: CalculationKind | string | null;
  units?: number | null;
  base_rate?: number | null;
  rate_multiplier?: number | null;
  calculated_rate?: number | null;
  manual_override?: boolean | null;
  override_reason?: string | null;
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
  calculation_kind?: CalculationKind | string | null;
  rate_multiplier?: number | null;
  unit_label?: string | null;
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
  contract_id?: string | null;
  payRate?: PayRateContext;
  canEdit?: boolean;
  availableTypes?: AvailableType[];
  items?: PayItem[];
  error?: string;
};

type EditableDraftItem = {
  code: string;
  amount: string;
  units: string;
  base_rate: string;
  manual_override: boolean;
  override_reason: string;
  description_override: string;
};

type Props = {
  runId: string;
  rows: EmployeeRowLite[];
  initialPayrollRunEmployeeId?: string | null;
  initialEmployeeId?: string | null;
  isOpen: boolean;
  canEditRun: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
};

const WF_BLUE = "var(--wf-blue)";
const WF_GREEN = "#059669";
const MISSING = "Not set";

function toNumberSafe(value: string | number | null | undefined): number {
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function positiveOrZero(value: string | number | null | undefined): number {
  const n = toNumberSafe(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round4(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

function formatDecimalInput(value: number | null | undefined, dp = 4): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Number(n.toFixed(dp)));
}

function normaliseCalculationKind(value: unknown): CalculationKind {
  return String(value ?? "").trim() === "rate_units" ? "rate_units" : "manual_amount";
}

function sourceLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Not available";

  if (raw === "hourly_rate") return "Hourly rate";
  if (raw === "stored_salary_equivalent_hourly_rate") return "Stored salary equivalent hourly rate";
  if (raw === "derived_from_annual_salary_and_hours_per_week") {
    return "Derived from annual salary and weekly hours";
  }

  return raw.replace(/_/g, " ");
}

function buildEditableDraft(items: PayItem[]): EditableDraftItem[] {
  return items
    .filter((item) => !item.is_basic)
    .map((item) => {
      const calculationKind = normaliseCalculationKind(item.calculation_kind);
      const manualOverride = item.manual_override === true;

      return {
        code: item.code,
        amount:
          calculationKind === "manual_amount" && item.amount > 0
            ? formatMoneyInput(item.amount)
            : "",
        units:
          calculationKind === "rate_units"
            ? formatDecimalInput(item.units, 4)
            : "",
        base_rate:
          calculationKind === "rate_units" && manualOverride
            ? formatDecimalInput(item.base_rate, 4)
            : "",
        manual_override: calculationKind === "rate_units" ? manualOverride : false,
        override_reason:
          calculationKind === "rate_units" && manualOverride ? item.override_reason ?? "" : "",
        description_override: item.description_override ?? "",
      };
    });
}

function emptyDraftItem(defaultCode = ""): EditableDraftItem {
  return {
    code: defaultCode,
    amount: "",
    units: "",
    base_rate: "",
    manual_override: false,
    override_reason: "",
    description_override: "",
  };
}

export default function PayItemsModal(props: Props) {
  const {
    runId,
    rows,
    initialPayrollRunEmployeeId,
    initialEmployeeId,
    isOpen,
    canEditRun,
    onClose,
    onSaved,
  } = props;

  const resolvedInitialPayrollRunEmployeeId =
    initialPayrollRunEmployeeId ?? initialEmployeeId ?? null;

  const [activePayrollRunEmployeeId, setActivePayrollRunEmployeeId] = useState<string | null>(
    resolvedInitialPayrollRunEmployeeId
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [employeeName, setEmployeeName] = useState<string>(MISSING);
  const [employeeNumber, setEmployeeNumber] = useState<string>(MISSING);
  const [payRate, setPayRate] = useState<PayRateContext | null>(null);
  const [availableTypes, setAvailableTypes] = useState<AvailableType[]>([]);
  const [basicItems, setBasicItems] = useState<PayItem[]>([]);
  const [draftItems, setDraftItems] = useState<EditableDraftItem[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActivePayrollRunEmployeeId(resolvedInitialPayrollRunEmployeeId);
  }, [isOpen, resolvedInitialPayrollRunEmployeeId]);

  const availableTypeByCode = useMemo(() => {
    const out = new Map<string, AvailableType>();
    for (const type of availableTypes) {
      out.set(String(type.code ?? "").trim().toUpperCase(), type);
    }
    return out;
  }, [availableTypes]);

  const rowIndex = useMemo(() => {
    if (!activePayrollRunEmployeeId) return -1;
    return rows.findIndex((row) => row.id === activePayrollRunEmployeeId);
  }, [rows, activePayrollRunEmployeeId]);

  const hasPrev = rowIndex > 0;
  const hasNext = rowIndex >= 0 && rowIndex < rows.length - 1;
  const activeRow = rowIndex >= 0 ? rows[rowIndex] : null;

  const displayEmployeeName = employeeName || activeRow?.employeeName || MISSING;
  const displayEmployeeNumber = employeeNumber || activeRow?.employeeNumber || MISSING;
  const displayContractNumber = String(activeRow?.contractNumber ?? "").trim() || MISSING;
  const displayContractJobTitle = String(activeRow?.contractJobTitle ?? "").trim() || MISSING;
  const baseHourlyRate = payRate?.baseHourlyRate ?? null;

  function getTypeForDraft(item: EditableDraftItem): AvailableType | null {
    return availableTypeByCode.get(String(item.code ?? "").trim().toUpperCase()) ?? null;
  }

  function isRateBasedDraft(item: EditableDraftItem): boolean {
    return normaliseCalculationKind(getTypeForDraft(item)?.calculation_kind) === "rate_units";
  }

  function getMultiplierForDraft(item: EditableDraftItem): number {
    const type = getTypeForDraft(item);
    const multiplier = toNumberSafe(type?.rate_multiplier ?? 0);
    return multiplier > 0 ? multiplier : 0;
  }

  function getBaseRateForDraft(item: EditableDraftItem): number {
    if (!isRateBasedDraft(item)) return 0;

    if (item.manual_override) {
      return positiveOrZero(item.base_rate);
    }

    return positiveOrZero(baseHourlyRate ?? 0);
  }

  function getCalculatedRateForDraft(item: EditableDraftItem): number {
    const base = getBaseRateForDraft(item);
    const multiplier = getMultiplierForDraft(item);
    return base > 0 && multiplier > 0 ? round4(base * multiplier) : 0;
  }

  function getCalculatedAmountForDraft(item: EditableDraftItem): number {
    if (!isRateBasedDraft(item)) {
      return round2(positiveOrZero(item.amount));
    }

    const units = positiveOrZero(item.units);
    const calculatedRate = getCalculatedRateForDraft(item);

    return units > 0 && calculatedRate > 0 ? round2(units * calculatedRate) : 0;
  }

  async function loadRow(payrollRunEmployeeId: string) {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/payroll/${runId}/elements/${payrollRunEmployeeId}`, {
        cache: "no-store",
      });

      const json: LoadResponse = await res
        .json()
        .catch(() => ({ ok: false, error: "Failed to load pay items" }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed to load pay items (${res.status})`);
      }

      const types = Array.isArray(json.availableTypes) ? json.availableTypes : [];
      const items = Array.isArray(json.items) ? json.items : [];
      const basic = items.filter((item) => item.is_basic);
      const editableDraft = buildEditableDraft(items);

      setEmployeeName(String(json.employee?.employeeName ?? activeRow?.employeeName ?? MISSING));
      setEmployeeNumber(
        String(json.employee?.employeeNumber ?? activeRow?.employeeNumber ?? MISSING)
      );
      setPayRate(json.payRate ?? null);
      setAvailableTypes(types);
      setBasicItems(basic);
      setDraftItems(editableDraft);
      setDirty(false);
    } catch (error: any) {
      setErr(error?.message || "Failed to load pay items");
      setPayRate(null);
      setAvailableTypes([]);
      setBasicItems([]);
      setDraftItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !activePayrollRunEmployeeId) return;
    loadRow(activePayrollRunEmployeeId);
  }, [isOpen, activePayrollRunEmployeeId, runId]);

  function updateDraftItem(index: number, patch: Partial<EditableDraftItem>) {
    setDraftItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const next = { ...item, ...patch };
        const type = availableTypeByCode.get(String(next.code ?? "").trim().toUpperCase());
        const nextKind = normaliseCalculationKind(type?.calculation_kind);

        if (patch.code !== undefined) {
          if (nextKind === "rate_units") {
            next.amount = "";
          } else {
            next.units = "";
            next.base_rate = "";
            next.manual_override = false;
            next.override_reason = "";
          }
        }

        if (patch.manual_override === false) {
          next.base_rate = "";
          next.override_reason = "";
        }

        return next;
      })
    );
    setDirty(true);
  }

  function addDraftItem() {
    const usedCodes = new Set(draftItems.map((item) => item.code));
    const firstUnused = availableTypes.find((type) => !usedCodes.has(type.code));
    const firstCode = firstUnused?.code ?? availableTypes[0]?.code ?? "";

    setDraftItems((prev) => [...prev, emptyDraftItem(firstCode)]);
    setDirty(true);
  }

  function removeDraftItem(index: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function saveCurrentRow() {
    if (!activePayrollRunEmployeeId) return false;

    setSaving(true);
    setErr(null);

    try {
      const normalised = draftItems.map((item) => {
        const type = getTypeForDraft(item);
        const calculationKind = normaliseCalculationKind(type?.calculation_kind);

        if (calculationKind === "rate_units") {
          return {
            code: String(item.code || "").trim(),
            calculation_kind: "rate_units" as const,
            units: positiveOrZero(item.units),
            base_rate: item.manual_override ? positiveOrZero(item.base_rate) : baseHourlyRate,
            rate_multiplier: positiveOrZero(type?.rate_multiplier ?? 0),
            calculated_rate: getCalculatedRateForDraft(item),
            amount: getCalculatedAmountForDraft(item),
            manual_override: item.manual_override === true,
            override_reason: String(item.override_reason || "").trim(),
            description_override: String(item.description_override || "").trim(),
          };
        }

        return {
          code: String(item.code || "").trim(),
          calculation_kind: "manual_amount" as const,
          units: null,
          base_rate: null,
          rate_multiplier: null,
          calculated_rate: null,
          amount: positiveOrZero(item.amount),
          manual_override: false,
          override_reason: "",
          description_override: String(item.description_override || "").trim(),
        };
      });

      const populated = normalised.filter((item) => {
        if (item.calculation_kind === "rate_units") {
          return (
            item.code ||
            Number(item.units ?? 0) > 0 ||
            Number(item.amount ?? 0) > 0 ||
            item.description_override
          );
        }

        return item.code || item.amount > 0 || item.description_override;
      });

      for (let i = 0; i < populated.length; i++) {
        const item = populated[i];
        const rowNumber = i + 1;

        if (!item.code) {
          throw new Error(`Select a pay item type on row ${rowNumber}.`);
        }

        if (item.calculation_kind === "rate_units") {
          if (!(Number(item.units) > 0)) {
            throw new Error(`Enter hours greater than 0 on row ${rowNumber}.`);
          }

          if (!(Number(item.base_rate) > 0)) {
            throw new Error(
              `Hourly rate is missing on row ${rowNumber}. Update the employee or contract payroll file first.`
            );
          }

          if (!(Number(item.rate_multiplier) > 0)) {
            throw new Error(`Rate multiplier is missing on row ${rowNumber}.`);
          }

          if (!(item.amount > 0)) {
            throw new Error(`Calculated amount must be greater than 0 on row ${rowNumber}.`);
          }

          if (item.manual_override && !item.override_reason) {
            throw new Error(`Enter an override reason on row ${rowNumber}.`);
          }

          continue;
        }

        if (!(item.amount > 0)) {
          throw new Error(`Enter an amount greater than 0 on row ${rowNumber}.`);
        }
      }

      const payload = {
        items: populated.map((item) => ({
          code: item.code,
          amount: item.amount,
          calculation_kind: item.calculation_kind,
          units: item.units,
          base_rate: item.base_rate,
          rate_multiplier: item.rate_multiplier,
          calculated_rate: item.calculated_rate,
          manual_override: item.manual_override,
          override_reason: item.manual_override ? item.override_reason || null : null,
          description_override: item.description_override || null,
        })),
      };

      const res = await fetch(`/api/payroll/${runId}/elements/${activePayrollRunEmployeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res
        .json()
        .catch(() => ({ ok: false, error: "Failed to save pay items" }));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to save pay items (${res.status})`);
      }

      if (onSaved) {
        await onSaved();
      }

      setDirty(false);
      await loadRow(activePayrollRunEmployeeId);
      return true;
    } catch (error: any) {
      setErr(error?.message || "Failed to save pay items");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function moveToRow(direction: -1 | 1, saveFirst: boolean) {
    const targetIndex = rowIndex + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    if (dirty && !saveFirst) {
      const proceed = window.confirm(
        "You have unsaved pay item changes. Continue without saving?"
      );
      if (!proceed) return;
    }

    if (saveFirst) {
      const ok = await saveCurrentRow();
      if (!ok) return;
    }

    setActivePayrollRunEmployeeId(rows[targetIndex].id);
  }

  async function handleClose() {
    if (dirty) {
      const proceed = window.confirm(
        "You have unsaved pay item changes. Close without saving?"
      );
      if (!proceed) return;
    }
    onClose();
  }

  if (!isOpen || !activePayrollRunEmployeeId) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <div className="w-full max-w-6xl rounded-3xl bg-white shadow-xl ring-1 ring-neutral-300 overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-base font-extrabold text-slate-900">
                Edit pay items: {displayEmployeeName}
              </div>
              <div className="mt-1 text-sm text-slate-700">
                Employee number: {displayEmployeeNumber}
              </div>
              <div className="mt-1 text-sm text-slate-700">
                Contract number: {displayContractNumber}
              </div>
              <div className="mt-1 text-sm text-slate-700">
                Job title: {displayContractJobTitle}
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-600">
                BASIC pay is shown read-only. Rate-based items calculate from the employee or
                contract payroll file.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => moveToRow(-1, false)}
                disabled={!hasPrev || saving || loading}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: WF_BLUE,
                  opacity: !hasPrev || saving || loading ? 0.6 : 1,
                  cursor: !hasPrev || saving || loading ? "not-allowed" : "pointer",
                }}
              >
                Previous contract
              </button>

              <button
                type="button"
                onClick={() => moveToRow(1, false)}
                disabled={!hasNext || saving || loading}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: WF_BLUE,
                  opacity: !hasNext || saving || loading ? 0.6 : 1,
                  cursor: !hasNext || saving || loading ? "not-allowed" : "pointer",
                }}
              >
                Next contract
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
              This run is not editable. Pay items can only be changed while the run is Draft or
              Processing.
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-8 text-sm text-slate-700">
              Loading pay items...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="text-sm font-extrabold text-slate-900">
                  Rate source for this contract row
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Base hourly rate
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900">
                      {baseHourlyRate && baseHourlyRate > 0
                        ? `${formatMoney(baseHourlyRate)} per hour`
                        : "Missing"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Source
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {sourceLabel(payRate?.baseHourlyRateSource)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Pay basis
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {payRate?.payBasis || MISSING}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Weekly hours
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {payRate?.hoursPerWeek && payRate.hoursPerWeek > 0
                        ? String(payRate.hoursPerWeek)
                        : MISSING}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="bg-neutral-100 px-4 py-3 text-sm font-extrabold text-slate-900">
                  Current BASIC item
                </div>
                <div className="p-4">
                  {basicItems.length === 0 ? (
                    <div className="text-sm text-slate-700">
                      No BASIC item found for this contract row in this run.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {basicItems.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-3 md:grid-cols-[1.2fr_0.8fr_1fr]"
                        >
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Type
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {item.name}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Amount
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {formatMoney(item.amount)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Description
                            </div>
                            <div className="mt-1 text-sm text-slate-700">
                              {item.description_override || "Read-only"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="flex items-center justify-between gap-2 bg-neutral-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      Extra pay items
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-600">
                      Overtime uses hours, base rate, multiplier, and calculated amount.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addDraftItem}
                    disabled={!canEditRun || saving || availableTypes.length === 0}
                    className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                    style={{
                      backgroundColor: WF_GREEN,
                      opacity:
                        !canEditRun || saving || availableTypes.length === 0 ? 0.6 : 1,
                      cursor:
                        !canEditRun || saving || availableTypes.length === 0
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    Add item
                  </button>
                </div>

                <div className="p-4">
                  {availableTypes.length === 0 ? (
                    <div className="text-sm text-slate-700">
                      No editable extra pay item types are available for this company.
                    </div>
                  ) : draftItems.length === 0 ? (
                    <div className="text-sm text-slate-700">
                      No extra pay items added for this contract row.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {draftItems.map((item, index) => {
                        const type = getTypeForDraft(item);
                        const isRateBased = isRateBasedDraft(item);
                        const multiplier = getMultiplierForDraft(item);
                        const baseRate = getBaseRateForDraft(item);
                        const calculatedRate = getCalculatedRateForDraft(item);
                        const calculatedAmount = getCalculatedAmountForDraft(item);
                        const unitLabel = type?.unit_label || "hours";

                        return (
                          <div
                            key={`draft-${index}`}
                            className="rounded-xl border border-neutral-200 bg-white p-3"
                          >
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr_1fr_auto]">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  Type
                                </div>
                                <select
                                  value={item.code}
                                  onChange={(e) =>
                                    updateDraftItem(index, { code: e.target.value })
                                  }
                                  disabled={!canEditRun || saving}
                                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-offset-1"
                                >
                                  <option value="">Select pay item</option>
                                  {availableTypes.map((availableType) => (
                                    <option key={availableType.code} value={availableType.code}>
                                      {availableType.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {isRateBased ? (
                                <div>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    {unitLabel}
                                  </div>
                                  <input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    value={item.units}
                                    onChange={(e) =>
                                      updateDraftItem(index, { units: e.target.value })
                                    }
                                    disabled={!canEditRun || saving}
                                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-offset-1"
                                    placeholder="0"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Amount
                                  </div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.amount}
                                    onChange={(e) =>
                                      updateDraftItem(index, { amount: e.target.value })
                                    }
                                    disabled={!canEditRun || saving}
                                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-offset-1"
                                    placeholder="0.00"
                                  />
                                </div>
                              )}

                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  Description override
                                </div>
                                <input
                                  type="text"
                                  value={item.description_override}
                                  onChange={(e) =>
                                    updateDraftItem(index, {
                                      description_override: e.target.value,
                                    })
                                  }
                                  disabled={!canEditRun || saving}
                                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-offset-1"
                                  placeholder="Optional"
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
                                    cursor:
                                      !canEditRun || saving ? "not-allowed" : "pointer",
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            {isRateBased ? (
                              <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                      Base rate
                                    </div>
                                    <input
                                      type="number"
                                      step="0.0001"
                                      min="0"
                                      value={
                                        item.manual_override
                                          ? item.base_rate
                                          : baseRate > 0
                                            ? String(baseRate)
                                            : ""
                                      }
                                      onChange={(e) =>
                                        updateDraftItem(index, { base_rate: e.target.value })
                                      }
                                      disabled={!canEditRun || saving || !item.manual_override}
                                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-100"
                                      placeholder="Missing"
                                    />
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                      Multiplier
                                    </div>
                                    <div className="mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                                      {multiplier > 0 ? `x ${multiplier}` : "Missing"}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                      Calculated rate
                                    </div>
                                    <div className="mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                                      {calculatedRate > 0
                                        ? `${formatMoney(calculatedRate)} / hour`
                                        : "Missing"}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                      Total
                                    </div>
                                    <div className="mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-900">
                                      {calculatedAmount > 0 ? formatMoney(calculatedAmount) : "£0.00"}
                                    </div>
                                  </div>

                                  <div className="flex items-end">
                                    <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-800">
                                      <input
                                        type="checkbox"
                                        checked={item.manual_override}
                                        onChange={(e) =>
                                          updateDraftItem(index, {
                                            manual_override: e.target.checked,
                                          })
                                        }
                                        disabled={!canEditRun || saving}
                                        className="h-4 w-4"
                                      />
                                      Override rate
                                    </label>
                                  </div>
                                </div>

                                {item.manual_override ? (
                                  <div className="mt-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                      Override reason
                                    </div>
                                    <input
                                      type="text"
                                      value={item.override_reason}
                                      onChange={(e) =>
                                        updateDraftItem(index, {
                                          override_reason: e.target.value,
                                        })
                                      }
                                      disabled={!canEditRun || saving}
                                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-offset-1"
                                      placeholder="Required when overriding the calculated base rate"
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={saveCurrentRow}
                  disabled={!canEditRun || saving || loading || !dirty}
                  className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{
                    backgroundColor: WF_GREEN,
                    opacity: !canEditRun || saving || loading || !dirty ? 0.6 : 1,
                    cursor:
                      !canEditRun || saving || loading || !dirty
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save pay items"}
                </button>

                <button
                  type="button"
                  onClick={() => moveToRow(-1, true)}
                  disabled={!canEditRun || saving || loading || !hasPrev}
                  className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{
                    backgroundColor: WF_BLUE,
                    opacity:
                      !canEditRun || saving || loading || !hasPrev ? 0.6 : 1,
                    cursor:
                      !canEditRun || saving || loading || !hasPrev
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Save and previous
                </button>

                <button
                  type="button"
                  onClick={() => moveToRow(1, true)}
                  disabled={!canEditRun || saving || loading || !hasNext}
                  className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{
                    backgroundColor: WF_BLUE,
                    opacity:
                      !canEditRun || saving || loading || !hasNext ? 0.6 : 1,
                    cursor:
                      !canEditRun || saving || loading || !hasNext
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Save and next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}