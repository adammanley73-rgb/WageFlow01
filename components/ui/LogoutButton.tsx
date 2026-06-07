// C:\Projects\wageflow01\components\ui\LogoutButton.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  className?: string;
};

async function clearCompanySelection() {
  try {
    await fetch("/api/clear-company", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // Logout should continue even if the cleanup endpoint is unavailable.
  }

  try {
    localStorage.removeItem("activeCompanyId");
    localStorage.removeItem("activeCompanyName");
    localStorage.removeItem("companyId");
    localStorage.removeItem("companyName");
  } catch {
    // Ignore storage errors.
  }
}

export default function LogoutButton({ className = "" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    if (busy) return;
    setBusy(true);

    try {
      await clearCompanySelection();

      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("Supabase sign out failed, redirecting to login anyway:", e);
      }

      await clearCompanySelection();

      router.replace("/login");
      router.refresh();
    } catch {
      setBusy(false);
      alert("Could not log out. Please try again.");
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className={[
        "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
        "bg-rose-600 text-white uppercase tracking-wide",
        "hover:bg-rose-700",
        "focus:outline-none focus:ring-2 focus:ring-rose-300",
        busy ? "cursor-not-allowed opacity-70" : "",
        className,
      ].join(" ")}
      aria-label="Log out"
    >
      {busy ? "SIGNING OUT..." : "LOG OUT"}
    </button>
  );
}
