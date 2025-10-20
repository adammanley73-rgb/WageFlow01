// /app/api/select-company/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { company_id } = body;

    if (!company_id || typeof company_id !== "string") {
      return NextResponse.json({ error: "Missing or invalid company_id" }, { status: 400 });
    }

    // Create response
    const res = NextResponse.json({ success: true, company_id });

    // Write a cookie that lasts 7 days (adjust if needed)
    res.cookies.set("company_id", company_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}
