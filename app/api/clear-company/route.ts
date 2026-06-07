// C:\Projects\wageflow01\app\api\clear-company\route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CookieResponse = ReturnType<typeof NextResponse.json>;

function clearCompanyCookies(res: CookieResponse) {
  res.cookies.set("active_company_id", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  res.cookies.set("company_id", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export async function POST() {
  const res = NextResponse.json({ ok: true, success: true }, { status: 200 });
  clearCompanyCookies(res);
  return res;
}

export async function GET() {
  return NextResponse.json({ status: "ready" });
}
