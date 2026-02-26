// C:\Projects\wageflow01\app\api\employees\[id]\leaver\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeaverOtherLine = {
  description: string;
  amount: number | null;
};

type LeaverPayload = {
  leaving_date: string | null;
  final_pay_date: string | null;
  leaver_reason: string | null;
  pay_after_leaving: boolean;
  holiday_days: number | null;
  holiday_amount: number | null;
  other_earnings: LeaverOtherLine[];
  other_deductions: LeaverOtherLine[];
};

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

async function getActiveCompanyIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const v =
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    null;

  if (!v) return null;
  const trimmed = String(v).trim();
  return isUuid(trimmed) ? trimmed : null;
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeLines(input: any): LeaverOtherLine[] {
  const raw = Array.isArray(input) ? input : [];
  return raw
    .map((l: any) => ({
      description: typeof l?.description === "string" ? l.description.trim() : "",
      amount: toNumberOrNull(l?.amount),
    }))
    .filter((l: LeaverOtherLine) => l.description || l.amount !== null);
}

async function requireAuthAndCompany() {
  const companyId = await getActiveCompanyIdFromCookies();
  if (!companyId) {
    return { ok: false as const, res: json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." }) };
  }

  const supabase = await getServerSupabase();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return { ok: false as const, res: json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." }) };
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

  return { ok: true as const, supabase, userId: user.id, companyId, role: String(membership.role || "member") };
}

function isStaffRole(role: string) {
  return ["owner", "admin", "manager", "processor"].includes(String(role || "").toLowerCase());
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const employeeId = String(params?.id || "").trim();

  if (!employeeId || !isUuid(employeeId)) {
    return json(400, { ok: false, code: "BAD_EMPLOYEE_ID", message: "Missing or invalid employee id." });
  }

  const gate = await requireAuthAndCompany();
  if (!gate.ok) return gate.res;

  const { supabase, companyId } = gate;

  const { data, error } = await supabase
    .from("employees")
    .select(
      `
      id,
      status,
      leaving_date,
      final_pay_date,
      leaver_reason,
      pay_after_leaving,
      leaver_holiday_days,
      leaver_holiday_amount,
      leaver_other_json
    `
    )
    .eq("id", employeeId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    return json(500, { ok: false, code: "DB_ERROR", message: "Could not load employee leaver details." });
  }

  if (!data) {
    return json(404, { ok: false, code: "NOT_FOUND", message: "Employee not found for this company." });
  }

  const row: any = data;
  const otherJson = row.leaver_other_json || {};
  const otherEarnings = Array.isArray(otherJson.other_earnings) ? otherJson.other_earnings : [];
  const otherDeductions = Array.isArray(otherJson.other_deductions) ? otherJson.other_deductions : [];

  const payload: LeaverPayload = {
    leaving_date: row.leaving_date || null,
    final_pay_date: row.final_pay_date || null,
    leaver_reason: row.leaver_reason || null,
    pay_after_leaving: !!row.pay_after_leaving,
    holiday_days: typeof row.leaver_holiday_days === "number" ? row.leaver_holiday_days : null,
    holiday_amount: typeof row.leaver_holiday_amount === "number" ? row.leaver_holiday_amount : null,
    other_earnings: otherEarnings,
    other_deductions: otherDeductions,
  };

  return json(200, { ok: true, leaver: payload });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const employeeId = String(params?.id || "").trim();

  if (!employeeId || !isUuid(employeeId)) {
    return json(400, { ok: false, code: "BAD_EMPLOYEE_ID", message: "Missing or invalid employee id." });
  }

  const gate = await requireAuthAndCompany();
  if (!gate.ok) return gate.res;

  if (!isStaffRole(gate.role)) {
    return json(403, { ok: false, code: "INSUFFICIENT_ROLE", message: "You do not have permission to mark leavers." });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, code: "BAD_JSON", message: "Invalid JSON body." });
  }

  const rawLeavingDate = body?.leaving_date;
  const rawFinalPayDate = body?.final_pay_date;
  const rawReason = typeof body?.leaver_reason === "string" ? body.leaver_reason.trim() : "";
  const rawPayAfterLeaving = !!body?.pay_after_leaving;

  const holidayDays = toNumberOrNull(body?.holiday_days);
  const holidayAmount = toNumberOrNull(body?.holiday_amount);

  const normalisedOtherEarnings = normalizeLines(body?.other_earnings);
  const normalisedOtherDeductions = normalizeLines(body?.other_deductions);

  const leaverOtherJson = {
    other_earnings: normalisedOtherEarnings,
    other_deductions: normalisedOtherDeductions,
  };

  const updatePayload: any = {
    status: "leaver",
    leaving_date: rawLeavingDate || null,
    final_pay_date: rawFinalPayDate || null,
    leaver_reason: rawReason || null,
    pay_after_leaving: rawPayAfterLeaving,
    leaver_holiday_days: holidayDays,
    leaver_holiday_amount: holidayAmount,
    leaver_other_json: leaverOtherJson,
  };

  const { supabase, companyId } = gate;

  const { data, error } = await supabase
    .from("employees")
    .update(updatePayload)
    .eq("id", employeeId)
    .eq("company_id", companyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return json(500, { ok: false, code: "UPDATE_FAILED", message: "Failed to update employee leaver details." });
  }

  if (!data) {
    return json(404, { ok: false, code: "NOT_FOUND", message: "Employee not found for this company." });
  }

  return json(200, { ok: true, id: (data as any).id });
}