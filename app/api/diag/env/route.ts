// C:\Projects\wageflow01\app\api\diag\env\route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isLocalDev() {
  const nodeEnv = String(process.env.NODE_ENV ?? "").toLowerCase();
  const vercel = String(process.env.VERCEL ?? "").toLowerCase();
  return nodeEnv === "development" && vercel !== "1" && vercel !== "true";
}

export async function GET() {
  // Never expose environment presence hints outside local dev.
  if (!isLocalDev()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV ?? null,
        VERCEL: process.env.VERCEL ?? null,
      },
    },
    { status: 200 }
  );
}
