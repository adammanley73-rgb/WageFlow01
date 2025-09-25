import { NextResponse } from 'next/server'

export function middleware(req: any) {
  // Always run this in production environment
  if (process.env.VERCEL_ENV === 'production') {
    const auth = req.headers.get('authorization')
    const user = process.env.PROD_GATE_USER
    const pass = process.env.PROD_GATE_PASS

    if (auth && user && pass) {
      const [scheme, b64] = auth.split(' ')
      if (scheme?.toLowerCase() === 'basic' && b64) {
        const [u, p] = Buffer.from(b64, 'base64').toString().split(':')
        if (u === user && p === pass) {
          return NextResponse.next()
        }
      }
    }

    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="WageFlow Prod"' },
    })
  }

  return NextResponse.next()
}

// Force middleware on everything, even static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
