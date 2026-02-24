"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteAbsenceButtonProps = {
  absenceId: string;
  redirectTo?: string;
};

export default function DeleteAbsenceButton({
  absenceId,
  redirectTo = "/dashboard/absence",
}: DeleteAbsenceButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleDelete() {
    setMsg(null);

    if (!absenceId) {
      setMsg("Missing absence id.");
      return;
    }

    const ok = window.confirm("Delete this absence. This cannot be undone.");
    if (!ok) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/absences/${encodeURIComponent(absenceId)}`, {
        method: "DELETE",
        cache: "no-store",
      });

      const text = await res.text().catch(() => "");
      const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

      if (!res.ok) {
        setMsg(typeof body === "string" ? body : JSON.stringify(body));
        return;
      }

      setMsg(typeof body === "string" ? body : JSON.stringify(body));

      router.push(redirectTo);
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Delete failed.");
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ccc",
          cursor: isDeleting ? "not-allowed" : "pointer",
          opacity: isDeleting ? 0.7 : 1,
          background: "white",
        }}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>

      {msg ? (
        <div style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap" }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}