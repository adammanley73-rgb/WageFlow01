/* app/api/clear-company/route.ts */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_request: Request) {
  // Clear both cookies used by the app
  const res = new NextResponse(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  res.cookies.set("active_company_id", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  res.cookies.set("company_id", "", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return res;
}

export async function GET() {
  // Handy ping for debugging
  return NextResponse.json({ status: "ready" });
}
