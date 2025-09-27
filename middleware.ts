// middleware.ts at repo root
// Basic Auth only on Vercel Production, or when AUTH_ENABLE === '1'.
// Preview and local stay open. Do not move this file into /app.

import { NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/api/health',
]

// Treat common static assets as public
function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/')
  ) {
    return true
  }
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|map|txt)$/i.test(pathname)) {
    return true
  }
  return false
}

function unauthorized(realm: string) {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  })
}

function ok() {
  return NextResponse.next({
    headers: { 'Cache-Control': 'no-store' },
  })
}

export function middleware(req: Request) {
  const url = new URL(req.url)
  const pathname = url.pathname

  // Skip static/public assets
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Decide if auth is enabled
  // On Vercel: VERCEL="1", VERCEL_ENV in {"production","preview","development"}
  const onVercel = !!process.env.VERCEL
  const vercelEnv = process.env.VERCEL_ENV
  const isVercelProd = onVercel && vercelEnv === 'production'

  // Manual override: set AUTH_ENABLE=1 to force auth anywhere
  const forced = process.env.AUTH_ENABLE === '1'

  const enableAuth = forced || isVercelProd
  if (!enableAuth) {
    return NextResponse.next()
  }

  // Enforce Basic Auth
  const user = process.env.AUTH_USER || ''
  const pass = process.env.AUTH_PASS || ''
  const realm = process.env.AUTH_REALM || 'WageFlow'

  if (!user || !pass) {
    return new NextResponse(
      'Server auth is not configured. Set AUTH_USER and AUTH_PASS.',
      { status: 500 }
    )
  }

  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('basic ')) {
    return unauthorized(realm)
  }

  try {
    const base64 = auth.slice(6).trim()
    // atob is available in the Edge runtime
    const [u, p] = atob(base64).split(':')
    if (u === user && p === pass) {
      return ok()
    }
  } catch {
    // fallthrough
  }

  return unauthorized(realm)
}

// Apply to everything except static assets
export const config = {
  matcher: [
    '/((?!_next/|assets/|images/|fonts/|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
