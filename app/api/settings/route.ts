// C:\Projects\wageflow01\app\api\settings\route.ts

import { NextResponse } from "next/server";
import { env } from "@lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: "settings API disabled on preview" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: null }, { status: 200 });
}

export async function POST() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: "settings API disabled on preview" }, { status: 404 });
  }

  return NextResponse.json({ ok: false, error: "not implemented" }, { status: 501 });
}