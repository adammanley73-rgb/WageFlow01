// C:\Projects\wageflow01\app\dashboard\payroll\new\page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const inter = Inter({ subsets: ["latin"], display: "swap" });

type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";

type PayScheduleRow = {
  id: string;
  company_id: string | null;
  name: string;
  slug: string | null;

  frequency: Frequency;

  pay_day_of_week: number | null;
  pay_day_of_month: number | null;
  cycle_anchor_pay_date: string | null;

  pay_timing: string | null;
  pay_date_adjustment: string | null;
  pay_date_offset_days: number | null;

  is_template: boolean;
  is_active: boolean | null;
  is_flexible: boolean;
};

type WizardTokenResponse = {
  ok?: boolean;
  wizardToken?: string;
  error?: any;
  message?: any;
};

type ActiveCompanyResponse = {
  ok?: boolean;
  companyId?: string;
  company_id?: string;
  id?: string;
  error?: any;
  message?: any;
};

type CreateRunResponse = {
  ok?: boolean;
  id?: string;
  run_id?: string;
  run?: any;
  reusedExisting?: boolean;
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

function normalizeFrequency(v: any): Frequency {
  const raw = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (raw === "weekly") return "weekly";
  if (raw === "fortnightly") return "fortnightly";
  if (raw === "four_weekly" || raw === "fourweekly" || raw === "4_weekly" || raw === "four_week") {
    return "four_weekly";
  }
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

function scheduleDowLabel(dow: number | null) {
  if (!dow) return "";
  const map: Record<number, string> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };
  return map[dow] || "";
}

function parseIsoDateOnlyToUtc(iso: string) {
  const s = String(iso || "").trim();
  if (!isIsoDateOnly(s)) throw new Error("Bad date: " + s);
  const [y, m, d] = s.split("-").map((p) => parseInt(p, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function dateOnlyIsoUtc(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDaysUtc(d: Date, days: number) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function mondayOfWeekUtc(d: Date) {
  const out = new Date(d.getTime());
  const jsDow = out.getUTCDay();
  const daysSinceMonday = (jsDow + 6) % 7;
  out.setUTCDate(out.getUTCDate() - daysSinceMonday);
  return out;
}

function computePeriodForSelectedPayDate(
  schedule: PayScheduleRow,
  payDateIso: string
): { startIso: string; endIso: string; warning?: string } {
  const payUtc = parseIsoDateOnlyToUtc(payDateIso);

  if (schedule.frequency === "monthly") {
    const y = payUtc.getUTCFullYear();
    const m = payUtc.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    return {
      startIso: dateOnlyIsoUtc(start),
      endIso: dateOnlyIsoUtc(end),
    };
  }

  if (schedule.frequency === "weekly") {
    const start = mondayOfWeekUtc(payUtc);
    const end = addDaysUtc(start, 6);
    return {
      startIso: dateOnlyIsoUtc(start),
      endIso: dateOnlyIsoUtc(end),
    };
  }

  const periodDays = schedule.frequency === "fortnightly" ? 14 : 28;
  const anchorIso = String(schedule.cycle_anchor_pay_date || "").trim();

  if (isIsoDateOnly(anchorIso)) {
    let end = parseIsoDateOnlyToUtc(anchorIso);

    if (payUtc.getTime() > end.getTime()) {
      while (end.getTime() < payUtc.getTime()) {
        end = addDaysUtc(end, periodDays);
      }
    } else {
      while (addDaysUtc(end, -periodDays).getTime() >= payUtc.getTime()) {
        end = addDaysUtc(end, -periodDays);
      }
    }

    const start = addDaysUtc(end, -(periodDays - 1));

    return {
      startIso: dateOnlyIsoUtc(start),
      endIso: dateOnlyIsoUtc(end),
    };
  }

  const end = payUtc;
  const start = addDaysUtc(end, -(periodDays - 1));

  return {
    startIso: dateOnlyIsoUtc(start),
    endIso: dateOnlyIsoUtc(end),
    warning: "This schedule has no cycle anchor date, so the pay period is being calculated from the selected pay date.",
  };
}

async function fetchActiveCompanyId(): Promise<string | null> {
  try {
    const res = await fetch("/api/active-company", {
      method: "GET",
      headers: { "Cache-Control": "no-store" },
    });

    const data: ActiveCompanyResponse | null = await res.json().catch(() => null);

    if (!res.ok) return null;

    const raw =
      (typeof data?.companyId === "string" && data.companyId.trim()) ||
      (typeof data?.company_id === "string" && data.company_id.trim()) ||
      (typeof data?.id === "string" && data.id.trim()) ||
      "";

    return raw || null;
  } catch {
    return null;
  }
}

function scheduleLabel(s: PayScheduleRow) {
  const freq = labelFreq(s.frequency);
  const timing = String(s.pay_timing || "arrears").trim().toLowerCase();
  const adjust = String(s.pay_date_adjustment || "previous_working_day").trim().toLowerCase();

  const when =
    s.frequency === "monthly"
      ? s.pay_day_of_month
        ? `Day ${s.pay_day_of_month}`
        : "Last day"
      : s.pay_day_of_week
      ? scheduleDowLabel(s.pay_day_of_week)
      : "";

  const flexible = s.is_flexible ? "Flexible" : "Fixed";
  const active = s.is_active === false ? "Inactive" : "Active";

  return `${s.name} (${freq}${when ? `, ${when}` : ""}, ${timing}, ${adjust}, ${flexible}, ${active})`;
}

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

export default function PayrollNewPage() {
  const router = useRouter();

  const [activeCompanyId, setActiveCompanyId] = useState<string>("");
  const [schedules, setSchedules] = useState<PayScheduleRow[]>([]);
  const [scheduleId, setScheduleId] = useState<string>("");

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [payDate, setPayDate] = useState<string>("");

  const [wizardToken, setWizardToken] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

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

    async function initCompanyAndSchedules() {
      try {
        setErr(null);
        setInfo(null);

        const cid = await fetchActiveCompanyId();

        if (cancelled) return;

        if (!cid) {
          setErr("Active company not set. Go to Dashboard and select a company.");
          setSchedules([]);
          setActiveCompanyId("");
          return;
        }

        setActiveCompanyId(cid);

        const supabase = await createClient();

        const res = await supabase
          .from("pay_schedules")
          .select(
            [
              "id",
              "company_id",
              "name",
              "slug",
              "frequency",
              "pay_day_of_week",
              "pay_day_of_month",
              "cycle_anchor_pay_date",
              "pay_timing",
              "pay_date_adjustment",
              "pay_date_offset_days",
              "is_template",
              "is_active",
              "is_flexible",
            ].join(",")
          )
          .eq("company_id", cid)
          .eq("is_template", false)
          .eq("is_active", true);

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
            company_id: typeof r.company_id === "string" ? r.company_id : null,
            name: String(r.name ?? "Pay schedule"),
            slug: typeof r.slug === "string" ? r.slug : null,

            frequency: normalizeFrequency(r.frequency),
            pay_day_of_week:
              r.pay_day_of_week === null || r.pay_day_of_week === undefined
                ? null
                : Number(r.pay_day_of_week),
            pay_day_of_month:
              r.pay_day_of_month === null || r.pay_day_of_month === undefined
                ? null
                : Number(r.pay_day_of_month),
            cycle_anchor_pay_date:
              typeof r.cycle_anchor_pay_date === "string" ? r.cycle_anchor_pay_date : null,

            pay_timing: typeof r.pay_timing === "string" ? r.pay_timing : null,
            pay_date_adjustment:
              typeof r.pay_date_adjustment === "string" ? r.pay_date_adjustment : null,
            pay_date_offset_days:
              r.pay_date_offset_days === null || r.pay_date_offset_days === undefined
                ? null
                : Number(r.pay_date_offset_days),

            is_template: Boolean(r.is_template),
            is_active:
              r.is_active === null || r.is_active === undefined ? null : Boolean(r.is_active),
            is_flexible: Boolean(r.is_flexible),
          }))
          .sort((a, b) => {
            const ak = freqSortKey(a.frequency);
            const bk = freqSortKey(b.frequency);
            if (ak !== bk) return ak - bk;
            return String(a.name).localeCompare(String(b.name));
          });

        setSchedules(cleaned);

        if (cleaned.length > 0) {
          setScheduleId((prev) => (prev && cleaned.some((s) => s.id === prev) ? prev : cleaned[0].id));
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ? String(e.message) : "Failed to load pay schedules");
        }
      }
    }

    initCompanyAndSchedules();

    return () => {
      cancelled = true;
    };
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
          const msg = normalizeMsg(
            data?.error || data?.message || `Failed to get wizard token (${res.status})`
          );
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
        if (!cancelled) {
          setErr(e?.message ? String(e.message) : "Failed to get wizard token");
        }
      }
    }

    getToken();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!payDate) {
      setPayDate(todayIsoUtc());
    }
  }, [payDate]);

  useEffect(() => {
    if (!selectedSchedule) {
      setStartDate("");
      setEndDate("");
      setWarn(null);
      return;
    }

    if (!payDate || !isIsoDateOnly(payDate)) {
      setStartDate("");
      setEndDate("");
      setWarn(null);
      return;
    }

    try {
      const period = computePeriodForSelectedPayDate(selectedSchedule, payDate);
      setStartDate(period.startIso);
      setEndDate(period.endIso);
      setWarn(period.warning ?? null);
    } catch (e: any) {
      setWarn(null);
      setStartDate("");
      setEndDate("");
      setErr(e?.message ? String(e.message) : "Failed to compute pay period from schedule");
    }
  }, [selectedSchedule, payDate]);

  const dateRangeBad = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate > endDate;
  }, [startDate, endDate]);

  const canSubmit = useMemo(() => {
    if (!wizardToken) return false;
    if (!activeCompanyId) return false;
    if (!scheduleId) return false;

    if (!payDate || !isIsoDateOnly(payDate)) return false;
    if (!startDate || !endDate) return false;
    if (!isIsoDateOnly(startDate) || !isIsoDateOnly(endDate)) return false;
    if (startDate > endDate) return false;

    return true;
  }, [wizardToken, activeCompanyId, scheduleId, startDate, endDate, payDate]);

  async function onStart() {
    if (!canSubmit || busy) return;

    setBusy(true);
    setErr(null);
    setInfo(null);

    try {
      const schedName = selectedSchedule?.name
        ? String(selectedSchedule.name)
        : derivedFrequency
        ? labelFreq(derivedFrequency)
        : "Payroll";

      const runName = `${schedName} payroll (pay date ${payDate})`;

      const res = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardToken,
          pay_schedule_id: scheduleId,
          pay_date: payDate,
          period_start: startDate,
          period_end: endDate,
          run_name: runName,
        }),
      });

      const data: CreateRunResponse | null = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = normalizeMsg(
          data?.error || data?.message || `Failed to create payroll run (${res.status})`
        );
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

      setInfo(
        data?.reusedExisting
          ? "Payroll run already exists. Opening it."
          : "Payroll run created. Opening it."
      );

      setTimeout(() => {
        router.push(`/dashboard/payroll/${runId}`);
      }, 350);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Failed to create payroll run");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-none rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-neutral-900">Payroll Run Wizard</h2>
        <p className="text-sm text-neutral-700">
          Select any pay date you want. WageFlow will keep that pay date and calculate the pay
          period around it from the selected schedule frequency.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-neutral-600">Pay schedule</span>
            <select
              className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
            >
              <option value="">
                {schedules.length ? "Select a pay schedule" : "No schedules for this company"}
              </option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {scheduleLabel(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-neutral-600">Pay date (manual)</span>
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

          <label className="block">
            <span className="text-xs text-neutral-600">Pay period start (calculated)</span>
            <input
              type="date"
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
              value={startDate}
            />
          </label>

          <label className="block">
            <span className="text-xs text-neutral-600">Pay period end (calculated)</span>
            <input
              type="date"
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
              value={endDate}
            />
          </label>
        </div>

        {!wizardToken ? (
          <div className="mt-3 text-sm text-neutral-600">Loading wizard token...</div>
        ) : null}

        {warn ? (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {warn}
          </div>
        ) : null}

        {dateRangeBad ? (
          <div className="mt-3 text-sm text-red-700">
            Pay period start must be on or before pay period end.
          </div>
        ) : null}

        {info ? (
          <div className="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            {info}
          </div>
        ) : null}

        {err ? (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
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
    </div>
  );
}