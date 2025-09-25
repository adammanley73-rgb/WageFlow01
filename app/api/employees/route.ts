/* @ts-nocheck */
import { NextResponse } from 'next/server';
import { env } from '@lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'employees index disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, items: [] }, { status: 200 });
}


