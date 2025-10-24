// app/api/active-company/route.ts
import { NextResponse } from "next/server";

function isUuid(v: string) {
  // Basic UUID v4 check
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Use application/json" }, { status: 400 });
    }

    const body = await req.json();
    const companyId = String(body?.company_id || "").trim();

    if (!companyId || !isUuid(companyId)) {
      return NextResponse.json({ error: "Invalid company_id" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true, company_id: companyId }, { status: 200 });

    // Cookie for 30 days, strict, app-wide
    res.cookies.set("active_company_id", companyId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  // Helpful for quick checks
  return NextResponse.json({ ok: true, message: "POST company_id JSON to set cookie" });
}
