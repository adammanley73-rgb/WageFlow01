// C:\Users\adamm\Projects\wageflow01\app\api\absence\maternity\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("absence/maternity route: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
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
  const supabase = createAdminClient();

  try {
    const body = await req.json();

    // Be tolerant about field names coming from the wizard
    const rawEmployeeId = body?.employeeId ?? body?.employee_id ?? null;
    const rawStartDate = body?.startDate ?? body?.first_day ?? null;
    const rawEndDate = body?.endDate ?? body?.last_day_expected ?? null;
    const rawNotes = body?.notes ?? body?.reference_notes ?? null;
    const rawCompanyId = body?.companyId ?? body?.company_id ?? null;
    const rawEwcDate = body?.ewcDate ?? body?.ewc_date ?? null;

    const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId : null;
    const startDate = typeof rawStartDate === "string" ? rawStartDate : null;
    const endDate = typeof rawEndDate === "string" ? rawEndDate : null;
    let companyId = typeof rawCompanyId === "string" ? rawCompanyId : null;

    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_FIELDS",
          message:
            "employeeId, startDate and endDate are required for maternity absence.",
        },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_DATES",
          message: "endDate must be on or after startDate.",
        },
        { status: 400 }
      );
    }

    // 1) Load employee to confirm it exists and get company_id if needed
    const { data: employeeRow, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError || !employeeRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMPLOYEE_NOT_FOUND",
          message:
            "Employee could not be loaded for maternity absence creation.",
          db: employeeError ?? null,
        },
        { status: 400 }
      );
    }

    if (!companyId) {
      companyId =
        typeof employeeRow.company_id === "string"
          ? employeeRow.company_id
          : null;
    }

    if (!companyId) {
      return NextResponse.json(
        {
          ok: false,
          error: "COMPANY_ID_MISSING",
          message:
            "Company could not be determined for this maternity absence record.",
        },
        { status: 400 }
      );
    }

    // Prepare reference notes: include EWC in text if provided
    let referenceNotes: string | null = null;
    const baseNotes =
      typeof rawNotes === "string" && rawNotes.trim().length > 0
        ? rawNotes.trim()
        : "";

    const ewcText =
      typeof rawEwcDate === "string" && rawEwcDate.trim().length > 0
        ? `EWC: ${rawEwcDate.trim()}`
        : "";

    if (baseNotes && ewcText) {
      referenceNotes = `${baseNotes} | ${ewcText}`;
    } else if (baseNotes) {
      referenceNotes = baseNotes;
    } else if (ewcText) {
      referenceNotes = ewcText;
    } else {
      referenceNotes = null;
    }

    // 2) Insert the absence row (type = maternity, status = draft)
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
      .select(
        "id, company_id, employee_id, type, status, first_day, last_day_expected, last_day_actual"
      )
      .single();

    if (absenceError || !insertedAbsence) {
      return NextResponse.json(
        {
          ok: false,
          error: "FAILED_TO_CREATE_ABSENCE",
          message: "Failed to save maternity absence record.",
          db: absenceError ?? null,
        },
        { status: 500 }
      );
    }

    const absenceId: string = insertedAbsence.id;

    return NextResponse.json(
      {
        ok: true,
        absenceId,
        companyId,
        employeeId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("absence/maternity POST unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while saving maternity absence.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
