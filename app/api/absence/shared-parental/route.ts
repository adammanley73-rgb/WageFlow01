// C:\Projects\wageflow01\app\api\absence\shared-parental\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("absence/shared-parental route: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
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
 *   employeeName?: string,
 *   employeeNumber?: string,
 *   startDate: string,     // "YYYY-MM-DD"
 *   endDate: string,       // "YYYY-MM-DD"
 *   childArrivalDate?: string,
 *   notes?: string,
 *   companyId?: string     // optional, can be derived from employee
 * }
 *
 * Behaviour:
 * - Inserts an `absences` row with type = "shared_parental_leave", status = "draft".
 * - Stores first_day / last_day_expected using the provided dates.
 * - Stores notes in reference_notes.
 *
 * V1 scope:
 * - Recordkeeping + UI flow completion.
 * - ShPP scheduling and calculation will be added once statutory flows are stabilised.
 */

export async function POST(req: Request) {
  const supabase = createAdminClient();

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
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "employeeId, startDate, and endDate are required.",
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

    if (employeeError || !employeeRow) {
      return json(400, {
        ok: false,
        code: "EMPLOYEE_NOT_FOUND",
        message: "Employee could not be loaded for shared parental leave creation.",
        db: employeeError ?? null,
      });
    }

    if (!companyId) {
      companyId = typeof employeeRow.company_id === "string" ? employeeRow.company_id : "";
    }

    if (!companyId) {
      return json(400, {
        ok: false,
        code: "COMPANY_ID_MISSING",
        message: "Company could not be determined for this shared parental leave record.",
      });
    }

    const notesText = typeof rawNotes === "string" ? rawNotes.trim() : "";

    const insertPayload: any = {
      company_id: companyId,
      employee_id: employeeId,
      type: "shared_parental_leave",
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
      .select("id, company_id, employee_id, type, status, first_day, last_day_expected")
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

      return json(500, {
        ok: false,
        code: "FAILED_TO_CREATE_ABSENCE",
        message: "Failed to save shared parental leave record.",
        db: absenceError ?? null,
      });
    }

    return json(200, { ok: true, absenceId: insertedAbsence.id });
  } catch (err: any) {
    console.error("absence/shared-parental POST unexpected error", err);
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected failure while saving shared parental leave.",
      details: err?.message ?? String(err),
    });
  }
}