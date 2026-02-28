// C:\Projects\wageflow01\app\api\absence\entitlements\route.ts

import { NextResponse } from "next/server";
import { env } from "@lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function disabledOnPreview() {
  return NextResponse.json({ ok: false, error: "absence/entitlements disabled on preview" }, { status: 404 });
}

export async function GET() {
  if (env.preview) return disabledOnPreview();

  // Prod placeholder: no DB call yet
  return NextResponse.json({ ok: true, items: [] }, { status: 200 });
}

export async function POST() {
  if (env.preview) return disabledOnPreview();

  return NextResponse.json({ ok: false, error: "not implemented" }, { status: 501 });
}