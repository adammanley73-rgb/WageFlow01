/* app/api/select-company/route.ts */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const company_id = typeof body?.company_id === "string" ? body.company_id : null;

    if (!company_id) {
      console.error("Missing company_id in payload:", body);
      return NextResponse.json({ error: "Missing company_id" }, { status: 400 });
    }

    console.log("Setting active company cookie:", company_id);

    const res = new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    res.cookies.set("active_company_id", company_id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    res.cookies.set("company_id", company_id, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (err) {
    console.error("select-company error:", err);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }
}

export async function GET() {
  // Simple GET for debugging
  return NextResponse.json({ status: "ready" });
}
