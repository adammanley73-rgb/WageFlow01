// C:\Projects\wageflow01\app\api\absence\[id]\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getAdminClientOrThrow() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set on the server.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  let id = "";
  try {
    const p = await ctx.params;
    id = typeof p?.id === "string" ? p.id.trim() : "";
  } catch {
    id = "";
  }

  if (!id) return json(400, { error: "Missing id param" });

  const cookieStore = await cookies();

  const activeCompanyId =
    cookieStore.get("active_company_id")?.value ??
    cookieStore.get("company_id")?.value ??
    "";

  if (!activeCompanyId) {
    return json(400, { error: "No active company selected" });
  }

  let supabase;
  try {
    supabase = getAdminClientOrThrow();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server config missing";
    return json(500, { error: msg });
  }

  const { data, error } = await supabase
    .from("absences")
    .delete()
    .eq("id", id)
    .eq("company_id", activeCompanyId)
    .select("id");

  if (error) return json(500, { error: error.message ?? "Delete failed" });

  const deletedCount = Array.isArray(data) ? data.length : 0;

  if (deletedCount === 0) {
    return json(404, {
      error: "Nothing deleted. Not found for this company_id.",
      id,
      companyId: activeCompanyId,
    });
  }

  return json(200, { deletedId: data![0].id, deletedCount });
}