// C:\Projects\wageflow01\app\api\diag\supabase\route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, reason: "missing env", url: Boolean(url), anon: Boolean(anon) },
      { status: 500 }
    );
  }

  try {
    const r = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      cache: "no-store",
    });

    return NextResponse.json({ ok: r.ok, status: r.status, statusText: r.statusText });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, reason: "fetch failed", message: msg }, { status: 500 });
  }
}