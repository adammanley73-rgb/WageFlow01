/* middleware.ts */
import { NextResponse } from "next/server";

/**
 * Rules
 * - If user visits any /dashboard page except /dashboard/companies
 *   and has no company cookie, send them to /dashboard/companies.
 * - Allow /dashboard/companies always (needed to pick the company).
 * - Allow API endpoints used by this flow.
 * - Do not touch static assets or Next internals.
 */
export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only care about /dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Always allow the selection page itself
  if (pathname === "/dashboard/companies") {
    return NextResponse.next();
  }

  // Allow our company APIs
  if (
    pathname.startsWith("/api/companies") ||
    pathname.startsWith("/api/select-company")
  ) {
    return NextResponse.next();
  }

  // Read cookies directly from the header
  const cookieHeader = request.headers.get("cookie") || "";
  const hasActive = /active_company_id=([^;]+)/.test(cookieHeader);
  const hasLegacy = /company_id=([^;]+)/.test(cookieHeader);

  const hasCompany = hasActive || hasLegacy;

  // If no company cookie, force selection
  if (!hasCompany) {
    const redirectUrl = new URL("/dashboard/companies", request.url);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Otherwise, allow through
  return NextResponse.next();
}

/**
 * Only run this middleware on /dashboard/** routes.
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
