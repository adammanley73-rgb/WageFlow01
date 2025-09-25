/* @ts-nocheck */
import { NextResponse } from 'next/server';
import { env } from '@lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'absence/types disabled on preview' }, { status: 404 });
  }
  // Prod placeholder: no DB call yet
  return NextResponse.json({ ok: true, items: [] }, { status: 200 });
}

export async function POST() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'absence/types disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: false, error: 'not implemented' }, { status: 501 });
}


