// C:\Users\adamm\Projects\wageflow01\middleware.ts
import { NextResponse } from "next/server"

/*
Rules (Vercel-safe)
- On Vercel (Preview or Production), never allow auth bypass.
- If no Supabase session cookies exist, redirect /dashboard/* to /login with returnTo.
- After auth is present, enforce company selection cookie for /dashboard/* except /dashboard/companies.
*/

function isVercelRuntime() {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true"
}

function hasSupabaseSession(req: any) {
  const cookies = req?.cookies?.getAll?.() ?? []
  if (!cookies || cookies.length === 0) return false

  const names = cookies.map((c: any) => c?.name).filter(Boolean)

  if (names.includes("sb-access-token")) return true
  if (names.includes("sb-refresh-token")) return true

  for (const n of names) {
    const lower = String(n).toLowerCase()
    if (!lower.startsWith("sb-")) continue
    if (lower.includes("auth-token")) return true
    if (lower.includes("access-token")) return true
    if (lower.includes("refresh-token")) return true
  }

  if (names.includes("supabase-auth-token")) return true

  return false
}

export function middleware(request: any) {
  const url = request?.nextUrl
  const pathname = url?.pathname || ""

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

  if (isVercelRuntime()) {
    const authed = hasSupabaseSession(request)

    if (!authed) {
      const loginUrl = new URL("/login", request.url)
      const returnTo = pathname + (url?.search || "")
      loginUrl.searchParams.set("returnTo", returnTo)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname === "/dashboard/companies") {
    return NextResponse.next()
  }

  const hasActive = Boolean(request?.cookies?.get?.("active_company_id")?.value)
  const hasLegacy = Boolean(request?.cookies?.get?.("company_id")?.value)
  const hasCompany = hasActive || hasLegacy

  if (!hasCompany) {
    const redirectUrl = new URL("/dashboard/companies", request.url)
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
