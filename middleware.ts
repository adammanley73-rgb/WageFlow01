// C:\Users\adamm\Projects\wageflow01\middleware.ts
import { NextResponse } from "next/server";

/*
Rules (Vercel-safe)
- On Vercel (Preview or Production), never allow auth bypass.
- If no Supabase session cookies exist, redirect /dashboard/* to /login with returnTo.
- After auth is present, enforce company selection cookie for /dashboard/* except /dashboard/companies.
- Additionally, serve the company landing page on the www subdomain.
*/

function isVercelRuntime() {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

function hasSupabaseSession(req: any) {
  const cookies = req?.cookies?.getAll?.() ?? [];
  if (!cookies || cookies.length === 0) return false;

  const names = cookies.map((c: any) => c?.name).filter(Boolean);

  if (names.includes("sb-access-token")) return true;
  if (names.includes("sb-refresh-token")) return true;

  for (const n of names) {
    const lower = String(n).toLowerCase();
    if (!lower.startsWith("sb-")) continue;
    if (lower.includes("auth-token")) return true;
    if (lower.includes("access-token")) return true;
    if (lower.includes("refresh-token")) return true;
  }

  if (names.includes("supabase-auth-token")) return true;

  return false;
}

export function middleware(request: any) {
  const url = request?.nextUrl;
  const pathname = url?.pathname || "";
  const hostHeader =
    request?.headers?.get("host") ||
    url?.hostname ||
    "";

  // Serve the bespoke landing page on the www subdomain root.
  // When someone visits https://www.thebusinessconsortiumltd.co.uk/,
  // rewrite the request to /preview/tbc so that the company landing page is shown.
  if (
    hostHeader === "www.thebusinessconsortiumltd.co.uk" &&
    pathname === "/"
  ) {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = "/preview/tbc";
    return NextResponse.rewrite(rewriteUrl);
  }

  // Only enforce auth on /dashboard/* paths. For any other paths,
  // proceed normally.
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // If running on Vercel, check for Supabase session cookies.
  if (isVercelRuntime()) {
    const authed = hasSupabaseSession(request);

    if (!authed) {
      const loginUrl = new URL("/login", request.url);
      const returnTo = pathname + (url?.search || "");
      loginUrl.searchParams.set("returnTo", returnTo);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow the companies page when authed.
  if (pathname === "/dashboard/companies") {
    return NextResponse.next();
  }

  // Enforce selection of an active company.
  const hasActive = Boolean(
    request?.cookies?.get?.("active_company_id")?.value
  );
  const hasLegacy = Boolean(
    request?.cookies?.get?.("company_id")?.value
  );
  const hasCompany = hasActive || hasLegacy;

  if (!hasCompany) {
    const redirectUrl = new URL("/dashboard/companies", request.url);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// Match both the root path and dashboard routes.
// The root matcher allows us to intercept '/' on all hosts, and the
// subsequent logic in the middleware ensures only the www subdomain is rewritten.
export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
