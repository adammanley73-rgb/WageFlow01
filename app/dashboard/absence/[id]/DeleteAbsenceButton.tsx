// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\[id]\DeleteAbsenceButton.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteAbsenceButtonProps = {
  absenceId: string;
  redirectTo?: string;
};

export default function DeleteAbsenceButton({
  absenceId,
  redirectTo = "/dashboard/absence/list",
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
      const res = await fetch(`/api/absence/${encodeURIComponent(absenceId)}`, {
        method: "DELETE",
        cache: "no-store",
      });

      const contentType = String(res.headers.get("content-type") || "").toLowerCase();

      let json: any = null;
      let text = "";

      if (contentType.includes("application/json")) {
        json = await res.json().catch(() => null);
      } else {
        text = await res.text().catch(() => "");
      }

      if (!res.ok) {
        const message =
          json?.message ||
          json?.error ||
          (res.status === 404
            ? "Delete failed because the absence record was not found."
            : "Delete failed.");
        setMsg(message);
        return;
      }

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
        className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>

      {msg ? (
        <div className="mt-2 text-xs text-red-700">
          {msg}
        </div>
      ) : null}
    </div>
  );
}