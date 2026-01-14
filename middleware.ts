// C:\Users\adamm\Projects\wageflow01\middleware.ts
import { NextResponse } from "next/server";

/*
Rules (Vercel-safe)
- On Vercel (Preview or Production), never allow auth bypass.
- WageFlow subdomain: require auth for ALL routes except allowlisted public paths (login + auth API + static assets).
- /dashboard/*: if no Supabase session cookies exist, redirect to /login with returnTo.
- After auth is present, enforce company selection cookie for /dashboard/* except /dashboard/companies.
- www host root: rewrite "/" to /preview/tbc (company landing).
- Demo guardrails (shared demo creds):
  - Absolute demo session cap: 60 minutes.
  - Idle timeout: 15 minutes (best-effort server-side in Step 1).
  - If timed out: clear Supabase cookies + demo cookies, redirect to /login with reason.
  - /demo path redirects to /login?demo=1 to keep demo entry consistent.
*/

function isVercelRuntime() {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

function normaliseHost(hostHeader: string) {
  return String(hostHeader || "").split(":")[0].toLowerCase();
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function toInt(v: any) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

// Demo cookies (server-enforced via HttpOnly)
const DEMO_FLAG = "wf_demo";
const DEMO_STARTED = "wf_demo_started";
const DEMO_LAST = "wf_demo_last";

// Demo cookie for UI (NOT HttpOnly so client can show banner later)
const DEMO_UI = "wf_demo_ui";

// 1 hour cap, 15 min idle
const DEMO_MAX_AGE_SEC = 60 * 60;
const DEMO_IDLE_SEC = 15 * 60;

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

  // Next.js static assets and image optimiser
  if (pathname.startsWith("/_next")) return true;

  // Common public files
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;

  // Login/brand assets that must load without auth
  if (pathname === "/wageflow-logo.png") return true;
  if (pathname === "/company-logo.png") return true;
  if (pathname === "/AIStatusBadge.png") return true;

  // Safe-ish common static asset extensions at the site root
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".png")) return true;
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return true;
  if (lower.endsWith(".webp")) return true;
  if (lower.endsWith(".svg")) return true;
  if (lower.endsWith(".ico")) return true;

  return false;
}

function isWageflowPublicPath(pathname: string, method: string) {
  if (isStaticAllowlist(pathname)) return true;

  // Allow login page itself
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;

  // Allow any auth callback routes (if you have them)
  if (pathname.startsWith("/auth")) return true;

  // Allow demo entry path (we redirect it below)
  if (pathname === "/demo" || pathname.startsWith("/demo/")) return true;

  // CRITICAL: allow login API route, otherwise nobody can sign in on Vercel
  if (pathname.startsWith("/api/auth")) return true;

  // Allow diagnostics when signed out (useful for checking prod env)
  if (pathname.startsWith("/api/diag")) return true;

  // Allow lightweight health endpoints if you use them
  if (pathname === "/api/healthcheck") return true;
  if (pathname === "/api/ai-status") return true;

  // Allow AI health publicly (safe: status only)
  if (pathname === "/api/ai/health" || pathname.startsWith("/api/ai/health/"))
    return true;

  // Allow GET on copilot route publicly (safe: your routeâ€™s GET just returns help text)
  if (pathname === "/api/ai/copilot" && method === "GET") return true;

  return false;
}

function isDemoRequest(request: any) {
  return String(request?.cookies?.get?.(DEMO_FLAG)?.value || "") === "1";
}

function clearAuthAndDemoCookies(res: any, request: any) {
  const all = request?.cookies?.getAll?.() ?? [];
  const names: string[] = all.map((c: any) => c?.name).filter(Boolean);

  const shouldClear = (name: string) => {
    const lower = String(name || "").toLowerCase();
    if (!lower) return false;

    if (lower === DEMO_FLAG || lower === DEMO_STARTED || lower === DEMO_LAST || lower === DEMO_UI) return true;

    if (lower.startsWith("sb-")) return true;
    if (lower.includes("supabase")) return true;
    if (lower.includes("auth-token")) return true;

    return false;
  };

  for (const name of names) {
    if (shouldClear(name)) {
      res.cookies.delete(name);
    }
  }
}

function applyDemoTimeoutsOrTouch(
  request: any,
  pathname: string,
  search: string,
  baseUrl: string
): { action: "allow" } | { action: "kill"; reason: string } | { action: "touch"; now: number } {
  const now = nowSec();
  const started = toInt(request?.cookies?.get?.(DEMO_STARTED)?.value);
  const last = toInt(request?.cookies?.get?.(DEMO_LAST)?.value);

  if (!started) {
    return { action: "touch" as const, now };
  }

  const elapsed = now - started;
  if (elapsed > DEMO_MAX_AGE_SEC) {
    return { action: "kill" as const, reason: "Demo session expired (60 min limit)" };
  }

  if (last) {
    const idle = now - last;
    if (idle > DEMO_IDLE_SEC) {
      return { action: "kill" as const, reason: "Demo session timed out (15 min idle)" };
    }
  }

  return { action: "touch" as const, now };
}

function setDemoLastCookies(res: any, now: number) {
  // Server-enforced tracking cookie
  res.cookies.set(DEMO_LAST, String(now), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isVercelRuntime(),
  });

  // UI indicator cookie (for banner later)
  res.cookies.set(DEMO_UI, "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: isVercelRuntime(),
  });
}

export function middleware(request: any) {
  const url = request?.nextUrl;
  const pathname = url?.pathname || "";
  const method = String(request?.method || "GET").toUpperCase();

  const hostHeader = request?.headers?.get("host") || url?.hostname || "";
  const host = normaliseHost(hostHeader);

  // /demo entry point: keep demo flow consistent.
  // Works on any host. Sends user to login with demo marker.
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("demo", "1");
    loginUrl.searchParams.set("returnTo", "/dashboard");
    return NextResponse.redirect(loginUrl);
  }

  // Company landing on www root (and localhost for testing).
  if ((host === "www.thebusinessconsortiumltd.co.uk" || host === "localhost") && pathname === "/") {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = "/preview/tbc";
    return NextResponse.rewrite(rewriteUrl);
  }

  // WageFlow subdomain: lock EVERYTHING down on Vercel unless authed.
  if (isVercelRuntime() && host === "wageflow.thebusinessconsortiumltd.co.uk") {
    const authed = hasSupabaseSession(request);

    if (!authed && !isWageflowPublicPath(pathname, method)) {
      const loginUrl = new URL("/login", request.url);
      const returnTo = pathname + (url?.search || "");
      loginUrl.searchParams.set("returnTo", returnTo);
      return NextResponse.redirect(loginUrl);
    }

    // If authed AND demo, enforce demo timeouts on this host too.
    if (authed && isDemoRequest(request) && !isStaticAllowlist(pathname)) {
      const demoCheck = applyDemoTimeoutsOrTouch(request, pathname, url?.search || "", request.url);

      if (demoCheck.action === "kill") {
        const loginUrl = new URL("/login", request.url);
        const returnTo = pathname + (url?.search || "");
        loginUrl.searchParams.set("returnTo", returnTo);
        loginUrl.searchParams.set("demo", "1");
        loginUrl.searchParams.set("reason", demoCheck.reason);

        const res = NextResponse.redirect(loginUrl);
        clearAuthAndDemoCookies(res, request);
        return res;
      }

      if (demoCheck.action === "touch") {
        const res = NextResponse.next();
        setDemoLastCookies(res, demoCheck.now);
        return res;
      }
    }
  }

  // Only enforce dashboard rules on /dashboard/*
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

      const res = NextResponse.redirect(loginUrl);

      // If a stale demo cookie exists but auth doesn't, clear it.
      if (isDemoRequest(request)) clearAuthAndDemoCookies(res, request);

      return res;
    }
  }

  // Demo guardrails for dashboard routes (when authed).
  if (isVercelRuntime() && isDemoRequest(request) && !isStaticAllowlist(pathname)) {
    const demoCheck = applyDemoTimeoutsOrTouch(request, pathname, url?.search || "", request.url);

    if (demoCheck.action === "kill") {
      const loginUrl = new URL("/login", request.url);
      const returnTo = pathname + (url?.search || "");
      loginUrl.searchParams.set("returnTo", returnTo);
      loginUrl.searchParams.set("demo", "1");
      loginUrl.searchParams.set("reason", demoCheck.reason);

      const res = NextResponse.redirect(loginUrl);
      clearAuthAndDemoCookies(res, request);
      return res;
    }

    // Touch last activity, then continue checks below.
    if (demoCheck.action === "touch") {
      // Allow companies page when authed (but still touch activity).
      if (pathname === "/dashboard/companies") {
        const res = NextResponse.next();
        setDemoLastCookies(res, demoCheck.now);
        return res;
      }

      // Enforce selection of an active company.
      const hasActive = Boolean(request?.cookies?.get?.("active_company_id")?.value);
      const hasLegacy = Boolean(request?.cookies?.get?.("company_id")?.value);
      const hasCompany = hasActive || hasLegacy;

      if (!hasCompany) {
        const redirectUrl = new URL("/dashboard/companies", request.url);
        redirectUrl.search = "";
        const res = NextResponse.redirect(redirectUrl);
        setDemoLastCookies(res, demoCheck.now);
        return res;
      }

      const res = NextResponse.next();
      setDemoLastCookies(res, demoCheck.now);
      return res;
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

export const config = {
  matcher: ["/:path*"],
};
