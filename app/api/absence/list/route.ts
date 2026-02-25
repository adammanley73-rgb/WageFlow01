// C:\Projects\wageflow01\app\api\absence\list\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function createAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("absence/list route: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

async function getCompanyIdFromCookies() {
  const jar = await cookies();
  return jar.get("active_company_id")?.value || jar.get("company_id")?.value || null;
}

function formatEmployeeLabel(e: any) {
  const name = [e?.first_name, e?.last_name].filter(Boolean).join(" ").trim() || "Employee";
  const num = e?.employee_number ? String(e.employee_number) : "";
  return num ? `${name} (${num})` : name;
}

export async function GET(req: Request) {
  if (env.preview) {
    return json(404, { ok: false, error: "absence/list disabled on preview" });
  }

  try {
    const companyId = await getCompanyIdFromCookies();
    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
    }

    const url = new URL(req.url);
    const employeeId = (url.searchParams.get("employeeId") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const type = (url.searchParams.get("type") || "").trim();
    const limitRaw = (url.searchParams.get("limit") || "").trim();

    const limit = (() => {
      const n = Number(limitRaw);
      if (!Number.isFinite(n) || n <= 0) return 200;
      return Math.min(Math.max(1, Math.floor(n)), 500);
    })();

    const supabase = createAdminClient();

    let q = supabase
      .from("absences")
      .select("id, employee_id, type, status, first_day, last_day_expected, last_day_actual, reference_notes")
      .eq("company_id", companyId)
      .order("first_day", { ascending: false })
      .limit(limit);

    if (employeeId) q = q.eq("employee_id", employeeId);
    if (status) q = q.eq("status", status);
    if (type) q = q.eq("type", type);

    const { data: absences, error } = await q;

    if (error) {
      return json(500, { ok: false, code: "DB_ERROR", message: "Could not load absences.", db: error });
    }

    const rows = Array.isArray(absences) ? absences : [];
    const employeeIds = Array.from(new Set(rows.map((r: any) => r.employee_id).filter(Boolean)));

    const employeeMap: Record<string, any> = {};

    if (employeeIds.length > 0) {
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employee_number")
        .eq("company_id", companyId)
        .in("id", employeeIds);

      if (!empErr && Array.isArray(emps)) {
        for (const e of emps) employeeMap[String(e.id)] = e;
      }
    }

    const items = rows.map((r: any) => {
      const e = employeeMap[String(r.employee_id)] || null;
      return {
        id: r.id,
        employeeId: r.employee_id,
        employeeLabel: e ? formatEmployeeLabel(e) : "Employee",
        type: r.type || null,
        status: r.status || null,
        firstDay: r.first_day || null,
        lastDayExpected: r.last_day_expected || null,
        lastDayActual: r.last_day_actual || null,
        notes: r.reference_notes || null,
      };
    });

    return json(200, { ok: true, items });
  } catch (err: any) {
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error loading absences.",
      details: err?.message ?? String(err),
    });
  }
}