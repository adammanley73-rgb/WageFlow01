// /app/api/clear-company/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  // Create a JSON response
  const res = NextResponse.json({ success: true });

  // Remove the company_id cookie by setting it to empty with immediate expiry
  res.cookies.set("company_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
