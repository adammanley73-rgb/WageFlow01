// C:\Projects\wageflow01\app\api\absence\shared-parental\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SharedParentalBody = {
  employeeId?: unknown;
  employee_id?: unknown;
  startDate?: unknown;
  first_day?: unknown;
  endDate?: unknown;
  last_day_expected?: unknown;
  childArrivalDate?: unknown;
  child_arrival_date?: unknown;
  notes?: unknown;
  reference_notes?: unknown;
  companyId?: unknown;
  company_id?: unknown;
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

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

/**
 * POST /api/absence/shared-parental
 *
 * Expected body (v1 wizard):
 * {
 *   employeeId: string,
 *   startDate: string,     // "YYYY-MM-DD"
 *   endDate: string,       // "YYYY-MM-DD"
 *   childArrivalDate?: string,
 *   notes?: string,
 *   companyId?: string
 * }
 *
 * Behaviour:
 * - Inserts an `absences` row with type = "shared_parental", status = "draft".
 */
export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  try {
    const body = (await req.json().catch(() => null)) as SharedParentalBody | null;

    const employeeId = toTrimmedString(body?.employeeId ?? body?.employee_id ?? "");
    const startDate = toTrimmedString(body?.startDate ?? body?.first_day ?? "");
    const endDate = toTrimmedString(body?.endDate ?? body?.last_day_expected ?? "");
    let companyId = toTrimmedString(body?.companyId ?? body?.company_id ?? "");

    const rawNotes = body?.notes ?? body?.reference_notes ?? null;
    const rawChildArrival = body?.childArrivalDate ?? body?.child_arrival_date ?? null;

    if (!employeeId || !startDate || !endDate) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "employeeId, startDate, and endDate are required." });
    }

    if (!isIsoDateOnly(startDate) || !isIsoDateOnly(endDate)) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Dates must be in YYYY-MM-DD format." });
    }

    if (endDate < startDate) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "endDate must be on or after startDate." });
    }

    const childArrivalDate = rawChildArrival == null ? "" : toTrimmedString(rawChildArrival);
    if (childArrivalDate && !isIsoDateOnly(childArrivalDate)) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "childArrivalDate must be YYYY-MM-DD when provided." });
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
        message: "Employee could not be loaded for shared parental.",
        details: (employeeError as any)?.message ?? String(employeeError),
      });
    }

    if (!employeeRow?.id || !employeeRow?.company_id) {
      return json(404, { ok: false, code: "EMPLOYEE_NOT_FOUND", message: "Employee could not be loaded for shared parental." });
    }

    if (!companyId) {
      companyId = String(employeeRow.company_id ?? "").trim();
    }

    if (!companyId) {
      return json(400, { ok: false, code: "COMPANY_ID_MISSING", message: "Company could not be determined for this record." });
    }

    if (String(employeeRow.company_id) !== String(companyId)) {
      return json(403, { ok: false, code: "EMPLOYEE_NOT_IN_COMPANY", message: "Employee does not belong to the active company." });
    }

    const notes = rawNotes == null ? "" : typeof rawNotes === "string" ? rawNotes.trim() : String(rawNotes).trim();

    const insertPayload = {
      company_id: companyId,
      employee_id: employeeId,
      type: "shared_parental",
      status: "draft",
      first_day: startDate,
      last_day_expected: endDate,
      last_day_actual: null as string | null,
      reference_notes: notes ? notes : null,
      source_meta: childArrivalDate
        ? { childArrivalDate, source: "shared_parental_wizard_v1" }
        : { source: "shared_parental_wizard_v1" },
    };

    const { data: insertedAbsence, error: absenceError } = await supabase
      .from("absences")
      .insert(insertPayload)
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
        message: "Failed to save shared parental record.",
        details: (absenceError as any)?.message ?? null,
      });
    }

    return json(200, { ok: true, absenceId: insertedAbsence.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, { ok: false, code: "UNEXPECTED_ERROR", message: "Unexpected failure while saving shared parental.", details: msg });
  }
}