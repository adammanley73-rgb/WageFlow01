"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DeleteAbsenceButton from "./DeleteAbsenceButton";

type Absence = {
  id: string;
  employee_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  type?: string | null;
  notes?: string | null;
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

  const [absence, setAbsence] = useState<Absence | null>(null);
  const [notes, setNotes] = useState("");
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
        const res = await fetch(`/api/absences/${encodeURIComponent(absenceId)}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          const bodyText = await res.text().catch(() => "");
          throw new Error(bodyText || `Load failed with status ${res.status}.`);
        }

        const data = (await res.json()) as Absence;

        if (cancelled) return;

        setAbsence(data);
        setNotes(data?.notes ?? "");
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

  async function handleSave() {
    setSaveMsg(null);
    setError(null);

    if (!absenceId) {
      setError("Missing absence id.");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`/api/absences/${encodeURIComponent(absenceId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(bodyText || `Save failed with status ${res.status}.`);
      }

      const updated = (await res.json()) as Absence;
      setAbsence(updated);
      setNotes(updated?.notes ?? notes);
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

  if (isLoading) return <div style={{ padding: 16 }}>Loading...</div>;

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>
        <Link href="/dashboard/absence">Back to absences</Link>
      </div>
    );
  }

  if (!absence) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 12 }}>Absence not found.</div>
        <Link href="/dashboard/absence">Back to absences</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/dashboard/absence">Back to absences</Link>
      </div>

      <h1 style={{ fontSize: 20, marginBottom: 12 }}>Absence</h1>

      <div style={{ marginBottom: 12, fontSize: 14, color: "#444" }}>
        <div>ID: {absence.id}</div>
        {absence.start_date ? <div>Start: {absence.start_date}</div> : null}
        {absence.end_date ? <div>End: {absence.end_date}</div> : null}
        {absence.type ? <div>Type: {absence.type}</div> : null}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            fontFamily: "inherit",
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: isSaving ? "not-allowed" : "pointer",
            opacity: isSaving ? 0.7 : 1,
            background: "white",
          }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        <DeleteAbsenceButton absenceId={absence.id} redirectTo="/dashboard/absence" />

        {saveMsg ? <div style={{ fontSize: 14, color: "green" }}>{saveMsg}</div> : null}
      </div>
    </div>
  );
}