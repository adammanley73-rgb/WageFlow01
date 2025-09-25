/* @ts-nocheck */
import { NextResponse } from 'next/server';
import { env } from '@lib/env';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function GET(_req: Request, _ctx: Params) {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'employees/bank disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, items: [] }, { status: 200 });
}

export async function POST() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'employees/bank disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: false, error: 'not implemented' }, { status: 501 });
}


