// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\new\page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";

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

type WizardTokenResponse = {
  ok?: boolean;
  wizardToken?: string;
  error?: string;
  message?: string;
};

type CreateRunResponse = {
  ok?: boolean;
  id?: string;
  run_id?: string;
  run?: any;
  error?: string;
  message?: string;
  code?: string;
  debugSource?: string;
};

export default function PayrollNewPage() {
  const router = useRouter();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [payDate, setPayDate] = useState<string>("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");

  const [wizardToken, setWizardToken] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
          const msg =
            data?.error ||
            data?.message ||
            `Failed to get wizard token (${res.status})`;
          if (!cancelled) setErr(String(msg));
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

  const canSubmit = useMemo(() => {
    if (!wizardToken) return false;
    if (!startDate || !endDate || !payDate || !frequency) return false;
    if (startDate > endDate) return false;
    return true;
  }, [wizardToken, startDate, endDate, payDate, frequency]);

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
          period_start: startDate,
          period_end: endDate,
          pay_date: payDate,
          frequency,
        }),
      });

      const data: CreateRunResponse | null = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          `Failed to create payroll run (${res.status})`;
        setErr(String(msg));
        setBusy(false);
        return;
      }

      if (!data?.ok) {
        const msg = data?.error || data?.message || "Failed to create payroll run";
        setErr(String(msg));
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
      <p className="text-sm text-neutral-700">Enter your dates and pay frequency, then start the run.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
          <span className="text-xs text-neutral-600">Payment date</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Pay frequency</span>
          <select
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            <option value="weekly">{labelFreq("weekly")}</option>
            <option value="fortnightly">{labelFreq("fortnightly")}</option>
            <option value="four_weekly">{labelFreq("four_weekly")}</option>
            <option value="monthly">{labelFreq("monthly")}</option>
          </select>
        </label>
      </div>

      {!wizardToken ? (
        <div className="mt-3 text-sm text-neutral-600">Loading wizard token...</div>
      ) : null}

      {startDate && endDate && startDate > endDate ? (
        <div className="mt-3 text-sm text-red-700">
          Pay period start must be on or before pay period end.
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
  );
}
