import { NextResponse } from 'next/server';
import { env } from '@lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'settings API disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item: null }, { status: 200 });
}

export async function POST() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'settings API disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: false, error: 'not implemented' }, { status: 501 });
}
