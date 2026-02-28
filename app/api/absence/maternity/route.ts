// C:\Projects\wageflow01\app\api\absence\maternity\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type BodyIn = {
  employeeId?: unknown;
  employee_id?: unknown;

  startDate?: unknown;
  first_day?: unknown;

  endDate?: unknown;
  last_day_expected?: unknown;

  notes?: unknown;
  reference_notes?: unknown;

  companyId?: unknown;
  company_id?: unknown;

  ewcDate?: unknown;
  ewc_date?: unknown;
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

  const employeeId = toTrimmedString(body.employeeId ?? body.employee_id ?? "");
  const startDate = toTrimmedString(body.startDate ?? body.first_day ?? "");
  const endDate = toTrimmedString(body.endDate ?? body.last_day_expected ?? "");
  const requestedCompanyId = toTrimmedString(body.companyId ?? body.company_id ?? "");
  const ewcDate = toTrimmedString(body.ewcDate ?? body.ewc_date ?? "");

  if (!employeeId || !startDate || !endDate) {
    return json(400, {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "employeeId, startDate and endDate are required for maternity absence.",
    });
  }

  if (!isIsoDateOnly(startDate)) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "startDate must be YYYY-MM-DD." });
  }
  if (!isIsoDateOnly(endDate)) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "endDate must be YYYY-MM-DD." });
  }
  if (endDate < startDate) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "endDate must be on or after startDate." });
  }
  if (ewcDate && !isIsoDateOnly(ewcDate)) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "ewcDate must be YYYY-MM-DD when provided." });
  }

  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("id", employeeId)
    .maybeSingle<{ id: string; company_id: string | null }>();

  if (employeeError) {
    return json(statusFromErr(employeeError), {
      ok: false,
      code: "EMPLOYEE_LOAD_FAILED",
      message: "Employee could not be loaded for maternity absence creation.",
      details: (employeeError as any)?.message ?? String(employeeError),
    });
  }

  if (!employeeRow?.id || !employeeRow?.company_id) {
    return json(404, {
      ok: false,
      code: "EMPLOYEE_NOT_FOUND",
      message: "Employee could not be loaded for maternity absence creation.",
    });
  }

  const companyId = requestedCompanyId || String(employeeRow.company_id);

  if (requestedCompanyId && String(employeeRow.company_id) !== requestedCompanyId) {
    return json(403, {
      ok: false,
      code: "EMPLOYEE_NOT_IN_COMPANY",
      message: "Employee does not belong to the active company.",
    });
  }

  const notesText = body.notes ?? body.reference_notes ?? null;
  const baseNotes =
    notesText == null ? "" : typeof notesText === "string" ? notesText.trim() : String(notesText).trim();

  const ewcText = ewcDate ? `EWC: ${ewcDate}` : "";

  const referenceNotes =
    baseNotes && ewcText ? `${baseNotes} | ${ewcText}` : baseNotes ? baseNotes : ewcText ? ewcText : null;

  const { data: insertedAbsence, error: absenceError } = await supabase
    .from("absences")
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      type: "maternity",
      status: "draft",
      first_day: startDate,
      last_day_expected: endDate,
      last_day_actual: null,
      reference_notes: referenceNotes,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (absenceError || !insertedAbsence?.id) {
    if (isOverlapError(absenceError)) {
      return json(409, {
        ok: false,
        code: "ABSENCE_DATE_OVERLAP",
        message: "These dates overlap another existing absence for this employee. Change the dates or cancel the other absence.",
      });
    }

    return json(statusFromErr(absenceError), {
      ok: false,
      code: "FAILED_TO_CREATE_ABSENCE",
      message: "Failed to save maternity absence record.",
      details: (absenceError as any)?.message ?? null,
    });
  }

  return json(200, { ok: true, absenceId: insertedAbsence.id, companyId, employeeId });
}