// C:\Projects\wageflow01\app\api\settings\company\route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    ok: true,
    settings: {
      company_name: "Preview Co",
      pay_schedule: "monthly",
      address: "",
      phone: "",
    },
  });
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as unknown;
    return NextResponse.json({ ok: true, saved: body ?? {} });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}