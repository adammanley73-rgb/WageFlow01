// C:\Projects\wageflow01\app\api\absence\maternity\route.ts
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
 * POST /api/absence/maternity
 *
 * Expected body (v1 wizard):
 * {
 *   employeeId: string,
 *   startDate: string,   // "YYYY-MM-DD"
 *   endDate: string,     // "YYYY-MM-DD"
 *   ewcDate?: string,    // "YYYY-MM-DD" (expected week of childbirth), optional
 *   notes?: string,
 *   companyId?: string   // optional, normally inferred from employee
 * }
 *
 * Behaviour:
 * - Inserts an `absences` row with type = "maternity", status = "draft".
 * - No SMP calculation happens here; SMP is created later by syncAbsencePayToRun.
 *
 * ID rules:
 * - Use employees.id (employee_row_id) for employee_id.
 * - Use companies.id for company_id.
 * - Any UI "employee id" display value is NOT used for foreign keys.
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
    const rawEwcDate = body?.ewcDate ?? body?.ewc_date ?? null;

    const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId.trim() : "";
    const startDate = typeof rawStartDate === "string" ? rawStartDate.trim() : "";
    const endDate = typeof rawEndDate === "string" ? rawEndDate.trim() : "";
    let companyId = typeof rawCompanyId === "string" ? rawCompanyId.trim() : "";

    if (!employeeId || !startDate || !endDate) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "employeeId, startDate and endDate are required for maternity absence.",
      });
    }

    if (endDate < startDate) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "endDate must be on or after startDate.",
      });
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
        message: "Employee could not be loaded for maternity absence creation.",
        details: employeeError.message,
      });
    }

    if (!employeeRow?.id || !employeeRow?.company_id) {
      return json(404, {
        ok: false,
        code: "EMPLOYEE_NOT_FOUND",
        message: "Employee could not be loaded for maternity absence creation.",
      });
    }

    if (!companyId) {
      companyId = typeof employeeRow.company_id === "string" ? employeeRow.company_id : "";
    }

    if (!companyId) {
      return json(400, {
        ok: false,
        code: "COMPANY_ID_MISSING",
        message: "Company could not be determined for this maternity absence record.",
      });
    }

    if (companyId && String(employeeRow.company_id) !== String(companyId)) {
      return json(403, {
        ok: false,
        code: "EMPLOYEE_NOT_IN_COMPANY",
        message: "Employee does not belong to the active company.",
      });
    }

    let referenceNotes: string | null = null;

    const baseNotes = typeof rawNotes === "string" && rawNotes.trim().length > 0 ? rawNotes.trim() : "";
    const ewcText = typeof rawEwcDate === "string" && rawEwcDate.trim().length > 0 ? `EWC: ${rawEwcDate.trim()}` : "";

    if (baseNotes && ewcText) referenceNotes = `${baseNotes} | ${ewcText}`;
    else if (baseNotes) referenceNotes = baseNotes;
    else if (ewcText) referenceNotes = ewcText;
    else referenceNotes = null;

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
      .select("id, company_id, employee_id, type, status, first_day, last_day_expected, last_day_actual")
      .single();

    if (absenceError || !insertedAbsence) {
      if (isOverlapError(absenceError)) {
        return json(409, {
          ok: false,
          code: "ABSENCE_DATE_OVERLAP",
          message:
            "These dates overlap another existing absence for this employee. Change the dates or cancel the other absence.",
        });
      }

      return json(statusFromErr(absenceError), {
        ok: false,
        code: "FAILED_TO_CREATE_ABSENCE",
        message: "Failed to save maternity absence record.",
        details: absenceError?.message ?? null,
      });
    }

    const absenceId: string = insertedAbsence.id;

    return json(200, {
      ok: true,
      absenceId,
      companyId,
      employeeId,
    });
  } catch (err: any) {
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected failure while saving maternity absence.",
      details: err?.message ?? String(err),
    });
  }
}
