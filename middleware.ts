import { NextResponse } from 'next/server';

function hasSupabaseSession(req: any): boolean {
  // Supabase cookies vary by project; this covers common names.
  for (const c of req.cookies.getAll?.() ?? []) {
    if (c.name === 'sb-access-token' || c.name === 'supabase-auth-token') return true;
    if (c.name.startsWith?.('sb-') && c.name.endsWith?.('-auth-token')) return true;
  }
  return false;
}

export function middleware(req: any) {
  // If you want strict protection, redirect when no session:
  // if (!hasSupabaseSession(req)) {
  //   const url = new URL('/auth/sign-in', req.nextUrl.origin);
  //   url.searchParams.set('redirect', req.nextUrl.pathname);
  //   return NextResponse.redirect(url);
  // }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
