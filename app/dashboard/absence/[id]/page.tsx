// C:\Projects\wageflow01\app\dashboard\absence\[id]\page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";
import DeleteAbsenceButton from "./DeleteAbsenceButton";

const CARD = "rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6";

type AbsenceDto = {
  id: string;
  employeeId: string;
  employeeLabel: string;
  type: string | null;
  status: string | null;
  firstDay: string | null;
  lastDayExpected: string | null;
  lastDayActual: string | null;
  referenceNotes: string | null;
};

function getParamId(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return null;
}

export default function AbsenceDetailPage() {
  const params = useParams();
  const router = useRouter();

  const absenceId = useMemo(() => getParamId((params as any)?.id), [params]);

  const [absence, setAbsence] = useState<AbsenceDto | null>(null);
  const [referenceNotes, setReferenceNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      setSaveMsg(null);

      if (!absenceId) {
        setError("Missing absence id in URL.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/absence/${encodeURIComponent(absenceId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || data?.ok === false) {
          const msg =
            data?.message ||
            data?.error ||
            `Could not load absence (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        const a = data?.absence as AbsenceDto | undefined;

        if (!a || !a.id) {
          throw new Error("Absence not found.");
        }

        if (cancelled) return;

        setAbsence(a);
        setReferenceNotes(String(a.referenceNotes || ""));
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load absence.";
        setError(msg);
        console.error("AbsenceDetailPage: load failed", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [absenceId]);

  async function handleSaveNotes() {
    setSaveMsg(null);
    setError(null);

    if (!absenceId || !absence) {
      setError("Missing absence data.");
      return;
    }

    if (!absence.firstDay || !absence.lastDayExpected) {
      setError("Absence dates are missing, cannot save notes from this screen.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        first_day: absence.firstDay,
        last_day_expected: absence.lastDayExpected,
        last_day_actual: absence.lastDayActual || null,
        reference_notes: referenceNotes || null,
      };

      const res = await fetch(`/api/absence/${encodeURIComponent(absenceId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        const code = String(data?.code || "");
        const msg =
          data?.message ||
          data?.error ||
          `Save failed (HTTP ${res.status}).`;

        if (code === "ABSENCE_DATE_OVERLAP") {
          throw new Error("Save blocked because these dates overlap another absence for this employee.");
        }

        throw new Error(msg);
      }

      setSaveMsg("Saved.");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      setError(msg);
      console.error("AbsenceDetailPage: save failed", e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageTemplate title="Absence" currentSection="absence">
      <div className={CARD}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Link
              href="/dashboard/absence/list"
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Back to list
            </Link>
            <Link
              href="/dashboard/absence/new"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--wf-blue)" }}
            >
              New absence
            </Link>
          </div>

          {absenceId ? (
            <Link
              href={`/dashboard/absence/${absenceId}/edit`}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Edit absence
            </Link>
          ) : null}
        </div>

        {isLoading ? (
          <div className="text-sm text-neutral-700">Loading…</div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && absence ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <div className="text-xs text-neutral-500">Employee</div>
                <div className="text-sm font-semibold text-neutral-900">{absence.employeeLabel}</div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <div className="text-xs text-neutral-500">Type</div>
                <div className="text-sm font-semibold text-neutral-900">{absence.type || ""}</div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <div className="text-xs text-neutral-500">Status</div>
                <div className="text-sm font-semibold text-neutral-900">{absence.status || ""}</div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <div className="text-xs text-neutral-500">Dates</div>
                <div className="text-sm font-semibold text-neutral-900">
                  {absence.firstDay || ""}{" "}
                  {absence.lastDayExpected ? `to ${absence.lastDayExpected}` : ""}
                  {absence.lastDayActual ? ` (actual: ${absence.lastDayActual})` : ""}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Notes
              </label>
              <textarea
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Optional notes for this absence record."
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save notes"}
              </button>

              <DeleteAbsenceButton
                absenceId={absence.id}
                redirectTo="/dashboard/absence/list"
              />

              {saveMsg ? (
                <div className="text-sm font-semibold text-emerald-700">{saveMsg}</div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </PageTemplate>
  );
}