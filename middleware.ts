import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {

// NextAuth cookies. If you later use a custom cookie, update this check accordingly.

const sessionCookie =

req.cookies.get('next-auth.session-token') ||

req.cookies.get('__Secure-next-auth.session-token');

const { pathname, search } = req.nextUrl;

const isDashboard = pathname.startsWith('/dashboard');

// Protect /dashboard only. Never intercept /login.

if (isDashboard && !sessionCookie) {

const loginUrl = new URL('/login', req.url);

loginUrl.searchParams.set('callbackUrl', pathname + search);

return NextResponse.redirect(loginUrl);

}

return NextResponse.next();

}

export const config = {

matcher: ['/dashboard/:path*'],

};