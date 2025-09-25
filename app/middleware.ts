import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Only run this in production
  if (process.env.NEXT_PUBLIC_APP_ENV === 'prod') {
    const basicAuth = req.headers.get('authorization')

    const user = process.env.PROD_GATE_USER
    const pass = process.env.PROD_GATE_PASS

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [u, p] = Buffer.from(authValue, 'base64').toString().split(':')

      if (u === user && p === pass) {
        return NextResponse.next()
      }
    }

    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
