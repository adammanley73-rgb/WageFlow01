// app/api/preview/route.ts
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search;
  const upstream = `http://localhost:3001/api/preview${qs}`;
  const r = await fetch(upstream, { cache: 'no-store' });
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' }
  });
}
