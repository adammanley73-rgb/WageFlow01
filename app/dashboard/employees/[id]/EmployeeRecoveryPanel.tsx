"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/formatMoney";

type RecoveryAction =
  | "record_repayment"
  | "write_off"
  | "mark_disputed"
  | "resolve_dispute"
  | "manual_adjustment";

type AdjustmentDirection = "increase" | "decrease";

type RecoveryBalance = {
  id: string;
  company_id: string;
  employee_id: string;
  source_payroll_run_id: string | null;
  source_payroll_run_employee_id: string | null;
  reason_code: string;
  description: string | null;
  original_calculated_net_pay: number | string;
  original_payable_net_pay: number | string;
  original_recovery_amount: number | string;
  amount_recovered: number | string;
  amount_outstanding: number | string;
  status: string;
  created_at: string;
  updated_at: string;
};

type RecoveryTransaction = {
  id: string;
  recovery_balance_id: string;
  transaction_type: string;
  amount: number | string;
  balance_after: number | string;
  description: string | null;
  created_at: string;
};

type RecoveryResponse = {
  ok?: boolean;
  summary?: {
    balanceCount?: number;
    openOutstanding?: number;
  };
  balances?: RecoveryBalance[];
  transactions?: RecoveryTransaction[];
  error?: string;
  message?: string;
};

type ActionFormState = {
  action: RecoveryAction;
  amount: string;
  description: string;
  direction: AdjustmentDirection;
};

type Props = {
  employeeId: string;
};

const DEFAULT_FORM: ActionFormState = {
  action: "record_repayment",
  amount: "",
  description: "",
  direction: "decrease",
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDateTime(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Not recorded";

  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatStatus(value: unknown): string {
  const status = String(value ?? "").trim().toLowerCase();

  if (status === "open") return "Open";
  if (status === "part_recovered") return "Part recovered";
  if (status === "recovered") return "Recovered";
  if (status === "written_off") return "Written off";
  if (status === "disputed") return "Disputed";

  return status ? status.replaceAll("_", " ") : "Unknown";
}

function statusClass(value: unknown): string {
  const status = String(value ?? "").trim().toLowerCase();

  if (status === "open") return "border-amber-300 bg-amber-100 text-amber-900";
  if (status === "part_recovered") return "border-blue-300 bg-blue-100 text-blue-900";
  if (status === "recovered") return "border-emerald-300 bg-emerald-100 text-emerald-900";
  if (status === "written_off") return "border-neutral-300 bg-neutral-100 text-neutral-800";
  if (status === "disputed") return "border-red-300 bg-red-100 text-red-900";

  return "border-neutral-300 bg-white text-neutral-800";
}

function formatAction(value: unknown): string {
  const action = String(value ?? "").trim().toLowerCase();

  if (action === "created") return "Created";
  if (action === "manual_repayment") return "Repayment";
  if (action === "write_off") return "Write-off";
  if (action === "dispute_opened") return "Dispute opened";
  if (action === "dispute_resolved") return "Dispute resolved";
  if (action === "manual_adjustment") return "Manual adjustment";
  if (action === "payroll_recovery_applied") return "Payroll recovery";

  return action ? action.replaceAll("_", " ") : "Activity";
}

function isClosed(balance: RecoveryBalance): boolean {
  const status = String(balance.status ?? "").trim().toLowerCase();
  return status === "recovered" || status === "written_off";
}

function actionNeedsAmount(action: RecoveryAction): boolean {
  return action === "record_repayment" || action === "write_off" || action === "manual_adjustment";
}

function actionNeedsReason(action: RecoveryAction): boolean {
  return action === "write_off" || action === "mark_disputed" || action === "manual_adjustment";
}

function actionHelpText(action: RecoveryAction): string {
  if (action === "record_repayment") {
    return "Use this when the employee pays money back outside payroll.";
  }

  if (action === "write_off") {
    return "Use this when the company decides not to recover some or all of the balance.";
  }

  if (action === "mark_disputed") {
    return "Use this when the employee challenges the amount owed.";
  }

  if (action === "resolve_dispute") {
    return "Use this when the dispute has been settled.";
  }

  return "Use this only to correct the recovery balance. A reason is required.";
}

export default function EmployeeRecoveryPanel({ employeeId }: Props) {
  const [data, setData] = useState<RecoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, ActionFormState>>({});

  const balances = useMemo(() => {
    return Array.isArray(data?.balances) ? data.balances : [];
  }, [data]);

  const transactions = useMemo(() => {
    return Array.isArray(data?.transactions) ? data.transactions : [];
  }, [data]);

  const openOutstanding = toNumber(data?.summary?.openOutstanding);

  async function loadRecovery() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/recovery`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await res.json().catch(() => null)) as RecoveryResponse | null;

      if (!res.ok || !payload?.ok) {
        setError(payload?.message || "Could not load payroll recovery details.");
        setData(payload || null);
        return;
      }

      setData(payload);
    } catch {
      setError("Could not load payroll recovery details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecovery();
  }, [employeeId]);

  function formFor(balanceId: string): ActionFormState {
    return forms[balanceId] || DEFAULT_FORM;
  }

  function updateForm(balanceId: string, patch: Partial<ActionFormState>) {
    setForms((current) => ({
      ...current,
      [balanceId]: {
        ...formFor(balanceId),
        ...patch,
      },
    }));
  }

  async function submitAction(balance: RecoveryBalance) {
    const form = formFor(balance.id);
    const action = form.action;

    setSavingId(balance.id);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          action,
          balanceId: balance.id,
          amount: form.amount,
          description: form.description,
          direction: form.direction,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setError(payload?.message || "Could not update the recovery balance.");
        return;
      }

      setNotice("Payroll recovery balance updated.");
      setForms((current) => ({
        ...current,
        [balance.id]: DEFAULT_FORM,
      }));
      await loadRecovery();
    } catch {
      setError("Could not update the recovery balance.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-neutral-900">Payroll recovery</div>
          <div className="text-xs text-neutral-700">
            Money owed to the company from negative net pay or payroll correction recovery.
          </div>
        </div>

        <div className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-900">
          Outstanding: {formatMoney(openOutstanding)}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="rounded-lg border border-neutral-300 bg-white p-4 text-sm text-neutral-700">
            Loading payroll recovery details...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : balances.length === 0 ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            No payroll recovery balance is recorded for this employee.
          </div>
        ) : (
          <div className="space-y-4">
            {notice ? (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                {notice}
              </div>
            ) : null}

            {balances.map((balance) => {
              const form = formFor(balance.id);
              const originalRecovery = toNumber(balance.original_recovery_amount);
              const amountRecovered = toNumber(balance.amount_recovered);
              const amountOutstanding = toNumber(balance.amount_outstanding);
              const balanceTransactions = transactions.filter(
                (item) => item.recovery_balance_id === balance.id
              );
              const closed = isClosed(balance);
              const saving = savingId === balance.id;

              return (
                <div key={balance.id} className="rounded-lg border border-neutral-300 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-neutral-950">
                        This employee owes the company {formatMoney(amountOutstanding)}
                      </div>
                      <div className="mt-1 text-xs text-neutral-700">
                        This came from a payroll correction where calculated net pay was negative.
                        No negative bank payment was made.
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            balance.status
                          )}`}
                        >
                          {formatStatus(balance.status)}
                        </span>
                        <span className="text-xs text-neutral-600">
                          Created {formatDateTime(balance.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 lg:min-w-[28rem]">
                      <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3">
                        <div className="text-xs font-semibold text-neutral-600">Original amount</div>
                        <div className="mt-1 text-base font-extrabold text-neutral-950">
                          {formatMoney(originalRecovery)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3">
                        <div className="text-xs font-semibold text-neutral-600">Repaid</div>
                        <div className="mt-1 text-base font-extrabold text-neutral-950">
                          {formatMoney(amountRecovered)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3">
                        <div className="text-xs font-semibold text-neutral-600">Still owed</div>
                        <div className="mt-1 text-base font-extrabold text-[#0f3c85]">
                          {formatMoney(amountOutstanding)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {balance.description ? (
                    <div className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-800">
                      {balance.description}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
                    <div className="text-sm font-bold text-neutral-950">Update recovery balance</div>
                    <div className="mt-1 text-xs text-neutral-700">
                      Record repayments or admin changes here. The original payroll run and payslip are not edited.
                    </div>

                    {closed ? (
                      <div className="mt-3 rounded-lg border border-neutral-300 bg-white p-3 text-sm text-neutral-700">
                        This recovery balance is closed. No further action is available.
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
                        <label className="lg:col-span-3">
                          <span className="block text-xs font-semibold text-neutral-700">Action</span>
                          <select
                            value={form.action}
                            onChange={(event) =>
                              updateForm(balance.id, {
                                action: event.target.value as RecoveryAction,
                                amount: "",
                                description: "",
                                direction: "decrease",
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950"
                          >
                            <option value="record_repayment">Record repayment</option>
                            <option value="write_off">Write off</option>
                            <option value="mark_disputed">Mark disputed</option>
                            <option value="resolve_dispute">Resolve dispute</option>
                            <option value="manual_adjustment">Manual adjustment</option>
                          </select>
                        </label>

                        {form.action === "manual_adjustment" ? (
                          <label className="lg:col-span-2">
                            <span className="block text-xs font-semibold text-neutral-700">
                              Direction
                            </span>
                            <select
                              value={form.direction}
                              onChange={(event) =>
                                updateForm(balance.id, {
                                  direction: event.target.value as AdjustmentDirection,
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950"
                            >
                              <option value="decrease">Decrease owed</option>
                              <option value="increase">Increase owed</option>
                            </select>
                          </label>
                        ) : null}

                        {actionNeedsAmount(form.action) ? (
                          <label className={form.action === "manual_adjustment" ? "lg:col-span-2" : "lg:col-span-3"}>
                            <span className="block text-xs font-semibold text-neutral-700">
                              Amount
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.amount}
                              onChange={(event) =>
                                updateForm(balance.id, { amount: event.target.value })
                              }
                              placeholder={
                                form.action === "write_off"
                                  ? formatMoney(amountOutstanding)
                                  : "0.00"
                              }
                              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950"
                            />
                          </label>
                        ) : null}

                        <label className="lg:col-span-4">
                          <span className="block text-xs font-semibold text-neutral-700">
                            Reason {actionNeedsReason(form.action) ? "(required)" : "(optional)"}
                          </span>
                          <input
                            type="text"
                            value={form.description}
                            onChange={(event) =>
                              updateForm(balance.id, { description: event.target.value })
                            }
                            placeholder="Add a plain-English note"
                            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950"
                          />
                        </label>

                        <div className="flex items-end lg:col-span-3">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => submitAction(balance)}
                            className="inline-flex w-full items-center justify-center rounded-full bg-[#0f3c85] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving ? "Saving..." : "Save update"}
                          </button>
                        </div>

                        <div className="text-xs text-neutral-700 lg:col-span-12">
                          {actionHelpText(form.action)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-bold text-neutral-950">Recovery history</div>

                    {balanceTransactions.length === 0 ? (
                      <div className="mt-2 rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
                        No recovery activity has been recorded yet.
                      </div>
                    ) : (
                      <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-300">
                        <table className="min-w-full border-collapse bg-white text-left text-sm">
                          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-600">
                            <tr>
                              <th className="border-b border-neutral-300 px-3 py-2">Date</th>
                              <th className="border-b border-neutral-300 px-3 py-2">Action</th>
                              <th className="border-b border-neutral-300 px-3 py-2 text-right">Amount</th>
                              <th className="border-b border-neutral-300 px-3 py-2 text-right">Balance after</th>
                              <th className="border-b border-neutral-300 px-3 py-2">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {balanceTransactions.map((tx) => (
                              <tr key={tx.id}>
                                <td className="border-b border-neutral-200 px-3 py-2 text-neutral-700">
                                  {formatDateTime(tx.created_at)}
                                </td>
                                <td className="border-b border-neutral-200 px-3 py-2 font-semibold text-neutral-900">
                                  {formatAction(tx.transaction_type)}
                                </td>
                                <td className="border-b border-neutral-200 px-3 py-2 text-right font-semibold text-neutral-900">
                                  {formatMoney(toNumber(tx.amount))}
                                </td>
                                <td className="border-b border-neutral-200 px-3 py-2 text-right font-semibold text-neutral-900">
                                  {formatMoney(toNumber(tx.balance_after))}
                                </td>
                                <td className="border-b border-neutral-200 px-3 py-2 text-neutral-700">
                                  {tx.description || "No note recorded"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
              Recovering through future payroll is not enabled in this screen yet. For now, record money repaid outside payroll, write-offs, disputes, and manual balance corrections here.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}