// C:\Users\adamm\Projects\wageflow01\lib\payroll\absenceHolidaySchedule.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateHolidayPay,
  type HolidayPayEmployee,
  type Frequency,
} from "./holidayPay";

export type AnnualLeaveAbsence = {
  id: string;
  company_id: string;
  employee_id: string;
  type: string; // should be "annual_leave" for this helper
  start_date: string;
  end_date: string;
  total_days: number | string;
};

export type AbsenceHolidayScheduleInput = {
  supabase: SupabaseClient<any>;
  absence: AnnualLeaveAbsence;
  employee: HolidayPayEmployee;
  frequency: Frequency;
  periodStart: string; // payroll period start (ISO date string)
  periodEnd: string;   // payroll period end (ISO date string)
};

/**
 * upsertHolidayPayScheduleForAnnualLeave
 *
 * Server-side helper for annual leave absences.
 *
 * Behaviour:
 * - Uses calculateHolidayPay v1 rules to calculate holidayAmount and dailyRate.
 * - Writes or updates a single absence_pay_schedules row for HOLIDAY_PAY
 *   for the given absence + period + employee.
 *
 * Assumptions:
 * - Called only on the server with a Supabase client that is allowed to write.
 * - Absence type is "annual_leave".
 * - Absence.total_days represents the number of days of leave for this period.
 */
export async function upsertHolidayPayScheduleForAnnualLeave(
  input: AbsenceHolidayScheduleInput
) {
  const { supabase, absence, employee, frequency, periodStart, periodEnd } =
    input;

  if (!absence?.id) {
    throw new Error("upsertHolidayPayScheduleForAnnualLeave: absence.id is required.");
  }
  if (!absence?.employee_id) {
    throw new Error(
      "upsertHolidayPayScheduleForAnnualLeave: absence.employee_id is required."
    );
  }
  if (!absence?.company_id) {
    throw new Error(
      "upsertHolidayPayScheduleForAnnualLeave: absence.company_id is required."
    );
  }

  const daysOfLeave = normaliseDaysOfLeave(absence.total_days);

  // Calculate holiday pay amount using the shared v1 rules.
  const holidayResult = calculateHolidayPay({
    employee,
    frequency,
    daysOfLeave,
    periodStart,
    periodEnd,
  });

  // Round amount to 2 decimal places for storage.
  const roundedAmount = roundToCents(holidayResult.amount);

  // If amount is zero, we still write a row so that downstream logic can see
  // that a schedule was considered, but we keep it explicit in notes.
  const schedulePayload = {
    company_id: absence.company_id,
    employee_id: absence.employee_id,
    absence_id: absence.id,
    element_code: "HOLIDAY_PAY",
    pay_period_start: periodStart,
    pay_period_end: periodEnd,
    amount: roundedAmount,
  };

  // Check if a schedule already exists for this absence + element + period.
  const { data: existingRows, error: existingError } = await supabase
    .from("absence_pay_schedules")
    .select("id")
    .eq("absence_id", absence.id)
    .eq("employee_id", absence.employee_id)
    .eq("element_code", "HOLIDAY_PAY")
    .eq("pay_period_start", periodStart)
    .eq("pay_period_end", periodEnd)
    .limit(1);

  if (existingError) {
    throw new Error(
      `upsertHolidayPayScheduleForAnnualLeave: failed to check existing schedule: ${existingError.message}`
    );
  }

  const existing =
    existingRows && existingRows.length > 0 ? existingRows[0] : null;

  let savedSchedule: any = null;

  if (existing) {
    const { data, error } = await supabase
      .from("absence_pay_schedules")
      .update(schedulePayload)
      .eq("id", existing.id)
      .select()
      .limit(1);

    if (error) {
      throw new Error(
        `upsertHolidayPayScheduleForAnnualLeave: failed to update schedule: ${error.message}`
      );
    }

    savedSchedule = data && data.length > 0 ? data[0] : null;
  } else {
    const { data, error } = await supabase
      .from("absence_pay_schedules")
      .insert(schedulePayload)
      .select()
      .limit(1);

    if (error) {
      throw new Error(
        `upsertHolidayPayScheduleForAnnualLeave: failed to insert schedule: ${error.message}`
      );
    }

    savedSchedule = data && data.length > 0 ? data[0] : null;
  }

  return {
    schedule: savedSchedule,
    holidayPay: holidayResult,
  };
}

function normaliseDaysOfLeave(value: number | string): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  }

  return 0;
}

function roundToCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}
