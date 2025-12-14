// C:\Users\adamm\Projects\wageflow01\app\api\employees\[id]\leaver\route.ts
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function serverMisconfig(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

function getSupabaseAdmin(): SupabaseClient<any> | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_URL ||
    "";

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(_req: Request, context: { params: { id: string } }) {
  const employeeId = context.params?.id;
  if (!employeeId) return badRequest("Missing employee id");

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return serverMisconfig(
      "Server is missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  try {
    const { data, error } = await supabaseAdmin
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
      .single();

    const row: any = data;

    if (error || !row) {
      return NextResponse.json(
        { ok: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    const otherJson = row.leaver_other_json || {};
    const otherEarnings = Array.isArray(otherJson.other_earnings)
      ? otherJson.other_earnings
      : [];
    const otherDeductions = Array.isArray(otherJson.other_deductions)
      ? otherJson.other_deductions
      : [];

    const payload: LeaverPayload = {
      leaving_date: row.leaving_date || null,
      final_pay_date: row.final_pay_date || null,
      leaver_reason: row.leaver_reason || null,
      pay_after_leaving: !!row.pay_after_leaving,
      holiday_days:
        typeof row.leaver_holiday_days === "number"
          ? row.leaver_holiday_days
          : null,
      holiday_amount:
        typeof row.leaver_holiday_amount === "number"
          ? row.leaver_holiday_amount
          : null,
      other_earnings: otherEarnings,
      other_deductions: otherDeductions,
    };

    return NextResponse.json({ ok: true, leaver: payload });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: { params: { id: string } }) {
  const employeeId = context.params?.id;
  if (!employeeId) return badRequest("Missing employee id");

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return serverMisconfig(
      "Server is missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const rawLeavingDate = body.leaving_date;
  const rawFinalPayDate = body.final_pay_date;
  const rawReason =
    typeof body.leaver_reason === "string" ? body.leaver_reason : "";
  const rawPayAfterLeaving = !!body.pay_after_leaving;

  const holidayDays = toNumberOrNull(body.holiday_days);
  const holidayAmount = toNumberOrNull(body.holiday_amount);

  const rawOtherEarnings = Array.isArray(body.other_earnings)
    ? body.other_earnings
    : [];
  const rawOtherDeductions = Array.isArray(body.other_deductions)
    ? body.other_deductions
    : [];

  const normalisedOtherEarnings: LeaverOtherLine[] = rawOtherEarnings
    .map((l: any) => ({
      description: typeof l?.description === "string" ? l.description.trim() : "",
      amount: toNumberOrNull(l?.amount),
    }))
    .filter((l: LeaverOtherLine) => l.description || l.amount !== null);

  const normalisedOtherDeductions: LeaverOtherLine[] = rawOtherDeductions
    .map((l: any) => ({
      description: typeof l?.description === "string" ? l.description.trim() : "",
      amount: toNumberOrNull(l?.amount),
    }))
    .filter((l: LeaverOtherLine) => l.description || l.amount !== null);

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

  try {
    const { data, error } = await supabaseAdmin
      .from("employees")
      .update(updatePayload)
      .eq("id", employeeId)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Failed to update employee" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: (data as any).id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
