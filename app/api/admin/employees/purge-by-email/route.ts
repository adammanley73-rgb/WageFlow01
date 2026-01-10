// C:\Users\adamm\Projects\wageflow01\app\api\admin\employees\purge-by-email\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getServiceKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
  ).trim();
}

/**
 * OPTIONAL SAFETY: require a one-time admin token to call this endpoint.
 * Set ADMIN_PURGE_TOKEN in Vercel + .env.local.
 * If you do not want this safety, delete this function and the call below.
 */
function assertAdminToken(req: Request) {
  const expected = (process.env.ADMIN_PURGE_TOKEN || "").trim();
  if (!expected) return; // if not set, we don't block (backwards compatible)

  const provided = (req.headers.get("x-admin-token") || "").trim();
  if (!provided || provided !== expected) {
    throw new Error("Forbidden");
  }
}

export async function POST(req: Request) {
  try {
    assertAdminToken(req);

    const supabaseUrl =
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();

    const serviceKey = getServiceKey();

    if (!supabaseUrl || !serviceKey) {
      throw new Error(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").toString().trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Missing email" },
        { status: 400 }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Find auth user by email
    const { data: users, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listErr) throw listErr;

    const match = (users?.users || []).find(
      (u) => (u.email || "").toLowerCase() === email
    );

    if (!match?.id) {
      return NextResponse.json({ ok: true, message: "No user found" });
    }

    const userId = match.id;

    // 2) Delete auth user
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (delAuthErr) throw delAuthErr;

    // 3) Best-effort cleanup in your own tables (ignore errors if tables differ)
    // Add/remove table deletes as your schema evolves.
    await admin.from("company_members").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    return NextResponse.json({
      ok: true,
      purged: { email, userId },
    });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
