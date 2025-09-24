import { NextResponse } from 'next/server';
import { env } from '@lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'payroll API disabled on preview' }, { status: 404 });
  }
  // Prod placeholder
  return NextResponse.json({ ok: true, items: [] }, { status: 200 });
}

export async function POST() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'payroll API disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: false, error: 'not implemented' }, { status: 501 });
}
