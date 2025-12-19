// C:\Users\adamm\Projects\wageflow01\app\api\auth\login\route.ts
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"

type CookieToSet = {
  name: string
  value: string
  options: Record<string, any>
}

function getSupabaseEnv() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""

  return { url, anonKey }
}

export async function POST(req: any) {
  try {
    const { url, anonKey } = getSupabaseEnv()
    if (!url || !anonKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing Supabase env. Need SUPABASE_URL + SUPABASE_ANON_KEY (or NEXT_PUBLIC_ equivalents).",
        },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => ({} as any))
    const email = typeof body?.email === "string" ? body.email.trim() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    const cookiesToSet: CookieToSet[] = []

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return req?.cookies?.getAll?.() ?? []
        },
        setAll(cookies) {
          for (const c of cookies as any[]) cookiesToSet.push(c)
        },
      },
    })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "Login failed" },
        { status: 401 }
      )
    }

    const res = NextResponse.json(
      {
        ok: true,
        user: {
          id: data.user?.id ?? null,
          email: data.user?.email ?? null,
        },
      },
      { status: 200 }
    )

    for (const c of cookiesToSet) {
      res.cookies.set(c.name, c.value, c.options)
    }

    return res
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    )
  }
}
