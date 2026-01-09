// C:\Users\adamm\Projects\wageflow01\middleware.ts
import { NextResponse } from "next/server";

/*
Rules (Vercel-safe)
- On Vercel (Preview or Production), never allow auth bypass.
- WageFlow subdomain: require auth for ALL routes except allowlisted public paths (login + static).
- /dashboard/*: if no Supabase session cookies exist, redirect to /login with returnTo.
- After auth is present, enforce company selection cookie for /dashboard/* except /dashboard/companies.
- www host root: rewrite "/" to /preview/tbc (company landing).
*/

function isVercelRuntime() {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

function normaliseHost(hostHeader: string) {
  return String(hostHeader || "").split(":")[0].toLowerCase();
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

function isStaticAllowlist(pathname: string) {
  if (!pathname) return false;

  // Next.js static assets and images
  if (pathname.startsWith("/_next")) return true;

  // Common public files
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;

  // Public assets in /public
  if (pathname.startsWith("/company-logo")) return true;

  return false;
}

function isWageflowPublicPath(pathname: string) {
  if (isStaticAllowlist(pathname)) return true;

  // Allow login page itself
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;

  // If you have any auth callback routes, don’t block them
  if (pathname.startsWith("/auth")) return true;

  // Allow lightweight health endpoints if you use them
  if (pathname === "/api/healthcheck") return true;
  if (pathname === "/api/ai-status") return true;

  return false;
}

export function middleware(request: any) {
  const url = request?.nextUrl;
  const pathname = url?.pathname || "";
  const hostHeader = request?.headers?.get("host") || url?.hostname || "";
  const host = normaliseHost(hostHeader);

  // Company landing on www root.
  if (host === "www.thebusinessconsortiumltd.co.uk" && pathname === "/") {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = "/preview/tbc";
    return NextResponse.rewrite(rewriteUrl);
  }

  // WageFlow subdomain: lock EVERYTHING down on Vercel unless authed.
  // This ensures visitors cannot browse the app without demo credentials.
  if (isVercelRuntime() && host === "wageflow.thebusinessconsortiumltd.co.uk") {
    const authed = hasSupabaseSession(request);
    if (!authed && !isWageflowPublicPath(pathname)) {
      const loginUrl = new URL("/login", request.url);
      const returnTo = pathname + (url?.search || "");
      loginUrl.searchParams.set("returnTo", returnTo);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Only enforce dashboard rules on /dashboard/*.
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Enforce auth on Vercel for /dashboard/*
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
  const hasActive = Boolean(request?.cookies?.get?.("active_company_id")?.value);
  const hasLegacy = Boolean(request?.cookies?.get?.("company_id")?.value);
  const hasCompany = hasActive || hasLegacy;

  if (!hasCompany) {
    const redirectUrl = new URL("/dashboard/companies", request.url);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// Run middleware on all routes so the wageflow subdomain can be fully gated.
export const config = {
  matcher: ["/:path*"],
};
