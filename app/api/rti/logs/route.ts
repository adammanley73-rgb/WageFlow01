// File: app/api/rti/logs/route.ts
// Purpose: stop Next from trying to prerender this API route and blowing up when Supabase env vars are missing.
// Notes:
// - Forces dynamic at runtime and disables ISR.
// - Lazily creates the Supabase client inside the handler so build doesn't require env vars.
// - Returns 503 if Supabase is not configured yet.

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'

export async function GET(_req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: 'Supabase not configured (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)' },
      { status: 503 }
    )
  }

  // Lazy import to avoid touching supabase-js at build time
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, anon)

  // Replace with real query when wiring logs
  // Example:
  // const { data, error } = await supabase.from('rti_logs').select('*').order('created_at', { ascending: false }).limit(50)
  // if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, logs: [] }, { status: 200 })
}
