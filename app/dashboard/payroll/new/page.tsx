// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\new\page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const inter = Inter({ subsets: ["latin"], display: "swap" });

type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";

type CompanyPayScheduleRow = {
  id: string;
  frequency: Frequency;
  pay_date_mode: string;
  pay_date_param_int: number | null;
  allow_override: boolean;
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

function normalizeFrequency(v: any): Frequency {
  const raw = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (raw === "weekly") return "weekly";
  if (raw === "fortnightly") return "fortnightly";
  if (raw === "four_weekly" || raw === "fourweekly" || raw === "4_weekly" || raw === "four_week") return "four_weekly";
  if (raw === "monthly") return "monthly";
  return "monthly";
}

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

function freqSortKey(v: Frequency): number {
  switch (v) {
    case "weekly":
      return 1;
    case "fortnightly":
      return 2;
    case "four_weekly":
      return 3;
    case "monthly":
      return 4;
  }
}

function dayNameFromIdx(idx: number): string {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const i = Number.isFinite(idx) ? idx : -1;
  if (i >= 0 && i <= 6) return days[i];
  return `Day ${idx}`;
}

function payModeLabel(modeRaw: string, param: number | null): string {
  const mode = String(modeRaw || "").trim().toLowerCase();

  if (!mode) return "Pay date rule: not set";

  if (mode.includes("day_of_week") || mode.includes("dow") || mode.includes("weekday")) {
    return param === null ? "Pay date rule: weekday" : `Pay date rule: ${dayNameFromIdx(param)}`;
  }

  if (mode.includes("day_of_month") || mode.includes("dom") || mode.includes("month_day")) {
    return param === null ? "Pay date rule: day of month" : `Pay date rule: day ${param}`;
  }

  if (mode.includes("period_end") || mode.includes("end") || mode.includes("offset")) {
    return param === null ? "Pay date rule: offset" : `Pay date rule: offset ${param} day(s)`;
  }

  return param === null ? `Pay date rule: ${mode}` : `Pay date rule: ${mode} (${param})`;
}

function scheduleLabel(s: CompanyPayScheduleRow) {
  const freq = labelFreq(s.frequency);
  const mode = payModeLabel(s.pay_date_mode, s.pay_date_param_int);
  const override = s.allow_override ? "Override allowed" : "Fixed";
  return `${freq} (${mode}, ${override})`;
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

export default function PayrollNewPage() {
  const router = useRouter();

  const [schedules, setSchedules] = useState<CompanyPayScheduleRow[]>([]);
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
          .from("company_pay_schedules")
          .select("id, frequency, pay_date_mode, pay_date_param_int, allow_override")
          .order("updated_at", { ascending: false });

        if (cancelled) return;

        if (res.error) {
          setErr(normalizeMsg(res.error));
          setSchedules([]);
          return;
        }

        const rows = Array.isArray(res.data) ? (res.data as any[]) : [];

        const cleaned: CompanyPayScheduleRow[] = rows
          .filter((r) => r && typeof r.id === "string")
          .map((r) => ({
            id: String(r.id),
            frequency: normalizeFrequency(r.frequency),
            pay_date_mode: String(r.pay_date_mode ?? ""),
            pay_date_param_int: r.pay_date_param_int === null || r.pay_date_param_int === undefined ? null : Number(r.pay_date_param_int),
            allow_override: Boolean(r.allow_override),
          }))
          .sort((a, b) => {
            const ak = freqSortKey(a.frequency);
            const bk = freqSortKey(b.frequency);
            if (ak !== bk) return ak - bk;

            const am = String(a.pay_date_mode || "").toLowerCase();
            const bm = String(b.pay_date_mode || "").toLowerCase();
            if (am !== bm) return am.localeCompare(bm);

            const ap = a.pay_date_param_int === null ? 9999 : a.pay_date_param_int;
            const bp = b.pay_date_param_int === null ? 9999 : b.pay_date_param_int;
            if (ap !== bp) return ap - bp;

            if (a.allow_override !== b.allow_override) return a.allow_override ? -1 : 1;
            return 0;
          });

        setSchedules(cleaned);

        if (!scheduleId && cleaned.length === 1) {
          setScheduleId(cleaned[0].id);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ? String(e.message) : "Failed to load company pay schedules");
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
      <p className="text-sm text-neutral-700">Choose a company pay schedule, enter your dates, then start the run.</p>

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
