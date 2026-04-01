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
    String(s || "").trim()
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

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function buildEmployeeName(e: any): string {
  const direct = firstNonEmpty(
    e?.name,
    e?.full_name,
    e?.display_name,
    e?.preferred_name
  );
  if (direct) return direct;

  const joined = [cleanText(e?.first_name), cleanText(e?.last_name)]
    .filter(Boolean)
    .join(" ")
    .trim();

  return joined;
}

function buildEmployeeNumber(e: any): string {
  return firstNonEmpty(e?.employee_number, e?.payroll_number);
}

function formatEmployeeLabel(e: any) {
  const name = buildEmployeeName(e);
  const num = buildEmployeeNumber(e);

  if (name && num) return `${name} (${num})`;
  if (name) return name;
  if (num) return `Employee ${num}`;
  return "Employee";
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
    const employeeId = cleanText(url.searchParams.get("employeeId"));
    const status = cleanText(url.searchParams.get("status"));
    const type = cleanText(url.searchParams.get("type"));
    const limitRaw = cleanText(url.searchParams.get("limit"));

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
    const absenceEmployeeIds = Array.from(
      new Set(rows.map((r: any) => cleanText(r?.employee_id)).filter(Boolean))
    );

    const employeeMapById: Record<string, any> = {};
    const employeeMapByEmployeeFileId: Record<string, any> = {};

    if (absenceEmployeeIds.length > 0) {
      const { data: emps, error: empErr } = await gate.supabase
        .from("employees")
        .select(
          "id, employee_id, first_name, last_name, full_name, name, display_name, preferred_name, employee_number, payroll_number"
        )
        .eq("company_id", companyId);

      if (!empErr && Array.isArray(emps)) {
        for (const e of emps) {
          const dbId = cleanText((e as any)?.id);
          const employeeFileId = cleanText((e as any)?.employee_id);

          if (dbId) employeeMapById[dbId] = e;
          if (employeeFileId) employeeMapByEmployeeFileId[employeeFileId] = e;
        }
      }
    }

    const items = rows.map((r: any) => {
      const rawEmployeeId = cleanText(r?.employee_id);
      const employee =
        employeeMapById[rawEmployeeId] ||
        employeeMapByEmployeeFileId[rawEmployeeId] ||
        null;

      const safeLabel = employee ? formatEmployeeLabel(employee) : "Employee";

      return {
        id: r.id,
        employeeId: rawEmployeeId || null,
        employeeLabel: safeLabel,
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
