// C:\Users\adamm\Projects\wageflow01\app\api\absence\adoption\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("absence/adoption route: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * POST /api/absence/adoption
 *
 * Expected body (v1 wizard):
 * {
 *   employeeId: string,
 *   placementDate: string,  // "YYYY-MM-DD"
 *   startDate: string,      // "YYYY-MM-DD"
 *   endDate: string,        // "YYYY-MM-DD"
 *   notes?: string,
 *   companyId?: string
 * }
 *
 * Behaviour:
 * - Inserts an `absences` row with:
 *   type = "adoption_leave"
 *   status = "draft"
 *   first_day = startDate
 *   last_day_expected = endDate
 * - Stores placement date + notes in reference_notes (lightweight v1).
 *
 * Statutory Adoption Pay scheduling is intentionally not created here yet.
 * This keeps the wizard real and useful without pretending SAP rules are done.
 */

export async function POST(req: Request) {
  const supabase = createAdminClient();

  try {
    const body = await req.json();

    const rawEmployeeId = body?.employeeId ?? body?.employee_id ?? null;
    const rawPlacementDate =
      body?.placementDate ?? body?.placement_date ?? null;
    const rawStartDate = body?.startDate ?? body?.first_day ?? null;
    const rawEndDate = body?.endDate ?? body?.last_day_expected ?? null;
    const rawNotes = body?.notes ?? body?.reference_notes ?? null;
    const rawCompanyId = body?.companyId ?? body?.company_id ?? null;

    const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId : null;
    const placementDate =
      typeof rawPlacementDate === "string" ? rawPlacementDate : null;
    const startDate = typeof rawStartDate === "string" ? rawStartDate : null;
    const endDate = typeof rawEndDate === "string" ? rawEndDate : null;

    let companyId = typeof rawCompanyId === "string" ? rawCompanyId : null;

    if (!employeeId || !placementDate || !startDate || !endDate) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "employeeId, placementDate, startDate and endDate are required.",
        },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "endDate must be on or after startDate.",
        },
        { status: 400 }
      );
    }

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
          message: "Employee could not be loaded for adoption leave.",
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
          message: "Company could not be determined for this record.",
        },
        { status: 400 }
      );
    }

    const combinedNotes =
      rawNotes && typeof rawNotes === "string" && rawNotes.trim().length > 0
        ? `${rawNotes.trim()}\n\nPlacement date: ${placementDate}`
        : `Placement date: ${placementDate}`;

    const { data: insertedAbsence, error: absenceError } = await supabase
      .from("absences")
      .insert({
        company_id: companyId,
        employee_id: employeeId,
        type: "adoption_leave",
        status: "draft",
        first_day: startDate,
        last_day_expected: endDate,
        last_day_actual: null,
        reference_notes: combinedNotes,
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
          message: "Failed to save adoption leave record.",
          db: absenceError ?? null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        absenceId: insertedAbsence.id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("absence/adoption POST unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while saving adoption leave.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
