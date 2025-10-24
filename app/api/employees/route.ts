/* C:\Users\adamm\Projects\wageflow01\app\api\employees\route.ts
   CI-safe stub. No NextRequest anywhere.
*/

import { NextResponse } from "next/server";

// GET: placeholder response to keep builds green
export async function GET() {
  return NextResponse.json({ ok: true, employees: [] }, { status: 200 });
}

// POST: accept JSON body safely and echo back
export async function POST(req: Request) {
  try {
    const data = await req.json().catch(() => null);
    return NextResponse.json({ ok: true, received: data ?? null }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Unexpected server error" }, { status: 500 });
  }
}
