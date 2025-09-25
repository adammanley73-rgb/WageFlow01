/* @ts-nocheck */
import { NextResponse } from 'next/server';
import { env } from '@lib/env';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, _ctx: Ctx) {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'employees/[id] disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item: null }, { status: 200 });
}

export async function DELETE(_req: Request, _ctx: Ctx) {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: 'employees/[id] disabled on preview' }, { status: 404 });
  }
  return NextResponse.json({ ok: false, error: 'not implemented' }, { status: 501 });
}


