import { NextResponse } from 'next/server'

// Basic auth for Production only, using VERCEL_ENV which is guaranteed at runtime
export function middleware(req: any) {
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

// Run on everything
export const config = { matcher: '/:path*' }
