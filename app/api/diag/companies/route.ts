/* @ts-nocheck */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeBody(s: string) {
  try { return JSON.parse(s) } catch { return s?.slice?.(0, 2000) ?? s }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, where: 'env', message: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' },
      { status: 500 }
    )
  }

  const restUrl = `${url}/rest/v1/my_companies_v?select=*`

  // 1) Raw REST call (bypasses our Supabase client wrapper)
  let rest
  try {
    const r = await fetch(restUrl, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      cache: 'no-store',
    })
    const body = await r.text()
    rest = { ok: r.ok, status: r.status, statusText: r.statusText, body: safeBody(body) }
  } catch (e: any) {
    rest = { ok: false, error: e?.message || String(e) }
  }

  // 2) Supabase client call (uses @supabase/ssr with cookies)
  let sb
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('my_companies_v').select('*')
    sb = {
      ok: !error,
      data,
      error: error
        ? { message: error.message, code: error.code, details: error.details, hint: error.hint, name: error.name }
        : null,
    }
  } catch (e: any) {
    sb = { ok: false, thrown: e?.message || String(e) }
  }

  return NextResponse.json({ rest, supabase: sb })
}
