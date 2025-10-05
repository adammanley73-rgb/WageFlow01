/* app/api/diag/supabase/route.ts */
/* @ts-nocheck */
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    return NextResponse.json({ ok: false, reason: 'missing env', url: !!url, anon: !!anon }, { status: 500 })
  }

  try {
    // Supabase health endpoint
    const r = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      // 5s timeout guard
      cache: 'no-store',
    })

    return NextResponse.json({ ok: r.ok, status: r.status, statusText: r.statusText })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: 'fetch failed', message: e?.message }, { status: 500 })
  }
}
