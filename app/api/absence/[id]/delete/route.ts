// C:\Projects\wageflow01\app\api\absence\[id]\delete\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

async function getCompanyIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();

  const a = String(cookieStore.get("active_company_id")?.value ?? "").trim();
  if (a) return a;

  const legacy = String(cookieStore.get("company_id")?.value ?? "").trim();
  if (legacy) return legacy;

  return null;
}

function statusFromErr(err: unknown, fallback = 500): number {
  const anyErr = err as { status?: unknown } | null;
  const s = Number(anyErr?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." },
      { status: 401 }
    );
  }

  try {
    const resolvedParams = await context.params;
    const absenceId = String(resolvedParams?.id ?? "").trim();

    if (!absenceId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_ID", message: "Absence id is required." },
        { status: 400 }
      );
    }

    const companyId = await getCompanyIdFromCookies();
    if (!companyId) {
      return NextResponse.json(
        { ok: false, code: "NO_COMPANY", message: "No active company selected." },
        { status: 400 }
      );
    }

    const { data: absence, error } = await supabase
      .from("absences")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("id", absenceId)
      .maybeSingle<{ id: string; status: string | null }>();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: "Could not load this absence." },
        { status: statusFromErr(error) }
      );
    }

    if (!absence?.id) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Absence not found." },
        { status: 404 }
      );
    }

    if (String(absence.status ?? "") !== "draft") {
      return NextResponse.json(
        { ok: false, code: "STATUS_NOT_DRAFT", message: "Only draft absences can be deleted." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("absences")
      .delete()
      .eq("company_id", companyId)
      .eq("id", absenceId);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: "Could not delete this absence. Please try again." },
        { status: statusFromErr(deleteError) }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, code: "UNEXPECTED_ERROR", message: "Unexpected error while deleting this absence." },
      { status: 500 }
    );
  }
}