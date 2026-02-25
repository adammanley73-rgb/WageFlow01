// C:\Projects\wageflow01\app\api\absence\annual\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHolidayPay } from "@/lib/payroll/holidayPay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function createAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("absence/annual route: missing Supabase env");
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

export async function POST(req: Request) {
  const supabase = createAdminClient();

  try {
    const body = await req.json();

    const rawEmployeeId = body?.employeeId ?? body?.employee_id ?? null;
    const rawStartDate = body?.startDate ?? body?.first_day ?? null;
    const rawEndDate = body?.endDate ?? body?.last_day_expected ?? null;
    const rawTotalDays = body?.totalDays ?? body?.days ?? body?.total_days ?? null;
    const rawNotes = body?.notes ?? body?.reference_notes ?? null;
    const rawCompanyId = body?.companyId ?? body?.company_id ?? null;

    const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId.trim() : "";
    const startDate = typeof rawStartDate === "string" ? rawStartDate.trim() : "";
    const endDate = typeof rawEndDate === "string" ? rawEndDate.trim() : "";
    const totalDays = rawTotalDays;
    let companyId = typeof rawCompanyId === "string" ? rawCompanyId.trim() : "";

    if (!employeeId || !startDate || !endDate || totalDays == null) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "companyId, employeeId, startDate, endDate, and totalDays are required.",
      });
    }

    if (endDate < startDate) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "endDate must be on or after startDate.",
      });
    }

    const daysNumeric = Number(totalDays);
    if (!Number.isFinite(daysNumeric) || daysNumeric <= 0) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "totalDays must be a positive number.",
      });
    }

    const { data: employeeRow, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id, annual_salary, hourly_rate, hours_per_week, pay_frequency")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError || !employeeRow) {
      return json(400, {
        ok: false,
        code: "EMPLOYEE_NOT_FOUND",
        message: "Employee could not be loaded for annual leave calculation.",
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
        message: "Company could not be determined for this annual leave record.",
      });
    }

    const { data: insertedAbsence, error: absenceError } = await supabase
      .from("absences")
      .insert({
        company_id: companyId,
        employee_id: employeeId,
        type: "annual_leave",
        status: "draft",
        first_day: startDate,
        last_day_expected: endDate,
        last_day_actual: null,
        reference_notes: rawNotes ?? null,
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

      return json(500, {
        ok: false,
        code: "FAILED_TO_CREATE_ABSENCE",
        message: "Failed to save annual leave record.",
        db: absenceError ?? null,
      });
    }

    const absenceId: string = insertedAbsence.id;

    const { amount, dailyRate, meta } = calculateHolidayPay({
      annualSalary: employeeRow.annual_salary ?? null,
      hourlyRate: employeeRow.hourly_rate ?? null,
      hoursPerWeek: employeeRow.hours_per_week ?? null,
      daysOfLeave: daysNumeric,
      frequency: employeeRow.pay_frequency ?? null,
      periodStart: startDate,
      periodEnd: endDate,
    });

    return json(200, {
      ok: true,
      absenceId,
      scheduleId: null,
      holidayPay: { amount, dailyRate, meta },
      warnings: [],
      db: null,
    });
  } catch (err: any) {
    console.error("absence/annual POST unexpected error", err);
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected failure while saving annual leave.",
      details: err?.message ?? String(err),
    });
  }
}