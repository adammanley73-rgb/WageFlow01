// C:\Projects\wageflow01\app\api\absence\requests\route.ts

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Disable this WIP API in Preview so the build never touches unfinished code.
// Keep a tiny placeholder in Prod to avoid import chains until the real impl lands.

function disabledOnPreview() {
  return NextResponse.json({ ok: false, error: "absence/requests disabled on preview" }, { status: 404 });
}

export async function GET() {
  if (env.preview) return disabledOnPreview();

  // Prod placeholder (no DB access yet)
  return NextResponse.json({ ok: true, items: [] }, { status: 200 });
}

export async function POST() {
  if (env.preview) return disabledOnPreview();

  // Prod placeholder
  return NextResponse.json({ ok: false, error: "not implemented" }, { status: 501 });
}