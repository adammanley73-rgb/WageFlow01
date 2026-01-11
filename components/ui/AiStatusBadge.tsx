// C:\Users\adamm\Projects\wageflow01\components\ui\AiStatusBadge.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type AiStatus = "loading" | "online" | "offline" | "degraded";

type AiHealthResponse = {
  // v1 shape (what your component originally expected)
  ok?: boolean;
  status?: "online" | "offline" | "degraded";
  aiService?: string;
  message?: string;
  aiBaseUrl?: string;
  debug?: unknown;

  // v2 shape (what your production endpoint is currently returning)
  endpoint?: string;
  ts?: string;
  health?: {
    ok?: boolean;
    status?: "online" | "offline" | "degraded";
    raw?: any;
    error?: string | null;
  };
};

const REFRESH_INTERVAL_MS = 30000;

function normalizeAiHealth(data: AiHealthResponse | null): { status: AiStatus; message: string } {
  if (!data) return { status: "offline", message: "AI unreachable" };

  const derivedStatus =
    data.status ??
    data.health?.status ??
    (data.ok ? "degraded" : "offline");

  const status: AiStatus =
    derivedStatus === "online" ? "online" : derivedStatus === "degraded" ? "degraded" : "offline";

  const msgFromV1 = typeof data.message === "string" ? data.message : "";
  const msgFromV2 =
    typeof data.health?.raw?.message === "string"
      ? data.health?.raw?.message
      : typeof data.health?.error === "string"
      ? data.health?.error
      : "";

  const fallback =
    status === "online"
      ? "AI service online"
      : status === "degraded"
      ? "AI service degraded"
      : "AI service offline";

  const message = (msgFromV1 || msgFromV2 || fallback).trim();

  return { status, message };
}

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

        // If the endpoint itself fails, it’s offline (or unreachable)
        if (!res.ok) {
          if (!isMounted) return;
          setStatus("offline");
          setMessage("AI service offline");
          return;
        }

        let data: AiHealthResponse | null = null;
        try {
          data = (await res.json()) as AiHealthResponse;
        } catch {
          data = null;
        }

        if (!isMounted) return;

        const normalized = normalizeAiHealth(data);
        setStatus(normalized.status);
        setMessage(normalized.message);
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
          background: "linear-gradient(to right, var(--wf-green), var(--wf-blue))",
        }}
      >
        <div className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2">
          <div className="relative h-10 w-10">
            <Image
              src="/AIStatusBadge.png"
              alt="WageFlow AI status"
              fill
              className="object-contain"
              priority
            />
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
