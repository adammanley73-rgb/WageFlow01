// C:\Projects\wageflow01\app\api\absence\shared-parental\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function statusFromErr(err: any, fallback = 500): number {
  const s = Number(err?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

function isOverlapError(err: any) {
  const code = err?.code ? String(err.code) : "";
  if (code === "23P01") return true;

  const msg = err?.message ? String(err.message).toLowerCase() : "";
  if (msg.includes("absences_no_overlap_per_employee")) return true;

  return false;
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
    const body = await req.json();

    const rawEmployeeId = body?.employeeId ?? body?.employee_id ?? null;
    const rawStartDate = body?.startDate ?? body?.first_day ?? null;
    const rawEndDate = body?.endDate ?? body?.last_day_expected ?? null;
    const rawNotes = body?.notes ?? body?.reference_notes ?? null;
    const rawCompanyId = body?.companyId ?? body?.company_id ?? null;
    const rawChildArrival = body?.childArrivalDate ?? body?.child_arrival_date ?? null;

    const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId.trim() : "";
    const startDate = typeof rawStartDate === "string" ? rawStartDate.trim() : "";
    const endDate = typeof rawEndDate === "string" ? rawEndDate.trim() : "";
    let companyId = typeof rawCompanyId === "string" ? rawCompanyId.trim() : "";

    if (!employeeId || !startDate || !endDate) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "employeeId, startDate, and endDate are required." });
    }

    if (endDate < startDate) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "endDate must be on or after startDate." });
    }

    const { data: employeeRow, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) {
      return json(statusFromErr(employeeError), {
        ok: false,
        code: "EMPLOYEE_LOAD_FAILED",
        message: "Employee could not be loaded for shared parental.",
        details: employeeError.message,
      });
    }

    if (!employeeRow?.id || !employeeRow?.company_id) {
      return json(404, { ok: false, code: "EMPLOYEE_NOT_FOUND", message: "Employee could not be loaded for shared parental." });
    }

    if (!companyId) {
      companyId = typeof employeeRow.company_id === "string" ? employeeRow.company_id : "";
    }

    if (!companyId) {
      return json(400, { ok: false, code: "COMPANY_ID_MISSING", message: "Company could not be determined for this record." });
    }

    if (companyId && String(employeeRow.company_id) !== String(companyId)) {
      return json(403, { ok: false, code: "EMPLOYEE_NOT_IN_COMPANY", message: "Employee does not belong to the active company." });
    }

    const notesText = typeof rawNotes === "string" ? rawNotes.trim() : "";

    const insertPayload: any = {
      company_id: companyId,
      employee_id: employeeId,
      type: "shared_parental",
      status: "draft",
      first_day: startDate,
      last_day_expected: endDate,
      last_day_actual: null,
      reference_notes: notesText.length > 0 ? notesText : null,
      source_meta: rawChildArrival
        ? { childArrivalDate: rawChildArrival, source: "shared_parental_wizard_v1" }
        : { source: "shared_parental_wizard_v1" },
    };

    const { data: insertedAbsence, error: absenceError } = await supabase
      .from("absences")
      .insert(insertPayload)
      .select("id")
      .single();

    if (absenceError || !insertedAbsence) {
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
        details: absenceError?.message ?? null,
      });
    }

    return json(200, { ok: true, absenceId: insertedAbsence.id });
  } catch (err: any) {
    return json(500, { ok: false, code: "UNEXPECTED_ERROR", message: "Unexpected failure while saving shared parental.", details: err?.message ?? String(err) });
  }
}
