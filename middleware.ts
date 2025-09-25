import { NextResponse } from 'next/server'

export function middleware() {
  return new NextResponse('MIDDLEWARE ACTIVE', { status: 200 })
}

export const config = {
  matcher: '/:path*',
}
