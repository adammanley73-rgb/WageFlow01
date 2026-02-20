/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\employees\[id]\emergency\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

function json(ok: boolean, status: number, payload: any = {}) {
  return NextResponse.json({ ok, ...payload }, { status });
}

function canonPhone(raw: string) {
  const trimmed = String(raw || "").trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return plus + digits;
}

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing Supabase env. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Some runtimes treat cookies as read-only. Ignore.
        }
      },
    },
  });
}

async function resolveEmployee(supabase: any, rawId: string) {
  const rid = String(rawId || "").trim();
  if (!rid) return null;

  // Try employees.employee_id (text) first
  {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_id, company_id")
      .eq("employee_id", rid)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data;
  }

  // Then try employees.id (uuid) only if it looks like one
  if (isUuid(rid)) {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_id, company_id")
      .eq("id", rid)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data;
  }

  return null;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const supabase = await getSupabase();

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) return json(false, 401, { error: "unauthorized" });

    const params = await ctx.params;
    const emp = await resolveEmployee(supabase, params?.id);
    if (!emp?.id) return json(false, 404, { error: "employee not found" });

    const { data, error } = await supabase
      .from("employee_emergency_contacts")
      .select("contact_name, relationship, phone, email")
      .eq("employee_id", emp.id)
      .maybeSingle();

    if (error) return json(false, 500, { error: error.message });

    if (!data) return new NextResponse(null, { status: 204 });

    return json(true, 200, { data });
  } catch (e: any) {
    return json(false, 500, { error: String(e?.message || e) });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const supabase = await getSupabase();

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) return json(false, 401, { error: "unauthorized" });

    const params = await ctx.params;
    const emp = await resolveEmployee(supabase, params?.id);
    if (!emp?.id || !emp?.company_id) return json(false, 404, { error: "employee not found" });

    const body = await req.json().catch(() => ({}));

    const contact_name = String(body?.contact_name || "").trim();
    const relationship = String(body?.relationship || "").trim();
    const phone = canonPhone(body?.phone || "");
    const email = String(body?.email || "").trim();

    if (!contact_name) return json(false, 400, { error: "Contact name is required." });

    const payload = {
      employee_id: emp.id,
      company_id: emp.company_id,
      contact_name,
      relationship: relationship || null,
      phone: phone || null,
      email: email || null,
    };

    const { error } = await supabase
      .from("employee_emergency_contacts")
      .upsert(payload, { onConflict: "employee_id" });

    if (error) return json(false, 500, { error: error.message });

    return json(true, 200);
  } catch (e: any) {
    return json(false, 500, { error: String(e?.message || e) });
  }
}
