import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function hasSupabaseSession(req: NextRequest) {
  // Supabase sets a project-scoped cookie like: sb-<project-ref>-auth-token
  for (const c of req.cookies.getAll()) {
    if (c.name === 'sb-access-token' || c.name === 'supabase-auth-token') return true;
    if (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) return true;
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // allow static, images, favicon, and sign-in
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/auth/sign-in')
  ) {
    return NextResponse.next();
  }

  // protect dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!hasSupabaseSession(req)) {
      const url = new URL('/auth/sign-in', origin);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
};
