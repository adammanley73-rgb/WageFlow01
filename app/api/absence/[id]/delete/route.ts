// C:\Projects\wageflow01\app\api\absence\[id]\delete\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getSupabaseClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey);
}

async function getCompanyIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return (
    cookieStore.get("active_company_id")?.value ||
    cookieStore.get("company_id")?.value ||
    null
  );
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
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

    const supabase = getSupabaseClient();

    const { data: absence, error } = await supabase
      .from("absences")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("id", id)
      .single();

    if (error || !absence) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Absence not found." },
        { status: 404 }
      );
    }

    if (absence.status !== "draft") {
      return NextResponse.json(
        {
          ok: false,
          code: "STATUS_NOT_DRAFT",
          message: "Only draft absences can be deleted.",
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("absences")
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        {
          ok: false,
          code: "DB_ERROR",
          message: "Could not delete this absence. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error while deleting this absence.",
      },
      { status: 500 }
    );
  }
}
