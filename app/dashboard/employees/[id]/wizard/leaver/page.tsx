// C:\Projects\wageflow01\app\dashboard\employees\[id]\wizard\leaver\page.tsx

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageTemplate from "@/components/ui/PageTemplate";

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

type OtherLine = {
  description: string;
  amount: string;
};

type LeaverFormState = {
  leaving_date: string;
  final_pay_date: string;
  leaver_reason: string;
  pay_after_leaving: boolean;
  holiday_days: string;
  holiday_amount: string;
  other_earnings: OtherLine[];
  other_deductions: OtherLine[];
};

type FieldErrors = {
  leaving_date: string;
  final_pay_date: string;
  leaver_reason: string;
  holiday_days: string;
  holiday_amount: string;
  other_earnings: string;
  other_deductions: string;
};

function isIsoDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function isValidMoney(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  return /^\d+(\.\d{1,2})?$/.test(raw);
}

function isValidNonNegativeNumber(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0;
}

function getLineError(lines: OtherLine[], label: string) {
  for (const line of lines) {
    const description = String(line.description || "").trim();
    const amount = String(line.amount || "").trim();

    if (!description && !amount) continue;

    if (!description || !amount) {
      return `${label} lines must have both description and amount.`;
    }

    if (!isValidMoney(amount)) {
      return `${label} amounts must be valid numbers with up to 2 decimal places.`;
    }

    if (Number(amount) < 0) {
      return `${label} amounts cannot be negative.`;
    }
  }

  return "";
}

function getFieldErrors(form: LeaverFormState): FieldErrors {
  const leavingDate = String(form.leaving_date || "").trim();
  const finalPayDate = String(form.final_pay_date || "").trim();
  const leaverReason = String(form.leaver_reason || "").trim();
  const holidayDays = String(form.holiday_days || "").trim();
  const holidayAmount = String(form.holiday_amount || "").trim();

  return {
    leaving_date: !leavingDate
      ? "Last working day is required."
      : !isIsoDateOnly(leavingDate)
      ? "Last working day must be a valid date."
      : "",
    final_pay_date: !finalPayDate
      ? "Final pay date is required."
      : !isIsoDateOnly(finalPayDate)
      ? "Final pay date must be a valid date."
      : "",
    leaver_reason: leaverReason ? "" : "Reason for leaving is required.",
    holiday_days:
      !isValidNonNegativeNumber(holidayDays) || !isValidMoney(holidayDays)
        ? "Unused holiday days must be a valid non-negative number."
        : "",
    holiday_amount:
      !isValidNonNegativeNumber(holidayAmount) || !isValidMoney(holidayAmount)
        ? "Holiday payout amount must be a valid non-negative amount."
        : "",
    other_earnings: getLineError(form.other_earnings, "Other earnings"),
    other_deductions: getLineError(form.other_deductions, "Other deductions"),
  };
}

export default function LeaverWizardPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<LeaverFormState>({
    leaving_date: "",
    final_pay_date: "",
    leaver_reason: "",
    pay_after_leaving: false,
    holiday_days: "",
    holiday_amount: "",
    other_earnings: [{ description: "", amount: "" }],
    other_deductions: [{ description: "", amount: "" }],
  });

  const [touched, setTouched] = useState({
    leaving_date: false,
    final_pay_date: false,
    leaver_reason: false,
    holiday_days: false,
    holiday_amount: false,
    other_earnings: false,
    other_deductions: false,
  });

  useEffect(() => {
    if (!id) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/employees/${id}/leaver`, {
          cache: "no-store",
        });

        if (res.status === 404 || res.status === 204) {
          if (alive) setLoading(false);
          return;
        }

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `load ${res.status}`);
        }

        const leaver = json.leaver || {};

        if (!alive) return;

        const holidayDays =
          typeof leaver.holiday_days === "number" ? String(leaver.holiday_days) : "";
        const holidayAmount =
          typeof leaver.holiday_amount === "number" ? String(leaver.holiday_amount) : "";

        const otherEarningsRaw = Array.isArray(leaver.other_earnings) ? leaver.other_earnings : [];
        const otherDeductionsRaw = Array.isArray(leaver.other_deductions)
          ? leaver.other_deductions
          : [];

        const otherEarnings: OtherLine[] =
          otherEarningsRaw.length > 0
            ? otherEarningsRaw.map((l: any) => ({
                description: l?.description || "",
                amount: typeof l?.amount === "number" ? String(l.amount) : l?.amount || "",
              }))
            : [{ description: "", amount: "" }];

        const otherDeductions: OtherLine[] =
          otherDeductionsRaw.length > 0
            ? otherDeductionsRaw.map((l: any) => ({
                description: l?.description || "",
                amount: typeof l?.amount === "number" ? String(l.amount) : l?.amount || "",
              }))
            : [{ description: "", amount: "" }];

        setForm({
          leaving_date: leaver.leaving_date || "",
          final_pay_date: leaver.final_pay_date || "",
          leaver_reason: leaver.leaver_reason || "",
          pay_after_leaving: !!leaver.pay_after_leaving,
          holiday_days: holidayDays,
          holiday_amount: holidayAmount,
          other_earnings: otherEarnings,
          other_deductions: otherDeductions,
        });
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (redirectRef.current) {
        clearTimeout(redirectRef.current);
      }
    };
  }, []);

  function updateField<K extends keyof LeaverFormState>(key: K, value: LeaverFormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateOtherLine(
    key: "other_earnings" | "other_deductions",
    index: number,
    field: keyof OtherLine,
    value: string
  ) {
    setForm((prev) => {
      const list = [...prev[key]];
      if (!list[index]) {
        list[index] = { description: "", amount: "" };
      }
      list[index] = {
        ...list[index],
        [field]: value,
      };
      return { ...prev, [key]: list };
    });
  }

  function addOtherLine(key: "other_earnings" | "other_deductions") {
    setForm((prev) => ({
      ...prev,
      [key]: [...prev[key], { description: "", amount: "" }],
    }));
  }

  function removeOtherLine(key: "other_earnings" | "other_deductions", index: number) {
    setForm((prev) => {
      const list = [...prev[key]];
      list.splice(index, 1);
      if (list.length === 0) {
        list.push({ description: "", amount: "" });
      }
      return { ...prev, [key]: list };
    });
  }

  function markTouched(name: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);

  const canSave = useMemo(() => {
    return (
      !fieldErrors.leaving_date &&
      !fieldErrors.final_pay_date &&
      !fieldErrors.leaver_reason &&
      !fieldErrors.holiday_days &&
      !fieldErrors.holiday_amount &&
      !fieldErrors.other_earnings &&
      !fieldErrors.other_deductions
    );
  }, [fieldErrors]);

  function inputClass(hasError: boolean) {
    return `mt-1 w-full rounded-md border bg-white p-2 ${
      hasError ? "border-red-600 ring-2 ring-red-200" : "border-neutral-400"
    }`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    setTouched({
      leaving_date: true,
      final_pay_date: true,
      leaver_reason: true,
      holiday_days: true,
      holiday_amount: true,
      other_earnings: true,
      other_deductions: true,
    });

    if (!canSave) {
      setErr(
        [
          fieldErrors.leaving_date,
          fieldErrors.final_pay_date,
          fieldErrors.leaver_reason,
          fieldErrors.holiday_days,
          fieldErrors.holiday_amount,
          fieldErrors.other_earnings,
          fieldErrors.other_deductions,
        ]
          .filter(Boolean)
          .join(" ")
      );
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const payload = {
        leaving_date: form.leaving_date || null,
        final_pay_date: form.final_pay_date || null,
        leaver_reason: form.leaver_reason.trim() || null,
        pay_after_leaving: !!form.pay_after_leaving,
        holiday_days:
          String(form.holiday_days || "").trim() === "" ? null : Number(form.holiday_days),
        holiday_amount:
          String(form.holiday_amount || "").trim() === "" ? null : Number(form.holiday_amount),
        other_earnings: form.other_earnings
          .filter((line) => String(line.description || "").trim() || String(line.amount || "").trim())
          .map((line) => ({
            description: String(line.description || "").trim(),
            amount: Number(line.amount),
          })),
        other_deductions: form.other_deductions
          .filter((line) => String(line.description || "").trim() || String(line.amount || "").trim())
          .map((line) => ({
            description: String(line.description || "").trim(),
            amount: Number(line.amount),
          })),
      };

      const res = await fetch(`/api/employees/${id}/leaver`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const msg = json?.error || `save ${res.status}`;
        throw new Error(msg);
      }

      setToast("Leaver successfully processed. Please remember to send their P45.");
      if (redirectRef.current) {
        clearTimeout(redirectRef.current);
      }
      redirectRef.current = setTimeout(() => {
        router.replace("/dashboard/employees");
      }, 2500);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageTemplate
      title="Leaver details"
      currentSection="employees"
      headerMode="wizard"
      backHref={`/dashboard/employees/${id}/wizard/emergency`}
      backLabel="Back"
    >
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-md bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className={CARD}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <form onSubmit={onSubmit}>
            {err ? (
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            ) : null}

            <div className="mb-6 border-b border-neutral-400 pb-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">Leaver basics</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-neutral-900">Last working day</label>
                  <input
                    type="date"
                    name="leaving_date"
                    value={form.leaving_date}
                    onChange={(e) => updateField("leaving_date", e.target.value)}
                    onBlur={() => markTouched("leaving_date")}
                    className={inputClass(!!(touched.leaving_date && fieldErrors.leaving_date))}
                  />
                  {touched.leaving_date && fieldErrors.leaving_date ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.leaving_date}</div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm text-neutral-900">Final pay date</label>
                  <input
                    type="date"
                    name="final_pay_date"
                    value={form.final_pay_date}
                    onChange={(e) => updateField("final_pay_date", e.target.value)}
                    onBlur={() => markTouched("final_pay_date")}
                    className={inputClass(!!(touched.final_pay_date && fieldErrors.final_pay_date))}
                  />
                  {touched.final_pay_date && fieldErrors.final_pay_date ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.final_pay_date}</div>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-900">Reason for leaving</label>
                  <select
                    name="leaver_reason"
                    value={form.leaver_reason}
                    onChange={(e) => updateField("leaver_reason", e.target.value)}
                    onBlur={() => markTouched("leaver_reason")}
                    className={inputClass(!!(touched.leaver_reason && fieldErrors.leaver_reason))}
                  >
                    <option value="">Select...</option>
                    <option value="resignation">Resignation</option>
                    <option value="dismissal">Dismissal</option>
                    <option value="redundancy">Redundancy</option>
                    <option value="end_of_contract">End of contract</option>
                    <option value="other">Other</option>
                  </select>
                  {touched.leaver_reason && fieldErrors.leaver_reason ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.leaver_reason}</div>
                  ) : null}
                </div>

                <label className="mt-2 flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.pay_after_leaving}
                    onChange={(e) => updateField("pay_after_leaving", e.target.checked)}
                  />
                  <span className="text-sm text-neutral-900">
                    There may be payments after leaving
                  </span>
                </label>
              </div>
            </div>

            <div className="mb-6 border-b border-neutral-400 pb-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Holiday on termination
              </h2>
              <p className="mb-3 text-sm text-neutral-800">
                Enter the unused holiday days and payout amount for this employee. Because apparently
                humans still enjoy leaving this until the end.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-neutral-900">
                    Unused holiday days to pay
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="holiday_days"
                    value={form.holiday_days}
                    onChange={(e) => updateField("holiday_days", e.target.value)}
                    onBlur={() => markTouched("holiday_days")}
                    className={inputClass(!!(touched.holiday_days && fieldErrors.holiday_days))}
                  />
                  {touched.holiday_days && fieldErrors.holiday_days ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.holiday_days}</div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm text-neutral-900">Holiday payout amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="holiday_amount"
                    value={form.holiday_amount}
                    onChange={(e) => updateField("holiday_amount", e.target.value)}
                    onBlur={() => markTouched("holiday_amount")}
                    className={inputClass(
                      !!(touched.holiday_amount && fieldErrors.holiday_amount)
                    )}
                  />
                  {touched.holiday_amount && fieldErrors.holiday_amount ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.holiday_amount}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mb-6 border-b border-neutral-400 pb-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">Other final earnings</h2>
              <p className="mb-3 text-sm text-neutral-800">
                Use this for bonuses, outstanding commission, or any other earnings in the final run.
              </p>
              <div className="space-y-3">
                {form.other_earnings.map((line, index) => (
                  <div
                    key={`earn-${index}`}
                    className="grid grid-cols-1 items-center gap-3 md:grid-cols-[2fr,1fr,auto]"
                  >
                    <input
                      className="rounded-md border border-neutral-400 bg-white p-2"
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) =>
                        updateOtherLine("other_earnings", index, "description", e.target.value)
                      }
                      onBlur={() => markTouched("other_earnings")}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="rounded-md border border-neutral-400 bg-white p-2"
                      placeholder="Amount"
                      value={line.amount}
                      onChange={(e) =>
                        updateOtherLine("other_earnings", index, "amount", e.target.value)
                      }
                      onBlur={() => markTouched("other_earnings")}
                    />
                    <button
                      type="button"
                      onClick={() => removeOtherLine("other_earnings", index)}
                      className="text-sm text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {touched.other_earnings && fieldErrors.other_earnings ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.other_earnings}</div>
                ) : null}
                <button
                  type="button"
                  onClick={() => addOtherLine("other_earnings")}
                  className="text-sm font-medium text-blue-800"
                >
                  + Add another earning line
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Other final deductions
              </h2>
              <p className="mb-3 text-sm text-neutral-800">
                Use this for overpayments, over-taken holiday, or other final deductions.
              </p>
              <div className="space-y-3">
                {form.other_deductions.map((line, index) => (
                  <div
                    key={`ded-${index}`}
                    className="grid grid-cols-1 items-center gap-3 md:grid-cols-[2fr,1fr,auto]"
                  >
                    <input
                      className="rounded-md border border-neutral-400 bg-white p-2"
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) =>
                        updateOtherLine("other_deductions", index, "description", e.target.value)
                      }
                      onBlur={() => markTouched("other_deductions")}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="rounded-md border border-neutral-400 bg-white p-2"
                      placeholder="Amount"
                      value={line.amount}
                      onChange={(e) =>
                        updateOtherLine("other_deductions", index, "amount", e.target.value)
                      }
                      onBlur={() => markTouched("other_deductions")}
                    />
                    <button
                      type="button"
                      onClick={() => removeOtherLine("other_deductions", index)}
                      className="text-sm text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {touched.other_deductions && fieldErrors.other_deductions ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.other_deductions}</div>
                ) : null}
                <button
                  type="button"
                  onClick={() => addOtherLine("other_deductions")}
                  className="text-sm font-medium text-blue-800"
                >
                  + Add another deduction line
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Link
                href={`/dashboard/employees/${id}/wizard/emergency`}
                className="rounded-md bg-neutral-400 px-4 py-2 text-white"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={saving || !canSave}
                className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save and finish"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PageTemplate>
  );
}