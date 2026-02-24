"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  absenceId: string;
};

export default function DeleteAbsenceInlineButton({ absenceId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);

    if (!absenceId) {
      setError("Missing absenceId.");
      return;
    }

    const ok = window.confirm("Delete this absence. This cannot be undone.");
    if (!ok) return;

    setBusy(true);

    try {
      const res = await fetch(`/api/absence/${encodeURIComponent(absenceId)}`, {
        method: "DELETE",
        cache: "no-store",
      });

      const text = await res.text().catch(() => "");
      const body = text
        ? (() => {
            try {
              return JSON.parse(text);
            } catch {
              return text;
            }
          })()
        : null;

      if (!res.ok) {
        const msg = typeof body === "string" ? body : JSON.stringify(body);
        setError(msg || `Delete failed (${res.status}).`);
        return;
      }

      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed.";
      setError(msg);
      console.error("DeleteAbsenceInlineButton: error", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "inline-block" }}>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        style={{
          padding: "8px 14px",
          borderRadius: 12,
          border: "1px solid #2b58ff",
          background: busy ? "#cbd7ff" : "#2b58ff",
          color: "#fff",
          cursor: busy ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        {busy ? "Deleting..." : "Delete"}
      </button>

      {error ? (
        <div style={{ marginTop: 6, color: "crimson", fontSize: 12, maxWidth: 260 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}