// C:\Users\adamm\Projects\wageflow01\app\api\active-company\set\route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const raw = body?.companyId ?? body?.company_id ?? body?.id ?? null;
    const companyId = typeof raw === "string" ? raw.trim() : "";

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
    }

    if (!isUuid(companyId)) {
      return NextResponse.json({ ok: false, error: "Invalid companyId (must be UUID)" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set("active_company_id", companyId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (e) {
    console.error("active-company/set POST error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
