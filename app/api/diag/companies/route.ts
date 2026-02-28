// C:\Projects\wageflow01\app\api\diag\companies\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return String(text ?? "").slice(0, 2000);
  }
}

type RestResult =
  | { ok: true; status: number; statusText: string; bearer: "user" | "anon"; body: unknown }
  | { ok: false; bearer: "user" | "anon"; status?: number; statusText?: string; error?: string; body?: unknown };

export async function GET() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!url || !anon) {
    return NextResponse.json(
      {
        ok: false,
        where: "env",
        message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
      { status: 500 }
    );
  }

  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null as any } }));
  const accessToken: string | null = sessionData?.session?.access_token ? String(sessionData.session.access_token) : null;

  const restUrl = `${url}/rest/v1/my_companies_v?select=*`;

  async function callRest(bearer: "user" | "anon", token: string): Promise<RestResult> {
    try {
      const r = await fetch(restUrl, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const bodyText = await r.text();
      const body = safeBody(bodyText);
      return { ok: r.ok, status: r.status, statusText: r.statusText, bearer, body };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, bearer, error: msg };
    }
  }

  const restAnon = await callRest("anon", anon);
  const restUser = accessToken ? await callRest("user", accessToken) : { ok: false, bearer: "user", error: "NO_SESSION" };

  let sb:
    | {
        ok: true;
        data: unknown;
        error: null;
      }
    | {
        ok: false;
        data: null;
        error: { message?: string; code?: string; details?: string; hint?: string; name?: string } | { thrown: string };
      };

  try {
    const { data, error } = await supabase.from("my_companies_v").select("*");
    if (error) {
      sb = {
        ok: false,
        data: null,
        error: {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
          name: (error as any).name,
        },
      };
    } else {
      sb = { ok: true, data: data ?? [], error: null };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    sb = { ok: false, data: null, error: { thrown: msg } };
  }

  return NextResponse.json({
    ok: true,
    rest: { anon: restAnon, user: restUser },
    supabase: sb,
  });
}