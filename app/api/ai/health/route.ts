// C:\Users\adamm\Projects\wageflow01\app\api\ai\health\route.ts
import { NextResponse } from "next/server";
import { checkAiHealth, getAiBaseUrl } from "@/lib/aiClient";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  try {
    const health = await checkAiHealth();
    const aiBaseUrl = getAiBaseUrl();

    return NextResponse.json({
      ok: true,
      endpoint: "health",
      aiBaseUrl,
      health,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        endpoint: "health",
        aiBaseUrl: null,
        error: message,
        ts: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
