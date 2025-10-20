// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Return true if a Supabase session cookie exists.
 * Covers sb-access-token and supabase-auth-token variants.
 */
function hasSupabaseSession(req: NextRequest): boolean {
  const cookies = req.cookies.getAll()
  for (const c of cookies) {
    const n = c.name
    if (
      n === 'sb-access-token' ||
      n === 'supabase-auth-token' ||
      (n.startsWith('sb-') && n.endsWith('-auth-token'))
    ) {
      return true
    }
  }
  return false
}

/**
 * Gate dashboard routes behind a Supabase session.
 * Adjust allowed paths to match your app.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public and system paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/public') ||
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth')
  ) {
    return NextResponse.next()
  }

  // Protect dashboard
  if (pathname.startsWith('/dashboard') && !hasSupabaseSession(req)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
