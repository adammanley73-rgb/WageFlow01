import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function getSupabaseServerClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

function parsePayDate(url: URL): string {
  const payDate = url.searchParams.get("payDate");
  if (!payDate) {
    // Default to today if not provided.
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Minimal validation. Expect YYYY-MM-DD.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
    throw new Error("Invalid payDate. Use YYYY-MM-DD");
  }
  return payDate;
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseServerClient();

    // Enforce auth. Your RLS requires authenticated users for compliance_packs.
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "You must be logged in." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const payDate = parsePayDate(url);

    const { data, error } = await supabase.rpc("get_compliance_pack_for_date", {
      p_pay_date: payDate,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "rpc_failed", message: error.message, details: error },
        { status: 500 }
      );
    }

    const pack = Array.isArray(data) ? data[0] : data;

    if (!pack) {
      return NextResponse.json(
        { ok: false, error: "not_found", message: `No compliance pack found for ${payDate}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      source: "rpc:get_compliance_pack_for_date",
      payDate,
      pack,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
