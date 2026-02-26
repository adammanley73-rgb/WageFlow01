// C:\Projects\wageflow01\app\api\absence\list\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
  );
}

async function getCompanyIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const raw =
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    null;

  if (!raw) return null;

  const trimmed = String(raw).trim();
  return isUuid(trimmed) ? trimmed : null;
}

function formatEmployeeLabel(e: any) {
  const name =
    [e?.first_name, e?.last_name].filter(Boolean).join(" ").trim() || "Employee";
  const num = e?.employee_number ? String(e.employee_number) : "";
  return num ? `${name} (${num})` : name;
}

async function requireAuthAndMembership(companyId: string) {
  const supabase = await getServerSupabase();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return {
      ok: false as const,
      res: json(401, {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sign in required.",
      }),
    };
  }

  const { data: membership, error: memErr } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    return {
      ok: false as const,
      res: json(500, {
        ok: false,
        code: "MEMBERSHIP_CHECK_FAILED",
        message: "Could not validate company membership.",
      }),
    };
  }

  if (!membership) {
    return {
      ok: false as const,
      res: json(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "You do not have access to the active company.",
      }),
    };
  }

  return { ok: true as const, supabase, userId: user.id };
}

export async function GET(req: Request) {
  if (env.preview) {
    return json(404, { ok: false, error: "absence/list disabled on preview" });
  }

  try {
    const companyId = await getCompanyIdFromCookies();

    if (!companyId) {
      return json(400, {
        ok: false,
        code: "NO_COMPANY",
        message: "No active company selected.",
      });
    }

    const gate = await requireAuthAndMembership(companyId);
    if (!gate.ok) return gate.res;

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

    let q = gate.supabase
      .from("absences")
      .select(
        "id, employee_id, type, status, first_day, last_day_expected, last_day_actual, reference_notes"
      )
      .eq("company_id", companyId)
      .order("first_day", { ascending: false })
      .limit(limit);

    if (employeeId && isUuid(employeeId)) q = q.eq("employee_id", employeeId);
    if (status) q = q.eq("status", status);
    if (type) q = q.eq("type", type);

    const { data: absences, error } = await q;

    if (error) {
      return json(500, {
        ok: false,
        code: "DB_ERROR",
        message: "Could not load absences.",
      });
    }

    const rows = Array.isArray(absences) ? absences : [];
    const employeeIds = Array.from(
      new Set(
        rows.map((r: any) => String(r?.employee_id || "").trim()).filter(Boolean)
      )
    );

    const employeeMap: Record<string, any> = {};

    if (employeeIds.length > 0) {
      const { data: emps, error: empErr } = await gate.supabase
        .from("employees")
        .select("id, first_name, last_name, employee_number")
        .eq("company_id", companyId)
        .in("id", employeeIds);

      if (!empErr && Array.isArray(emps)) {
        for (const e of emps) employeeMap[String((e as any).id)] = e;
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