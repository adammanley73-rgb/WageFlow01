"use client";

// C:\Users\adamm\Projects\wageflow01\components\ui\LogoutButton.tsx

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  className?: string;
};

export default function LogoutButton({ className = "" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    if (busy) return;
    setBusy(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      try {
        localStorage.removeItem("activeCompanyId");
        localStorage.removeItem("activeCompanyName");
      } catch {
        // ignore storage errors
      }

      router.push("/login");
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
        busy ? "opacity-70 cursor-not-allowed" : "",
        className,
      ].join(" ")}
      aria-label="Log out"
    >
      {busy ? "SIGNING OUT..." : "LOG OUT"}
    </button>
  );
}
