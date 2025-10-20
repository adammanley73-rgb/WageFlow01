import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Return true if a Supabase session cookie exists.
 * Works for sb-access-token, supabase-auth-token, and similar variants.
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
 * Protect dashboard routes. Let everything else pass.
 * Adjust matcher below if your app paths differ.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public assets and auth pages
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

  // Gate dashboard by session cookie
  if (pathname.startsWith('/dashboard') && !hasSupabaseSession(req)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Limit middleware to relevant routes
export const config = {
  matcher: ['/dashboard/:path*'],
}
