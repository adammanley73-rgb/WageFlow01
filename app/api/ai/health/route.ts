// C:\Users\adamm\Projects\wageflow01\app\api\ai\health\route.ts
import { NextResponse } from "next/server";
import { checkAiHealth } from "@/lib/aiClient";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkAiHealth();

  return NextResponse.json({
    ok: health.ok,
    status: health.status,
    aiService: "wageflow-ai",
    message: health.error || (health.ok ? "AI service online" : "AI service offline"),
    aiBaseUrl: process.env.WAGEFLOW_AI_BASE_URL,
    debug: health.raw,
  });
}
