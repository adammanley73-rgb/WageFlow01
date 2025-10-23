/* C:\Users\adamm\Projects\wageflow01\middleware.ts */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware redirect:
 * - If user hits /dashboard (root of the app),
 *   redirect them to /dashboard/companies.
 * - All other routes continue normally.
 * - If they already go directly to /dashboard/companies or elsewhere, do nothing.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only trigger on root dashboard path (no trailing slash after /dashboard)
  if (pathname === "/dashboard") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/companies";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Matcher: run middleware only for dashboard root.
 */
export const config = {
  matcher: ["/dashboard"],
};
