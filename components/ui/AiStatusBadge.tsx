// C:\Users\adamm\Projects\wageflow01\components\ui\AiStatusBadge.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type AiStatus = "loading" | "online" | "offline" | "degraded";

type AiHealthResponse = {
ok: boolean;
status: "online" | "offline" | "degraded";
aiService: string;
message: string;
aiBaseUrl?: string;
debug?: unknown;
};

const REFRESH_INTERVAL_MS = 30000;

export function AiStatusBadge() {
const [status, setStatus] = useState<AiStatus>("loading");
const [message, setMessage] = useState<string>("Checking AI status");

useEffect(() => {
let isMounted = true;

const fetchStatus = async () => {
  try {
    const res = await fetch("/api/ai/health", {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      if (!isMounted) return;
      setStatus("offline");
      setMessage("AI service offline");
      return;
    }

    const data = (await res.json()) as AiHealthResponse;

    if (!isMounted) return;

    if (data.ok && data.status === "online") {
      setStatus("online");
      setMessage(data.message || "AI service online");
      return;
    }

    if (data.status === "degraded") {
      setStatus("degraded");
      setMessage(data.message || "AI service degraded");
      return;
    }

    setStatus("offline");
    setMessage(data.message || "AI service offline");
  } catch {
    if (!isMounted) return;
    setStatus("offline");
    setMessage("AI unreachable");
  }
};

fetchStatus();
const intervalId = setInterval(fetchStatus, REFRESH_INTERVAL_MS);

return () => {
  isMounted = false;
  clearInterval(intervalId);
};


}, []);

const shortLabel =
status === "loading"
? "AI: Checking"
: status === "online"
? "AI: Online"
: status === "degraded"
? "AI: Degraded"
: "AI: Offline";

return (
<Link
href="/dashboard/ai"
className="group inline-flex shrink-0"
aria-label={shortLabel + " - open AI Copilot"}
>
<div
className="relative inline-flex w-[260px] shrink-0 rounded-2xl p-[2px] shadow-sm transition group-hover:shadow-md"
style={{
background:
"linear-gradient(to right, var(--wf-green), var(--wf-blue))",
}}
>
<div className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2">
<div className="relative h-10 w-10">
<Image src="/AIStatusBadge.png" alt="WageFlow AI status" fill className="object-contain" priority />
</div>

      <div className="flex min-w-0 flex-col leading-tight">
        <span
          className="truncate text-sm font-semibold transition group-hover:opacity-90"
          style={{ color: "var(--wf-blue)" }}
        >
          {shortLabel}
        </span>
        <span className="text-xs text-neutral-700">{message}</span>
      </div>
    </div>
  </div>
</Link>


);
}