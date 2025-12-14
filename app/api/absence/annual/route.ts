// C:\Users\adamm\Projects\wageflow01\app\api\absence\annual\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHolidayPay } from "@/lib/payroll/holidayPay";

function createAdminClient() {
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
throw new Error("absence/annual route: missing Supabase env");
}

return createClient(url, serviceKey, {
auth: { persistSession: false },
});
}

/**

POST /api/absence/annual

Expected body (v1 wizard):

{

employeeId: string,

startDate: string, // "YYYY-MM-DD"

endDate: string, // "YYYY-MM-DD"

totalDays: number | string,

notes?: string,

companyId?: string // optional, can be derived from employee

}

Behaviour:

Inserts an absences row with type = "annual_leave", status = "draft".

Calculates holiday pay using calculateHolidayPay and the employee's pay info.

Returns the absence id and calculated holiday pay meta to the caller.

V1 assumptions:

Full-time 5 day week only (see holidayPay.ts).

pay_period_start / end are effectively the absence start/end.

Company-specific and part-time rules will be handled in v2.
*/

export async function POST(req: Request) {
const supabase = createAdminClient();

try {
const body = await req.json();

// Be tolerant about field names
const rawEmployeeId = body?.employeeId ?? body?.employee_id ?? null;
const rawStartDate = body?.startDate ?? body?.first_day ?? null;
const rawEndDate = body?.endDate ?? body?.last_day_expected ?? null;
const rawTotalDays =
  body?.totalDays ?? body?.days ?? body?.total_days ?? null;
const rawNotes = body?.notes ?? body?.reference_notes ?? null;
const rawCompanyId = body?.companyId ?? body?.company_id ?? null;

const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId : null;
const startDate = typeof rawStartDate === "string" ? rawStartDate : null;
const endDate = typeof rawEndDate === "string" ? rawEndDate : null;
const totalDays = rawTotalDays;
let companyId = typeof rawCompanyId === "string" ? rawCompanyId : null;

if (!employeeId || !startDate || !endDate || totalDays == null) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "companyId, employeeId, startDate, endDate, and totalDays are required.",
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

const daysNumeric = Number(totalDays);
if (!Number.isFinite(daysNumeric) || daysNumeric <= 0) {
  return NextResponse.json(
    {
      ok: false,
      error: "totalDays must be a positive number.",
    },
    { status: 400 }
  );
}

// 1) Load employee pay info (and company_id if companyId missing)
const { data: employeeRow, error: employeeError } = await supabase
  .from("employees")
  .select(
    "id, company_id, annual_salary, hourly_rate, hours_per_week, pay_frequency"
  )
  .eq("id", employeeId)
  .maybeSingle();

if (employeeError || !employeeRow) {
  return NextResponse.json(
    {
      ok: false,
      error: "EMPLOYEE_NOT_FOUND",
      message:
        "Employee could not be loaded for annual leave calculation.",
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
        "Company could not be determined for this annual leave record.",
    },
    { status: 400 }
  );
}

// 2) Insert the absence row (type = annual_leave, status = draft)
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
  .select(
    "id, company_id, employee_id, type, status, first_day, last_day_expected, last_day_actual"
  )
  .single();

if (absenceError || !insertedAbsence) {
  return NextResponse.json(
    {
      ok: false,
      error: "FAILED_TO_CREATE_ABSENCE",
      message: "Failed to save annual leave record.",
      db: absenceError ?? null,
    },
    { status: 500 }
  );
}

const absenceId: string = insertedAbsence.id;

// 3) Calculate holiday pay using the shared helper
const { amount, dailyRate, meta } = calculateHolidayPay({
  annualSalary: employeeRow.annual_salary ?? null,
  hourlyRate: employeeRow.hourly_rate ?? null,
  hoursPerWeek: employeeRow.hours_per_week ?? null,
  daysOfLeave: daysNumeric,
  frequency: employeeRow.pay_frequency ?? null,
  periodStart: startDate,
  periodEnd: endDate,
});

// Note: we no longer create absence_pay_schedules rows.
// Caller just gets the calculated holiday pay and the absence id.
const scheduleId: string | null = null;

return NextResponse.json(
  {
    ok: true,
    absenceId,
    scheduleId,
    holidayPay: {
      amount,
      dailyRate,
      meta,
    },
    warnings: [],
    db: null,
  },
  { status: 200 }
);


} catch (err: any) {
console.error("absence/annual POST unexpected error", err);
return NextResponse.json(
{
ok: false,
error: "UNEXPECTED_ERROR",
message: "Unexpected failure while saving annual leave.",
details: err?.message ?? String(err),
},
{ status: 500 }
);
}
}