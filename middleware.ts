import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const profile = (process.env.BUILD_PROFILE || 'preview').toLowerCase();

export function middleware(req: NextRequest) {
  if (profile !== 'prod') {
    const p = req.nextUrl.pathname;
    if (p.startsWith('/api/absence/')) {
      return NextResponse.json(
        { ok: false, error: 'absence APIs disabled on preview' },
        { status: 404 }
      );
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
