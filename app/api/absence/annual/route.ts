// C:\Projects\wageflow01\app\api\absence\annual\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateHolidayPay } from "@/lib/payroll/holidayPay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnnualLeaveBody = {
  employeeId?: unknown;
  employee_id?: unknown;
  startDate?: unknown;
  first_day?: unknown;
  endDate?: unknown;
  last_day_expected?: unknown;
  totalDays?: unknown;
  days?: unknown;
  total_days?: unknown;
  notes?: unknown;
  reference_notes?: unknown;
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

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  try {
    const body = (await req.json().catch(() => null)) as AnnualLeaveBody | null;

    const rawEmployeeId = body?.employeeId ?? body?.employee_id ?? null;
    const rawStartDate = body?.startDate ?? body?.first_day ?? null;
    const rawEndDate = body?.endDate ?? body?.last_day_expected ?? null;
    const rawTotalDays = body?.totalDays ?? body?.days ?? body?.total_days ?? null;
    const rawNotes = body?.notes ?? body?.reference_notes ?? null;

    const employeeId = toTrimmedString(rawEmployeeId);
    const startDate = toTrimmedString(rawStartDate);
    const endDate = toTrimmedString(rawEndDate);

    if (!employeeId || !startDate || !endDate || rawTotalDays == null) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "employeeId, startDate, endDate, and totalDays are required.",
      });
    }

    if (!isIsoDateOnly(startDate) || !isIsoDateOnly(endDate)) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "startDate and endDate must be YYYY-MM-DD.",
      });
    }

    if (endDate < startDate) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "endDate must be on or after startDate.",
      });
    }

    const daysNumeric = Number(rawTotalDays);
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
        details: (employeeError as any)?.message ?? String(employeeError),
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

    const referenceNotes =
      rawNotes == null ? null : typeof rawNotes === "string" ? rawNotes : String(rawNotes);

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
        reference_notes: referenceNotes,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (absenceError || !insertedAbsence?.id) {
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
        details: (absenceError as any)?.message ?? null,
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
  } catch (err: unknown) {
    console.error("absence/annual POST unexpected error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected failure while saving annual leave.",
      details: msg,
    });
  }
}