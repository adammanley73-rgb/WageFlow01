// C:\Users\adamm\Projects\wageflow01\app\api\absence\paternity\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("absence/paternity route: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * POST /api/absence/paternity
 *
 * Expected body (wizard v1):
 * {
 *   employeeId: string,
 *   startDate: string,     // "YYYY-MM-DD"
 *   endDate: string,       // "YYYY-MM-DD"
 *   weeksOfLeave?: number | string,
 *   dueDate?: string,
 *   notes?: string,
 *   companyId?: string
 * }
 *
 * Behaviour:
 * - Inserts an `absences` row with type = "paternity_leave", status = "draft".
 * - Does not create pay schedules yet (handled in statutory pay phase).
 */
export async function POST(req: Request) {
  const supabase = createAdminClient();

  try {
    const body = await req.json();

    const rawEmployeeId = body?.employeeId ?? body?.employee_id ?? null;
    const rawStartDate = body?.startDate ?? body?.first_day ?? null;
    const rawEndDate = body?.endDate ?? body?.last_day_expected ?? null;
    const rawWeeks =
      body?.weeksOfLeave ?? body?.weeks ?? body?.total_weeks ?? null;
    const rawNotes = body?.notes ?? body?.reference_notes ?? null;
    const rawCompanyId = body?.companyId ?? body?.company_id ?? null;

    const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId : null;
    const startDate = typeof rawStartDate === "string" ? rawStartDate : null;
    const endDate = typeof rawEndDate === "string" ? rawEndDate : null;
    let companyId = typeof rawCompanyId === "string" ? rawCompanyId : null;

    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "employeeId, startDate, and endDate are required.",
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

    if (rawWeeks != null) {
      const n = Number(rawWeeks);
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "weeksOfLeave must be a positive number.",
          },
          { status: 400 }
        );
      }
    }

    // Load employee to resolve company_id if missing
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
          message: "Employee could not be loaded for paternity leave.",
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

    const { data: insertedAbsence, error: absenceError } = await supabase
      .from("absences")
      .insert({
        company_id: companyId,
        employee_id: employeeId,
        type: "paternity_leave",
        status: "draft",
        first_day: startDate,
        last_day_expected: endDate,
        last_day_actual: null,
        reference_notes: rawNotes ?? null,
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
          message: "Failed to save paternity leave record.",
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
    console.error("absence/paternity POST unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while saving paternity leave.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
