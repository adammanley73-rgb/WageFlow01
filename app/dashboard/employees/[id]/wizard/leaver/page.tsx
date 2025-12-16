/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\wizard\leaver\page.tsx

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/ui/PageTemplate";

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

const BTN_PRIMARY =
  "rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50";
const BTN_SECONDARY =
  "rounded-md bg-neutral-400 px-4 py-2 text-white";

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

type ToastState = {
  open: boolean;
  message: string;
  tone: "success" | "error" | "info";
};

function toNumberOrNull(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function LeaverWizardPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    tone: "info",
  });

  const toastTimerRef = useRef<any>(null);
  const redirectRef = useRef<any>(null);

  function showToast(message: string, tone: ToastState["tone"] = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, 4500);
  }

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

        const leaver = json?.leaver || {};

        const holidayDays =
          typeof leaver.holiday_days === "number"
            ? String(leaver.holiday_days)
            : typeof leaver.holiday_days === "string"
            ? leaver.holiday_days
            : "";

        const holidayAmount =
          typeof leaver.holiday_amount === "number"
            ? String(leaver.holiday_amount)
            : typeof leaver.holiday_amount === "string"
            ? leaver.holiday_amount
            : "";

        const otherEarningsRaw = Array.isArray(leaver.other_earnings)
          ? leaver.other_earnings
          : [];
        const otherDeductionsRaw = Array.isArray(leaver.other_deductions)
          ? leaver.other_deductions
          : [];

        const other_earnings: OtherLine[] =
          otherEarningsRaw.length > 0
            ? otherEarningsRaw.map((l: any) => ({
                description: String(l?.description || ""),
                amount:
                  typeof l?.amount === "number"
                    ? String(l.amount)
                    : String(l?.amount || ""),
              }))
            : [{ description: "", amount: "" }];

        const other_deductions: OtherLine[] =
          otherDeductionsRaw.length > 0
            ? otherDeductionsRaw.map((l: any) => ({
                description: String(l?.description || ""),
                amount:
                  typeof l?.amount === "number"
                    ? String(l.amount)
                    : String(l?.amount || ""),
              }))
            : [{ description: "", amount: "" }];

        if (!alive) return;

        setForm({
          leaving_date: String(leaver.leaving_date || ""),
          final_pay_date: String(leaver.final_pay_date || ""),
          leaver_reason: String(leaver.leaver_reason || ""),
          pay_after_leaving: !!leaver.pay_after_leaving,
          holiday_days: holidayDays,
          holiday_amount: holidayAmount,
          other_earnings,
          other_deductions,
        });
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (redirectRef.current) clearTimeout(redirectRef.current);
    };
  }, [id]);

  function updateField<K extends keyof LeaverFormState>(key: K, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addOtherLine(which: "other_earnings" | "other_deductions") {
    setForm((prev) => ({
      ...prev,
      [which]: [...prev[which], { description: "", amount: "" }],
    }));
  }

  function removeOtherLine(which: "other_earnings" | "other_deductions", index: number) {
    setForm((prev) => {
      const next = [...prev[which]];
      next.splice(index, 1);
      return {
        ...prev,
        [which]: next.length > 0 ? next : [{ description: "", amount: "" }],
      };
    });
  }

  function updateOtherLine(
    which: "other_earnings" | "other_deductions",
    index: number,
    field: "description" | "amount",
    value: string
  ) {
    setForm((prev) => {
      const next = [...prev[which]];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [which]: next };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    const leaving_date = String(form.leaving_date || "").trim();
    const final_pay_date = String(form.final_pay_date || "").trim();

    if (!leaving_date) {
      showToast("Leaving date is required.", "error");
      return;
    }

    if (!final_pay_date) {
      showToast("Final pay date is required.", "error");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const payload = {
        employee_id: id,
        leaving_date: leaving_date || null,
        final_pay_date: final_pay_date || null,
        leaver_reason: String(form.leaver_reason || "").trim() || null,
        pay_after_leaving: !!form.pay_after_leaving,
        holiday_days: toNumberOrNull(form.holiday_days),
        holiday_amount: toNumberOrNull(form.holiday_amount),
        other_earnings: (form.other_earnings || [])
          .map((l) => ({
            description: String(l?.description || "").trim(),
            amount: toNumberOrNull(l?.amount),
          }))
          .filter((l) => l.description || l.amount !== null),
        other_deductions: (form.other_deductions || [])
          .map((l) => ({
            description: String(l?.description || "").trim(),
            amount: toNumberOrNull(l?.amount),
          }))
          .filter((l) => l.description || l.amount !== null),
      };

      const res = await fetch(`/api/employees/${id}/leaver`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || `save ${res.status}`);
      }

      showToast("Leaver details saved.", "success");

      // Keep existing behaviour: redirect after a short delay.
      redirectRef.current = setTimeout(() => {
        router.replace("/dashboard/employees");
      }, 600);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setErr(msg);
      showToast(msg, "error");
      setSaving(false);
    }
  }

  const toastStyles =
    toast.tone === "error"
      ? "bg-red-600 text-white"
      : toast.tone === "success"
      ? "bg-emerald-600 text-white"
      : "bg-neutral-900 text-white";

  return (
    <PageTemplate
      title="Leaver Details"
      currentSection="employees"
      headerMode="wizard"
      backHref={`/dashboard/employees/${id}/edit`}
      backLabel="Back"
    >
      {/* Toast */}
      {toast.open && (
        <div className="fixed top-4 left-1/2 z-50 w-[min(720px,92vw)] -translate-x-1/2">
          <div className={`rounded-xl px-4 py-3 shadow-lg ring-1 ring-black/10 ${toastStyles}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium">{toast.message}</div>
              <button
                type="button"
                onClick={() => setToast((t) => ({ ...t, open: false }))}
                className="text-xs opacity-90 hover:opacity-100"
                aria-label="Close toast"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={CARD}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {err ? (
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            ) : null}

            <form onSubmit={onSubmit}>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-neutral-900">Leaver details</h2>
                <p className="mt-1 text-sm text-neutral-800">
                  Record leaving information so payroll can handle final pay correctly.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-neutral-900">Leaving date</label>
                  <input
                    type="date"
                    value={form.leaving_date}
                    onChange={(e) => updateField("leaving_date", e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-900">Final pay date</label>
                  <input
                    type="date"
                    value={form.final_pay_date}
                    onChange={(e) => updateField("final_pay_date", e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-900">Leaver reason</label>
                  <input
                    value={form.leaver_reason}
                    onChange={(e) => updateField("leaver_reason", e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                    placeholder="e.g. Resigned, Dismissed, Redundancy"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-3 text-sm text-neutral-900">
                    <input
                      type="checkbox"
                      checked={!!form.pay_after_leaving}
                      onChange={(e) => updateField("pay_after_leaving", e.target.checked)}
                      className="h-4 w-4"
                    />
                    Pay after leaving (only if you are intentionally paying after the leaving date)
                  </label>
                </div>
              </div>

              <div className="my-6 border-t border-neutral-400 pt-5">
                <h3 className="mb-3 text-lg font-semibold text-neutral-900">Holiday adjustment</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-neutral-900">Holiday days</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.holiday_days}
                      onChange={(e) => updateField("holiday_days", e.target.value)}
                      className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-900">Holiday amount (£)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.holiday_amount}
                      onChange={(e) => updateField("holiday_amount", e.target.value)}
                      className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6 border-t border-neutral-400 pt-5">
                <h3 className="mb-3 text-lg font-semibold text-neutral-900">
                  Other final earnings
                </h3>
                <p className="mb-3 text-sm text-neutral-800">
                  Bonuses, outstanding commission, or any other earnings for the final pay.
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

                  <button
                    type="button"
                    onClick={() => addOtherLine("other_earnings")}
                    className="text-sm font-medium text-blue-800"
                  >
                    + Add another earning line
                  </button>
                </div>
              </div>

              <div className="mb-6 border-t border-neutral-400 pt-5">
                <h3 className="mb-3 text-lg font-semibold text-neutral-900">
                  Other final deductions
                </h3>
                <p className="mb-3 text-sm text-neutral-800">
                  Recovery of overpayments, over-taken holiday, or any final deductions.
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
                <Link href="/dashboard/employees" className={BTN_SECONDARY}>
                  Cancel
                </Link>
                <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                  {saving ? "Saving..." : "Save leaver details"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </PageTemplate>
  );
}
