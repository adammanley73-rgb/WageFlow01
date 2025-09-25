// middleware.ts
// Preview-safe. Drop the NextRequest type to avoid TS treating it as a value.

import { NextResponse } from "next/server";

const profile = (process.env.BUILD_PROFILE || "preview").toLowerCase();

export function middleware(req: any) {
  if (profile !== "prod") {
    const p = req.nextUrl?.pathname || "/";
    if (p.startsWith("/api/absence/") || p.startsWith("/api/employees/")) {
      return NextResponse.json({ ok: true, preview: true }, { status: 200 });
    }
  }
  return NextResponse.next();
}
