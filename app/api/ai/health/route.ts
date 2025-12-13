// C:\Users\adamm\Projects\wageflow01\app\api\ai\health\route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkAiHealth, getAiBaseUrl } from "@/lib/aiClient";

export async function GET(_req: NextRequest) {
  const health = await checkAiHealth();
  const aiBaseUrl = getAiBaseUrl();

  const payload = {
    ok: health.ok,
    status: health.status,
    aiService: health.raw?.service ?? "wageflow-ai",
    message:
      health.raw?.message ??
      (health.ok ? "AI service responded without a message." : "AI service offline."),
    aiBaseUrl,
    debug: {
      source: "wageflow-main",
      target: "wageflow-ai",
      raw: health.raw,
      error: health.error ?? null,
    },
  };

  const statusCode = health.ok ? 200 : 503;

  return NextResponse.json(payload, { status: statusCode });
}
