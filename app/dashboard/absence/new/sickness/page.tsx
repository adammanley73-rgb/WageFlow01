// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\sickness\page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";
import { formatUkDate } from "@/lib/formatUkDate";
import { createClient } from "@/lib/supabase/client";

const CARD = "rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6";

type EmployeeOption = {
  id: string;
  companyId: string;
  name: string;
  employeeNumber: string;
};

type ContractRow = {
  id?: string | null;
  employee_id?: string | null;
  contract_number?: string | null;
  job_title?: string | null;
  status?: string | null;
  start_date?: string | null;
  leave_date?: string | null;
  pay_after_leaving?: boolean | null;
  created_at?: string | null;
};

type ContractOption = {
  id: string;
  contractNumber: string;
  jobTitle: string;
  status: string;
  startDate: string;
  leaveDate: string;
  payAfterLeaving: boolean;
  createdAt: string;
};

type OverlapCheckResponse = {
  ok: boolean;
  code?: string;
  message?: string;
  conflicts?: {
    id: string;
    startDate: string;
    endDate: string;
  }[];
};

type CreateResponse = {
  ok: boolean;
  code?: string;
  message?: string;
};

type LocalValidationError = string | null;

function getContractSuffixNumber(contractNumber: string | null | undefined): number | null {
  const raw = String(contractNumber || "").trim();
  if (!raw) return null;
  const match = raw.match(/-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function toSortableTime(value: string | null | undefined): number {
  const raw = String(value || "").trim();
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
}

function sortContractsMainFirst(rows: ContractOption[]): ContractOption[] {
  return [...rows].sort((a, b) => {
    const aSuffix = getContractSuffixNumber(a.contractNumber);
    const bSuffix = getContractSuffixNumber(b.contractNumber);

    if (aSuffix !== null && bSuffix !== null && aSuffix !== bSuffix) {
      return aSuffix - bSuffix;
    }

    if (aSuffix !== null && bSuffix === null) return -1;
    if (aSuffix === null && bSuffix !== null) return 1;

    const aStart = toSortableTime(a.startDate);
    const bStart = toSortableTime(b.startDate);
    if (aStart !== bStart) return aStart - bStart;

    const aCreated = toSortableTime(a.createdAt);
    const bCreated = toSortableTime(b.createdAt);
    if (aCreated !== bCreated) return aCreated - bCreated;

    return String(a.contractNumber || "").localeCompare(String(b.contractNumber || ""));
  });
}

function formatContractStatus(value: string) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "active") return "Active";
  if (v === "inactive") return "Inactive";
  if (v === "leaver") return "Leaver";
  return value || "Unknown";
}

function contractPillClass(status: string) {
  const v = String(status || "").trim().toLowerCase();
  if (v === "active") {
    return "inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800";
  }
  if (v === "leaver") {
    return "inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900";
  }
  return "inline-flex items-center rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700";
}

export default function NewSicknessAbsencePage() {
  const router = useRouter();

  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeOption | null>(null);

  const [contractOptions, setContractOptions] = useState<ContractOption[]>([]);
  const [selectedContractIds, setSelectedContractIds] = useState<Record<string, boolean>>({});
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);

  const [firstDay, setFirstDay] = useState("");
  const [lastDayExpected, setLastDayExpected] = useState("");
  const [lastDayActual, setLastDayActual] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [localValidationError, setLocalValidationError] =
    useState<LocalValidationError>(null);

  const [overlapPreview, setOverlapPreview] = useState<string | null>(null);

  const selectedContractList = useMemo(
    () => contractOptions.filter((contract) => selectedContractIds[contract.id] === true),
    [contractOptions, selectedContractIds]
  );

  async function fetchEmployees(query: string) {
    if (!query.trim()) {
      setEmployeeOptions([]);
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError(null);

      const res = await fetch(
        `/api/employees/search?q=${encodeURIComponent(query)}`,
        { method: "GET" }
      );

      if (!res.ok) throw new Error("Search request failed");

      const data = await res.json();

      if (Array.isArray(data?.employees)) {
        setEmployeeOptions(data.employees);
      } else {
        setEmployeeOptions([]);
      }
    } catch (err) {
      console.error("Employee search error:", err);
      setSearchError("Could not search employees.");
      setEmployeeOptions([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function fetchContractsForEmployee(employee: EmployeeOption) {
    const employeeId = String(employee?.id ?? "").trim();
    const companyId = String(employee?.companyId ?? "").trim();

    if (!employeeId || !companyId) {
      setContractOptions([]);
      setSelectedContractIds({});
      setContractsError(null);
      return;
    }

    try {
      setContractsLoading(true);
      setContractsError(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_contracts")
        .select(
          [
            "id",
            "employee_id",
            "contract_number",
            "job_title",
            "status",
            "start_date",
            "leave_date",
            "pay_after_leaving",
            "created_at",
          ].join(",")
        )
        .eq("company_id", companyId)
        .eq("employee_id", employeeId);

      if (error) {
        throw error;
      }

      const rows = (Array.isArray(data) ? data : []) as ContractRow[];

      const mapped = sortContractsMainFirst(
        rows
          .filter((row) => String(row?.id ?? "").trim())
          .map((row) => ({
            id: String(row.id ?? "").trim(),
            contractNumber: String(row.contract_number ?? "").trim() || "Unnamed contract",
            jobTitle: String(row.job_title ?? "").trim(),
            status: String(row.status ?? "active").trim().toLowerCase() || "active",
            startDate: String(row.start_date ?? "").trim(),
            leaveDate: String(row.leave_date ?? "").trim(),
            payAfterLeaving: row.pay_after_leaving === true,
            createdAt: String(row.created_at ?? "").trim(),
          }))
      );

      setContractOptions(mapped);

      const defaultSelected = mapped.reduce<Record<string, boolean>>((acc, contract) => {
        const status = String(contract.status || "").trim().toLowerCase();
        if (status === "active" || status === "leaver") {
          acc[contract.id] = true;
        }
        return acc;
      }, {});

      setSelectedContractIds(defaultSelected);
    } catch (err) {
      console.error("Employee contracts load error:", err);
      setContractOptions([]);
      setSelectedContractIds({});
      setContractsError("Could not load contracts for the selected employee.");
    } finally {
      setContractsLoading(false);
    }
  }

  function handleEmployeeInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEmployeeQuery(value);
    setSelectedEmployee(null);
    setContractOptions([]);
    setSelectedContractIds({});
    setContractsError(null);
    setOverlapPreview(null);
  }

  useEffect(() => {
    if (!employeeQuery.trim()) {
      setEmployeeOptions([]);
      return;
    }

    const handle = setTimeout(() => {
      fetchEmployees(employeeQuery);
    }, 250);

    return () => clearTimeout(handle);
  }, [employeeQuery]);

  function handleEmployeeSelect(option: EmployeeOption) {
    setSelectedEmployee(option);
    setEmployeeQuery(
      option.employeeNumber
        ? `${option.name} (${option.employeeNumber})`
        : option.name
    );
    setShowEmployeeDropdown(false);
    setOverlapPreview(null);
  }

  function toggleContract(contractId: string) {
    setSelectedContractIds((current) => ({
      ...current,
      [contractId]: !current[contractId],
    }));
  }

  function toggleAllContracts(nextValue: boolean) {
    const nextState = contractOptions.reduce<Record<string, boolean>>((acc, contract) => {
      acc[contract.id] = nextValue;
      return acc;
    }, {});

    setSelectedContractIds(nextState);
  }

  useEffect(() => {
    if (!selectedEmployee) {
      setContractOptions([]);
      setSelectedContractIds({});
      setContractsError(null);
      return;
    }

    fetchContractsForEmployee(selectedEmployee);
  }, [selectedEmployee]);

  useEffect(() => {
    const employeeId = selectedEmployee?.id;

    if (!employeeId || !firstDay) {
      setOverlapPreview(null);
      return;
    }

    const controller = new AbortController();

    async function runOverlapCheck() {
      try {
        const res = await fetch("/api/absence/check-overlap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employeeId,
            first_day: firstDay,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          console.error("Overlap check HTTP error:", res.status);
          setOverlapPreview(null);
          return;
        }

        const data: OverlapCheckResponse = await res.json();

        if (data && data.code === "ABSENCE_DATE_OVERLAP" && data.conflicts) {
          const firstConflict = data.conflicts[0];
          if (firstConflict) {
            const startUk = formatUkDate(
              firstConflict.startDate,
              firstConflict.startDate
            );
            const endUk = formatUkDate(
              firstConflict.endDate,
              firstConflict.endDate
            );

            setOverlapPreview(
              `This sickness would overlap another absence from ${startUk} to ${endUk}.`
            );
          } else {
            setOverlapPreview(
              data.message || "This sickness would overlap another absence."
            );
          }
        } else {
          setOverlapPreview(null);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Overlap preview error:", err);
        setOverlapPreview(null);
      }
    }

    runOverlapCheck();

    return () => {
      controller.abort();
    };
  }, [selectedEmployee?.id, firstDay]);

  function validateForm(): boolean {
    if (!selectedEmployee) {
      setLocalValidationError("Select an employee for this sickness record.");
      return false;
    }

    if (!firstDay) {
      setLocalValidationError("First day of sickness is required.");
      return false;
    }

    if (!lastDayExpected) {
      setLocalValidationError("Expected last day of sickness is required.");
      return false;
    }

    if (lastDayExpected < firstDay) {
      setLocalValidationError(
        "Expected last day cannot be earlier than the first day."
      );
      return false;
    }

    if (lastDayActual && lastDayActual < firstDay) {
      setLocalValidationError(
        "Actual last day cannot be earlier than the first day."
      );
      return false;
    }

    if (contractOptions.length > 0 && selectedContractList.length === 0) {
      setLocalValidationError(
        "Select at least one contract affected by this sickness absence."
      );
      return false;
    }

    setLocalValidationError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaveError(null);

    const valid = validateForm();
    if (!valid) return;

    if (!selectedEmployee) {
      setLocalValidationError("Select an employee for this sickness record.");
      return;
    }

    try {
      setSaving(true);

      const chosenContractIds = selectedContractList.map((contract) => contract.id);

      const payload = {
        employee_id: selectedEmployee.id,
        first_day: firstDay,
        last_day_expected: lastDayExpected,
        last_day_actual: lastDayActual || null,
        reference_notes: referenceNotes || null,
        selected_contract_ids: chosenContractIds,
      };

      const res = await fetch("/api/absence/sickness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: CreateResponse | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data || data.ok === false) {
        const message =
          data?.message ||
          "Could not create sickness absence. Please check the details and try again.";
        setSaveError(message);
        setSaving(false);
        return;
      }

      router.push("/dashboard/absence/list");
    } catch (err) {
      console.error("Error creating sickness absence:", err);
      setSaveError("Unexpected error while saving this sickness absence.");
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push("/dashboard/absence/new");
  }

  return (
    <PageTemplate
      title="Sickness absence"
      currentSection="absence"
      headerMode="wizard"
      backHref="/dashboard/absence/new"
      backLabel="Back"
    >
      <div className="flex flex-col gap-4">
        <div className={CARD}>
          <div className="text-sm text-neutral-700">
            Record a sickness absence. These dates will drive SSP and sickness
            pay calculations for the employee.
          </div>

          {overlapPreview && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {overlapPreview}
            </div>
          )}

          {localValidationError && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {localValidationError}
            </div>
          )}

          {saveError && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {saveError}
            </div>
          )}

          {searchError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {searchError}
            </div>
          )}

          {contractsError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {contractsError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-neutral-900">
                Employee details
              </h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Employee
                </label>

                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                    type="text"
                    placeholder="Start typing a name or employee number"
                    value={employeeQuery}
                    onChange={handleEmployeeInputChange}
                    onFocus={() => setShowEmployeeDropdown(true)}
                    onBlur={() =>
                      setTimeout(() => setShowEmployeeDropdown(false), 150)
                    }
                  />

                  {showEmployeeDropdown && employeeOptions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
                      {employeeOptions.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-2 text-sm text-left hover:bg-neutral-100"
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            handleEmployeeSelect(emp);
                          }}
                        >
                          <span className="font-medium">{emp.name}</span>
                          <span className="ml-2 text-xs text-neutral-500">
                            {emp.employeeNumber}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedEmployee && (
                  <p className="mt-2 text-xs text-neutral-600">
                    Selected: {selectedEmployee.name} (
                    {selectedEmployee.employeeNumber})
                  </p>
                )}

                {searchLoading && (
                  <p className="mt-2 text-xs text-neutral-500">Searching…</p>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    Affected contracts
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Tick every contract that should receive the sickness absence deduction.
                  </p>
                </div>

                {contractOptions.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAllContracts(true)}
                      className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllContracts(false)}
                      className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {!selectedEmployee && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                  Select an employee first to load their contracts.
                </div>
              )}

              {selectedEmployee && contractsLoading && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                  Loading contracts…
                </div>
              )}

              {selectedEmployee && !contractsLoading && contractOptions.length == 0 && !contractsError && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                  No contracts were found for this employee.
                </div>
              )}

              {contractOptions.length > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {contractOptions.map((contract) => {
                    const checked = selectedContractIds[contract.id] === true;
                    const startLabel = contract.startDate
                      ? formatUkDate(contract.startDate, contract.startDate)
                      : "No start date";
                    const leaveLabel = contract.leaveDate
                      ? formatUkDate(contract.leaveDate, contract.leaveDate)
                      : "";

                    return (
                      <label
                        key={contract.id}
                        className={`flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition ${
                          checked
                            ? "border-blue-600 bg-blue-50/60"
                            : "border-neutral-300 bg-white hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleContract(contract.id)}
                            className="mt-1 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-600"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-neutral-900">
                                {contract.contractNumber}
                              </div>
                              <span className={contractPillClass(contract.status)}>
                                {formatContractStatus(contract.status)}
                              </span>
                              {contract.payAfterLeaving && (
                                <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                                  Pay after leaving
                                </span>
                              )}
                            </div>

                            {contract.jobTitle && (
                              <div className="mt-1 text-sm text-neutral-700">
                                {contract.jobTitle}
                              </div>
                            )}

                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-600">
                              <span>Start: {startLabel}</span>
                              {leaveLabel && <span>Leave: {leaveLabel}</span>}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-neutral-900">
                Sickness dates
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    First day of sickness
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                    value={firstDay}
                    onChange={(e) => setFirstDay(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Last day (expected)
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                    value={lastDayExpected}
                    onChange={(e) => setLastDayExpected(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Last day (actual)
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                  value={lastDayActual}
                  onChange={(e) => setLastDayActual(e.target.value)}
                />
                <p className="mt-1 text-xs text-neutral-600">
                  Leave this blank until the absence has ended. You can update
                  it later from the Edit absence page.
                </p>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-neutral-900">
                Notes and context
              </h2>

              <label className="text-sm font-medium text-neutral-700">
                Reference notes
              </label>
              <textarea
                className="w-full min-h-[96px] rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                placeholder="Optional notes for this sickness record."
              />
            </section>

            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save sickness absence"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </PageTemplate>
  );
}