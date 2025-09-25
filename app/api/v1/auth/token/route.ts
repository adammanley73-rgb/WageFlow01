/* @ts-nocheck */
import { NextResponse } from "next/server";

// Preview stub: accept any email/password and return a fake token
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Missing credentials" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, token: "preview-token", user: { email } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}

