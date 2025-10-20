// @ts-nocheck
// app/api/active-company/route.ts
// Reads/sets the active company selection via cookies.
// GET  -> returns { id, name } or 204 if none
// POST -> accept { id, name } or { company_id, name } and set cookies

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_ID_A = 'company_id';
const COOKIE_ID_B = 'active_company_id';
const COOKIE_NAME = 'company_name';

function getIds() {
  const jar = cookies();
  const id =
    jar.get(COOKIE_ID_A)?.value ||
    jar.get(COOKIE_ID_B)?.value ||
    '';
  const name = jar.get(COOKIE_NAME)?.value || '';
  return { id, name };
}

function setIds(id: string, name?: string | null) {
  const jar = cookies();
  const opts = {
    path: '/',
    httpOnly: false, // readable by client code if needed
    sameSite: 'lax' as const,
  };
  jar.set(COOKIE_ID_A, id, opts);
  jar.set(COOKIE_ID_B, id, opts);
  if (name) jar.set(COOKIE_NAME, name, opts);
}

export async function GET() {
  const { id, name } = getIds();
  if (!id) return new Response(null, { status: 204 });
  return Response.json({ id, name: name || null }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    // Support JSON or URL query (?id=...&name=...)
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json();
    } else {
      const u = new URL(req.url);
      body.id = u.searchParams.get('id');
      body.company_id = u.searchParams.get('company_id');
      body.name = u.searchParams.get('name');
    }

    const id = String(body.id || body.company_id || '').trim();
    const name = body.name ? String(body.name).trim() : null;

    if (!id) {
      return Response.json({ error: 'missing company id' }, { status: 400 });
    }

    setIds(id, name);

    return Response.json({ id, name }, { status: 200 });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
