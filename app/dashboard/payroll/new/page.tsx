// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\new\page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const inter = Inter({ subsets: ["latin"], display: "swap" });

type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";

type PayScheduleRow = {
  id: string;
  name: string | null;
  frequency: Frequency;
  is_flexible: boolean | null;
  is_active: boolean | null;
  pay_day_of_week: number | null;
  pay_day_of_month: number | null;
  pay_timing: string | null;
  cycle_anchor_pay_date: string | null;
  pay_date_adjustment: string | null;
  pay_date_offset_days: number | null;
  max_advance_days: number | null;
  max_lag_days: number | null;
};

function labelFreq(v: Frequency) {
  switch (v) {
    case "weekly":
      return "Weekly";
    case "fortnightly":
      return "Fortnightly";
    case "four_weekly":
      return "Four-weekly";
    case "monthly":
      return "Monthly";
  }
}

function scheduleLabel(s: PayScheduleRow) {
  const base = String(s?.name || "").trim();
  const name = base || `${labelFreq(s.frequency)}${s.is_flexible ? " - Flexible" : ""}`;
  const freq = labelFreq(s.frequency);
  const flex = s.is_flexible ? "Flexible" : "Fixed";
  return `${name} (${freq}, ${flex})`;
}

type WizardTokenResponse = {
  ok?: boolean;
  wizardToken?: string;
  error?: any;
  message?: any;
};

type CreateRunResponse = {
  ok?: boolean;
  id?: string;
  run_id?: string;
  run?: any;
  error?: any;
  message?: any;
  code?: string;
  debugSource?: string;
};

function normalizeMsg(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const m = (v as any)?.message;
    if (typeof m === "string" && m.trim()) return m.trim();
    try {
      return JSON.stringify(v);
    } catch {
      return "Unexpected error object";
    }
  }
  return String(v);
}

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

export default function PayrollNewPage() {
  const router = useRouter();

  const [schedules, setSchedules] = useState<PayScheduleRow[]>([]);
  const [scheduleId, setScheduleId] = useState<string>("");

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [payDate, setPayDate] = useState<string>("");

  const [wizardToken, setWizardToken] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedSchedule = useMemo(() => {
    if (!scheduleId) return null;
    return schedules.find((s) => s.id === scheduleId) || null;
  }, [scheduleId, schedules]);

  const derivedFrequency: Frequency | null = useMemo(() => {
    if (!selectedSchedule) return null;
    return selectedSchedule.frequency;
  }, [selectedSchedule]);

  useEffect(() => {
    let cancelled = false;

    async function loadSchedules() {
      try {
        const supabase = createClient();
        const res = await supabase
          .from("pay_schedules")
          .select(
            [
              "id",
              "name",
              "frequency",
              "is_flexible",
              "is_active",
              "pay_day_of_week",
              "pay_day_of_month",
              "pay_timing",
              "cycle_anchor_pay_date",
              "pay_date_adjustment",
              "pay_date_offset_days",
              "max_advance_days",
              "max_lag_days",
            ].join(", ")
          )
          .neq("is_active", false)
          .order("frequency", { ascending: true })
          .order("is_flexible", { ascending: false })
          .order("name", { ascending: true });

        if (cancelled) return;

        if (res.error) {
          setErr(normalizeMsg(res.error));
          setSchedules([]);
          return;
        }

        const rows = Array.isArray(res.data) ? (res.data as any[]) : [];
        const cleaned: PayScheduleRow[] = rows
          .filter((r) => r && typeof r.id === "string")
          .map((r) => ({
            id: String(r.id),
            name: r.name ?? null,
            frequency: (String(r.frequency) as Frequency) || "monthly",
            is_flexible: r.is_flexible ?? null,
            is_active: r.is_active ?? null,
            pay_day_of_week: r.pay_day_of_week ?? null,
            pay_day_of_month: r.pay_day_of_month ?? null,
            pay_timing: r.pay_timing ?? null,
            cycle_anchor_pay_date: r.cycle_anchor_pay_date ?? null,
            pay_date_adjustment: r.pay_date_adjustment ?? null,
            pay_date_offset_days: r.pay_date_offset_days ?? null,
            max_advance_days: r.max_advance_days ?? null,
            max_lag_days: r.max_lag_days ?? null,
          }));

        setSchedules(cleaned);

        if (!scheduleId && cleaned.length === 1) {
          setScheduleId(cleaned[0].id);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ? String(e.message) : "Failed to load pay schedules");
      }
    }

    loadSchedules();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function getToken() {
      try {
        setErr(null);

        const res = await fetch("/api/payroll/runs/wizard-token", {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
        });

        const data: WizardTokenResponse | null = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = normalizeMsg(data?.error || data?.message || `Failed to get wizard token (${res.status})`);
          if (!cancelled) setErr(msg || `Failed to get wizard token (${res.status})`);
          return;
        }

        const token = typeof data?.wizardToken === "string" ? data.wizardToken.trim() : "";
        if (!token) {
          if (!cancelled) setErr("Wizard token endpoint returned no token.");
          return;
        }

        if (!cancelled) setWizardToken(token);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ? String(e.message) : "Failed to get wizard token");
      }
    }

    getToken();

    return () => {
      cancelled = true;
    };
  }, []);

  const dateRangeBad = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate > endDate;
  }, [startDate, endDate]);

  const canSubmit = useMemo(() => {
    if (!wizardToken) return false;
    if (!scheduleId) return false;
    if (!startDate || !endDate || !payDate) return false;
    if (!isIsoDateOnly(startDate) || !isIsoDateOnly(endDate) || !isIsoDateOnly(payDate)) return false;
    if (startDate > endDate) return false;
    return true;
  }, [wizardToken, scheduleId, startDate, endDate, payDate]);

  async function onStart() {
    if (!canSubmit || busy) return;

    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardToken,
          pay_schedule_id: scheduleId,
          period_start: startDate,
          period_end: endDate,
          pay_date: payDate,
        }),
      });

      const data: CreateRunResponse | null = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = normalizeMsg(data?.error || data?.message || `Failed to create payroll run (${res.status})`);
        setErr(msg || `Failed to create payroll run (${res.status})`);
        setBusy(false);
        return;
      }

      if (!data?.ok) {
        const msg = normalizeMsg(data?.error || data?.message || "Failed to create payroll run");
        setErr(msg || "Failed to create payroll run");
        setBusy(false);
        return;
      }

      const runId =
        (typeof data?.id === "string" && data.id.trim()) ||
        (typeof data?.run_id === "string" && data.run_id.trim()) ||
        "";

      if (!runId) {
        setErr("Payroll run created, but API returned no id. Expected id/run_id.");
        setBusy(false);
        return;
      }

      router.push(`/dashboard/payroll/${runId}`);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Failed to create payroll run");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold text-neutral-900">Payroll Run Wizard</h2>
      <p className="text-sm text-neutral-700">Choose a pay schedule, enter your dates, then start the run.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs text-neutral-600">Pay schedule</span>
          <select
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
          >
            <option value="">Select a pay schedule</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {scheduleLabel(s)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Pay period start</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Pay period end</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Pay date</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Frequency (from schedule)</span>
          <input
            type="text"
            readOnly
            className={`${inter.className} mt-1 w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-extrabold text-neutral-900`}
            value={derivedFrequency ? labelFreq(derivedFrequency) : ""}
            placeholder={scheduleId ? "Loading..." : "Select a schedule"}
          />
        </label>
      </div>

      {!wizardToken ? <div className="mt-3 text-sm text-neutral-600">Loading wizard token...</div> : null}

      {dateRangeBad ? (
        <div className="mt-3 text-sm text-red-700">Pay period start must be on or before pay period end.</div>
      ) : null}

      {err ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
      ) : null}

      <div className="pt-6">
        <button
          className={
            "inline-flex items-center rounded-full bg-[#0f3c85] px-5 py-2 text-sm font-semibold text-white " +
            (canSubmit && !busy ? "hover:opacity-95" : "opacity-60 cursor-not-allowed")
          }
          disabled={!canSubmit || busy}
          onClick={onStart}
        >
          {busy ? "Starting..." : "Start payroll run"}
        </button>
      </div>
    </div>
  );
}
