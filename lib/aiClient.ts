// C:\Users\adamm\Projects\wageflow01\lib\aiClient.ts

const DEFAULT_AI_BASE_URL = "http://localhost:3000";

const AI_BASE_URL =
  process.env.WAGEFLOW_AI_BASE_URL && process.env.WAGEFLOW_AI_BASE_URL.trim() !== ""
    ? process.env.WAGEFLOW_AI_BASE_URL.trim()
    : DEFAULT_AI_BASE_URL;

export type AiHealthRaw = {
  ok?: boolean;
  service?: string;
  message?: string;
  [key: string]: unknown;
};

export type AiHealthStatus = {
  ok: boolean;
  status: "online" | "offline" | "degraded";
  raw: AiHealthRaw | null;
  error?: string;
};

export async function checkAiHealth(): Promise<AiHealthStatus> {
  try {
    const url = `${AI_BASE_URL}/api/healthcheck`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    let data: AiHealthRaw | null = null;

    try {
      data = (await res.json()) as AiHealthRaw;
    } catch {
      data = null;
    }

    const isOk = !!data?.ok && res.ok;

    return {
      ok: isOk,
      status: isOk ? "online" : res.ok ? "degraded" : "offline",
      raw: data,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error contacting AI service";

    return {
      ok: false,
      status: "offline",
      raw: null,
      error: message,
    };
  }
}

export function getAiBaseUrl(): string {
  return AI_BASE_URL;
}
