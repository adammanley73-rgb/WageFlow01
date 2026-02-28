// C:\Projects\wageflow01\app\api\ping\route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { ok: true, ping: "pong", time: new Date().toISOString() },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}