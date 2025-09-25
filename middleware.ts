import { NextResponse } from 'next/server'

// Unconditional block to prove middleware is active in Production
export function middleware() {
  return new NextResponse('MW BLOCK TEST', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="WageFlow Prod"',
      'x-middleware-test': 'blocked',
      'cache-control': 'no-store',
    },
  })
}

// Run on everything except Next internals
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
