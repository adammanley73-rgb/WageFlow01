/* E:\Projects\wageflow01\app\api\admin\employees\purge-by-email\route.ts */

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
  if (!expected) return; // backwards compatible

  const provided = (req.headers.get("x-admin-token") || "").trim();
  if (!provided || provided !== expected) {
    throw new Error("Forbidden");
  }
}

type CleanupResult = {
  table: string;
  ok: boolean;
  count?: number | null;
  error?: string | null;
};

async function bestEffortDelete(
  admin: ReturnType<typeof createClient>,
  table: string,
  run: () => Promise<{ count?: number | null; error?: any }>
): Promise<CleanupResult> {
  try {
    const { count, error } = await run();
    if (error) {
      return { table, ok: false, count: count ?? null, error: error?.message || String(error) };
    }
    return { table, ok: true, count: count ?? null, error: null };
  } catch (e: any) {
    return { table, ok: false, count: null, error: e?.message || String(e) };
  }
}

export async function POST(req: Request) {
  try {
    assertAdminToken(req);

    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      ""
    ).trim();

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

    // 2) Best-effort cleanup in app tables first (so if something fails, auth user still exists)
    const cleanup: CleanupResult[] = [];

    cleanup.push(
      await bestEffortDelete(admin, "company_memberships", async () => {
        const { count, error } = await admin
          .from("company_memberships")
          .delete({ count: "exact" })
          .or(`user_id.eq.${userId},user_id_uuid.eq.${userId}`);
        return { count, error };
      })
    );

    cleanup.push(
      await bestEffortDelete(admin, "profiles", async () => {
        const { count, error } = await admin
          .from("profiles")
          .delete({ count: "exact" })
          .eq("id", userId);
        return { count, error };
      })
    );

    // Legacy table name (kept as a best-effort delete so older schemas don't leave junk behind)
    cleanup.push(
      await bestEffortDelete(admin, "company_members (legacy)", async () => {
        const { count, error } = await admin
          .from("company_members")
          .delete({ count: "exact" })
          .eq("user_id", userId);
        return { count, error };
      })
    );

    // 3) Delete auth user (final step)
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (delAuthErr) throw delAuthErr;

    return NextResponse.json({
      ok: true,
      purged: { email, userId },
      cleanup,
    });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
