/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\companies\select\route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const form = await req.formData()
  const companyId = String(form.get("company_id") || "").trim()

  if (!companyId) {
    return NextResponse.redirect(new URL("/dashboard/companies", req.url), 303)
  }

  const res = NextResponse.redirect(new URL("/dashboard", req.url), 303)

  const secure = process.env.NODE_ENV === "production"
  const maxAge = 60 * 60 * 24 * 365

  // Canonical cookie (what most server code should use)
  res.cookies.set("active_company_id", companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge,
    path: "/",
  })

  // Legacy cookie (keep for older code paths if any)
  res.cookies.set("company_id", companyId, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    maxAge,
    path: "/",
  })

  return res
}
