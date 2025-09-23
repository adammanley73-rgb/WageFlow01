import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const bypass =
    process.env.AUTH_BYPASS === '1' ||
    process.env.NEXT_PUBLIC_AUTH_BYPASS === '1';

  // If bypass is on, any visit to /login goes to /dashboard
  if (bypass && req.nextUrl.pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login'],
};
