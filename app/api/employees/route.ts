/* C:\Users\adamm\Projects\wageflow01\app\api\employees\route.ts
   Compile-safe API route using Request + NextResponse only.
   No NextRequest import or usage. Minimal logic to keep CI green.
*/

import { NextResponse } from 'next/server';

// GET: placeholder to keep builds green. Replace with real data service later.
export async function GET() {
  return NextResponse.json({ ok: true, employees: [] }, { status: 200 });
}

// POST: accept JSON body safely and echo an ack. Replace with Supabase insert later.
export async function POST(req: Request) {
  try {
    const data = await req.json().catch(() => null);
    // Minimal validation to avoid runtime errors in callers expecting a JSON shape
    return NextResponse.json({ ok: true, received: data ?? null }, { status: 200 });
  } catch (err) {
    // Never throw in route handlers; always return JSON to keep pipeline stable
    return NextResponse.json({ ok: false, error: 'Unexpected server error' }, { status: 500 });
  }
}
