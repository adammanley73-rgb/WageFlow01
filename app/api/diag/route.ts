// C:\Projects\wageflow01\app\api\diag\route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isLocalDev() {
  const nodeEnv = String(process.env.NODE_ENV ?? "").toLowerCase();
  const vercel = String(process.env.VERCEL ?? "").toLowerCase();
  return nodeEnv === "development" && vercel !== "1" && vercel !== "true";
}

export async function GET() {
  if (!isLocalDev()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      message: "diag enabled in local dev only",
    },
    { status: 200 }
  );
}
