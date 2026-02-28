// C:\Projects\wageflow01\app\api\absence\bereaved-partners-paternity\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type BodyIn = {
  companyId?: unknown;
  company_id?: unknown;
  employeeId?: unknown;
  employee_id?: unknown;
  startDate?: unknown;
  first_day?: unknown;
  endDate?: unknown;
  last_day_expected?: unknown;
  notes?: unknown;
  reference_notes?: unknown;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function statusFromErr(err: unknown, fallback = 500): number {
  const anyErr = err as { status?: unknown } | null;
  const s = Number(anyErr?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

function isOverlapError(err: unknown) {
  const anyErr = err as { code?: unknown; message?: unknown } | null;

  const code = anyErr?.code ? String(anyErr.code) : "";
  if (code === "23P01") return true;

  const msg = anyErr?.message ? String(anyErr.message).toLowerCase() : "";
  if (msg.includes("absences_no_overlap_per_employee")) return true;

  return false;
}

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  const body = (await req.json().catch(() => null)) as BodyIn | null;
  if (!body) {
    return json(400, { ok: false, code: "INVALID_JSON", message: "Invalid JSON body." });
  }

  const cookieStore = await cookies();
  const activeCompanyId =
    toTrimmedString(body.companyId ?? body.company_id ?? "") ||
    cookieStore.get("active_company_id")?.value ||
    cookieStore.get("company_id")?.value ||
    "";

  if (!activeCompanyId) {
    return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
  }

  const employeeId = toTrimmedString(body.employeeId ?? body.employee_id ?? "");
  if (!employeeId) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Missing employeeId." });
  }

  const startDate = toTrimmedString(body.startDate ?? body.first_day ?? "");
  const endDate = toTrimmedString(body.endDate ?? body.last_day_expected ?? "");

  if (!isIsoDateOnly(startDate)) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Start date is required (YYYY-MM-DD)." });
  }
  if (!isIsoDateOnly(endDate)) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "End date is required (YYYY-MM-DD)." });
  }
  if (startDate > endDate) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "End date cannot be before start date." });
  }

  const notesRaw = body.notes ?? body.reference_notes ?? null;
  const referenceNotes =
    notesRaw == null ? null : typeof notesRaw === "string" ? notesRaw.trim() || null : String(notesRaw).trim() || null;

  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("id", employeeId)
    .maybeSingle<{ id: string; company_id: string | null }>();

  if (empErr) {
    return json(statusFromErr(empErr), { ok: false, code: "EMPLOYEE_LOAD_FAILED", message: "Could not load employee." });
  }

  if (!emp?.id || !emp?.company_id) {
    return json(404, { ok: false, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found." });
  }

  if (String(emp.company_id) !== String(activeCompanyId)) {
    return json(403, { ok: false, code: "EMPLOYEE_NOT_IN_COMPANY", message: "Employee does not belong to the active company." });
  }

  const { data, error } = await supabase
    .from("absences")
    .insert([
      {
        company_id: activeCompanyId,
        employee_id: employeeId,
        type: "bereaved_partners_paternity",
        status: "draft",
        first_day: startDate,
        last_day_expected: endDate,
        last_day_actual: null,
        reference_notes: referenceNotes,
      },
    ])
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    if (isOverlapError(error)) {
      return json(409, {
        ok: false,
        code: "ABSENCE_DATE_OVERLAP",
        message: "These dates overlap another existing absence for this employee. Change the dates or cancel the other absence.",
      });
    }

    return json(statusFromErr(error), {
      ok: false,
      code: "DB_ERROR",
      message: (error as any)?.message || "Insert failed.",
    });
  }

  return json(200, { ok: true, id: data?.id ?? null });
}