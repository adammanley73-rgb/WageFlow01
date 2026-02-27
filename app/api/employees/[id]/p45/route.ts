// C:\Projects\wageflow01\app\api\employees\[id]\p45\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type TaxBasis = "Cumulative" | "Week1Month1" | null;

type P45Row = {
  employee_id: string;
  employer_paye_ref: string | null;
  employer_name: string | null;
  works_number: string | null;
  leaving_date: string | null; // YYYY-MM-DD
  tax_code: string | null;
  tax_basis: TaxBasis;
  total_pay_to_date: number | null;
  total_tax_to_date: number | null;
  had_student_loan_deductions: boolean | null;
};

type P45Body = Partial<P45Row> & Record<string, unknown>;

function previewWriteBlocked() {
  const isPreview = process.env.VERCEL_ENV === "preview";
  const allow = process.env.ALLOW_PREVIEW_WRITES === "1";
  return isPreview && !allow;
}

function isIsoDate(v: unknown): boolean {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
}

function toIsoDateOnly(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (isIsoDate(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeTaxBasis(v: unknown): TaxBasis {
  const s = String(v ?? "").trim();
  if (!s) return null;

  const upper = s.toUpperCase();
  if (upper === "CUMULATIVE") return "Cumulative";
  if (upper === "WEEK1MONTH1") return "Week1Month1";
  if (upper === "W1M1") return "Week1Month1";

  if (s === "Cumulative" || s === "Week1Month1") return s as TaxBasis;

  return null;
}

function looksLikeMissingTableOrRls(err: unknown): boolean {
  const anyErr = err as { code?: unknown; message?: unknown; details?: unknown } | null;
  const code = String(anyErr?.code ?? "").toUpperCase();
  const msg = String(anyErr?.message ?? "").toLowerCase();
  const details = String(anyErr?.details ?? "").toLowerCase();

  if (code === "42P01" || msg.includes("does not exist")) return true;
  if (code === "42501" || msg.includes("permission") || details.includes("permission")) return true;
  if (code.startsWith("PGRST") || msg.includes("schema cache")) return true;

  return false;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const params = await ctx.params;
  const employeeId = String(params?.id ?? "").trim();
  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "missing employee id" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.from("employee_p45").select("*").eq("employee_id", employeeId).maybeSingle();

    if (error) {
      if (looksLikeMissingTableOrRls(error)) return new NextResponse(null, { status: 204 });
      return NextResponse.json(
        { ok: false, error: "LOAD_FAILED", message: "Failed to load P45 data.", details: error.message },
        { status: 500 }
      );
    }

    if (!data) return new NextResponse(null, { status: 204 });

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  if (previewWriteBlocked()) {
    return NextResponse.json({ ok: false, error: "employees/p45 disabled on preview" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const params = await ctx.params;
  const employeeId = String(params?.id ?? "").trim();
  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "missing employee id" }, { status: 400 });
  }

  let body: P45Body = {};
  try {
    body = (await req.json()) as P45Body;
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "invalid json" }, { status: 400 });
  }

  const row: P45Row = {
    employee_id: employeeId,
    employer_paye_ref: String(body.employer_paye_ref ?? "").trim() || null,
    employer_name: String(body.employer_name ?? "").trim() || null,
    works_number: String(body.works_number ?? "").trim() || null,
    leaving_date: toIsoDateOnly(body.leaving_date),
    tax_code: String(body.tax_code ?? "").trim() || null,
    tax_basis: normalizeTaxBasis(body.tax_basis),
    total_pay_to_date: safeNumber(body.total_pay_to_date),
    total_tax_to_date: safeNumber(body.total_tax_to_date),
    had_student_loan_deductions:
      typeof body.had_student_loan_deductions === "boolean" ? body.had_student_loan_deductions : null,
  };

  try {
    const { data, error } = await supabase
      .from("employee_p45")
      .upsert(row, { onConflict: "employee_id" })
      .select("*")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (error) {
      if (looksLikeMissingTableOrRls(error)) {
        return NextResponse.json({ ok: true, id: employeeId, data: row, warning: "db_write_failed" }, { status: 201 });
      }

      return NextResponse.json(
        { ok: true, id: employeeId, data: row, warning: "db_write_failed", detail: error.message },
        { status: 201 }
      );
    }

    return NextResponse.json({ ok: true, id: employeeId, data: data ?? row }, { status: 201 });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : String(e);
    return NextResponse.json(
      { ok: true, id: employeeId, data: row, warning: "db_write_failed", detail: msg },
      { status: 201 }
    );
  }
}