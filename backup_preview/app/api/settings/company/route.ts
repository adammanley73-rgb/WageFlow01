/* @ts-nocheck */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    settings: { company_name: "Preview Co", pay_schedule: "monthly", address: "", phone: "" }
  });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, saved: body ?? {} });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}

