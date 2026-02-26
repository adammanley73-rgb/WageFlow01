// C:\Projects\wageflow01\app\api\absence\annual\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateHolidayPay } from "@/lib/payroll/holidayPay";

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
    const rawTotalDays = body?.totalDays ?? body?.days ?? body?.total_days ?? null;
    const rawNotes = body?.notes ?? body?.reference_notes ?? null;

    const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId.trim() : "";
    const startDate = typeof rawStartDate === "string" ? rawStartDate.trim() : "";
    const endDate = typeof rawEndDate === "string" ? rawEndDate.trim() : "";
    const totalDays = rawTotalDays;

    if (!employeeId || !startDate || !endDate || totalDays == null) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "employeeId, startDate, endDate, and totalDays are required.",
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

    if (employeeError) {
      return json(statusFromErr(employeeError), {
        ok: false,
        code: "EMPLOYEE_LOAD_FAILED",
        message: "Failed to load employee.",
        details: employeeError.message,
      });
    }

    if (!employeeRow?.id || !employeeRow?.company_id) {
      return json(404, {
        ok: false,
        code: "EMPLOYEE_NOT_FOUND",
        message: "Employee could not be loaded for annual leave calculation.",
      });
    }

    const companyId = String(employeeRow.company_id);

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

      return json(statusFromErr(absenceError), {
        ok: false,
        code: "FAILED_TO_CREATE_ABSENCE",
        message: "Failed to save annual leave record.",
        details: absenceError?.message ?? null,
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
