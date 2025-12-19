// C:\Users\adamm\Projects\wageflow01\app\api\diag\env\route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function host(input?: string | null) {
  try {
    if (!input) return null
    return new URL(input).host
  } catch {
    return null
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    env: {
      VERCEL: process.env.VERCEL ?? null,
      NODE_ENV: process.env.NODE_ENV ?? null,

      has_SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_URL_host: host(process.env.SUPABASE_URL),

      has_SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,

      has_NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL_host: host(process.env.NEXT_PUBLIC_SUPABASE_URL),

      has_NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,

      AUTH_BYPASS: process.env.AUTH_BYPASS ?? null,
      NEXT_PUBLIC_AUTH_BYPASS: process.env.NEXT_PUBLIC_AUTH_BYPASS ?? null,
    },
  })
}
