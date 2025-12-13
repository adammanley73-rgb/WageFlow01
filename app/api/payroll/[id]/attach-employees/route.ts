/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\payroll\[id]\attach-employees\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("payroll/[id]/attach-employees: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(_req: Request, { params }: RouteParams) {
  const runId = params.id;

  if (!runId) {
    return NextResponse.json(
      {
        ok: false,
        error: "BAD_REQUEST",
        message: "Payroll run id is required.",
      },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1) Load the payroll run (we need company_id and frequency)
  const { data: runRow, error: runError } = await supabase
    .from("payroll_runs")
    .select("id, company_id, frequency")
    .eq("id", runId)
    .single();

  if (runError || !runRow) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_NOT_FOUND",
        message: "Payroll run not found.",
        details: runError?.message ?? null,
      },
      { status: 404 }
    );
  }

  const companyId = runRow.company_id;
  const runFrequency = runRow.frequency;

  if (!companyId) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_MISSING_COMPANY",
        message: "Payroll run is missing a company_id.",
      },
      { status: 500 }
    );
  }

  if (!runFrequency) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_MISSING_FREQUENCY",
        message:
          "Payroll run is missing a frequency. Cannot determine which employees are due.",
      },
      { status: 500 }
    );
  }

  // 2) Load active employees for this company + frequency
  const { data: employeeRows, error: employeesError } = await supabase
    .from("employees")
    .select(
      [
        "id",
        "company_id",
        "status",
        "pay_frequency",
        "pay_basis",
        "hours_per_week",
        "tax_code",
        "ni_category",
        "student_loan",
        "postgraduate_loan",
      ].join(", ")
    )
    .eq("company_id", companyId)
    .eq("status", "active")
    .eq("pay_frequency", runFrequency);

  if (employeesError) {
    return NextResponse.json(
      {
        ok: false,
        error: "EMPLOYEES_LOAD_FAILED",
        message: "Failed to load employees for this company.",
        details: employeesError.message,
      },
      { status: 500 }
    );
  }

  const employees = employeeRows ?? [];

  if (employees.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "NO_ELIGIBLE_EMPLOYEES",
        message:
          "No active employees with matching pay frequency were found for this company.",
      },
      { status: 400 }
    );
  }

  // 3) Load any existing rows for this run to avoid duplicates
  const { data: existingRows, error: existingError } = await supabase
    .from("payroll_run_employees")
    .select("employee_id")
    .eq("run_id", runId);

  if (existingError) {
    return NextResponse.json(
      {
        ok: false,
        error: "EXISTING_ROWS_LOAD_FAILED",
        message:
          "Failed to check existing employees already attached to this run.",
        details: existingError.message,
      },
      { status: 500 }
    );
  }

  const existingIds = new Set(
    (existingRows ?? []).map((row: any) => String(row.employee_id))
  );

  // 4) Build new snapshot rows
  const now = new Date().toISOString();

  const rowsToInsert = employees
    .filter((emp: any) => !existingIds.has(String(emp.id)))
    .map((emp: any) => {
      const studentLoan = emp.student_loan ?? "none";
      const pgLoan = Boolean(emp.postgraduate_loan ?? false);
      const payFrequencyUsed = emp.pay_frequency ?? runFrequency;
      const payBasisUsed = emp.pay_basis ?? null;
      const hoursUsed =
        typeof emp.hours_per_week === "number"
          ? emp.hours_per_week
          : emp.hours_per_week === null || emp.hours_per_week === undefined
          ? null
          : Number(emp.hours_per_week);

      return {
        run_id: runRow.id,
        employee_id: emp.id,
        company_id: emp.company_id,

        tax_code_used: emp.tax_code ?? null,
        ni_category_used: emp.ni_category ?? null,
        student_loan_used: studentLoan,
        pg_loan_used: pgLoan,
        pay_frequency_used: payFrequencyUsed,
        pay_basis_used: payBasisUsed,
        hours_per_week_used: hoursUsed,

        basic_pay: 0,
        overtime_pay: 0,
        bonus_pay: 0,
        other_earnings: 0,
        taxable_pay: 0,
        tax: 0,
        employee_ni: 0,
        employer_ni: 0,
        pension_employee: 0,
        pension_employer: 0,
        other_deductions: 0,
        attachment_of_earnings: 0,
        gross_pay: 0,
        net_pay: 0,

        pay_after_leaving: false,
        allow_negative_net: false,
        negative_net_reason: null,
        included_in_rti: false,
        marked_for_payment: true,

        metadata: {},
        created_at: now,
        updated_at: now,
      };
    });

  if (rowsToInsert.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        error: null,
        message:
          "All eligible employees are already attached to this payroll run.",
        attachedCount: 0,
        totalEmployeesConsidered: employees.length,
      },
      { status: 200 }
    );
  }

  // 5) Insert new rows
  const { error: insertError } = await supabase
    .from("payroll_run_employees")
    .insert(rowsToInsert);

  if (insertError) {
    return NextResponse.json(
      {
        ok: false,
        error: "ATTACH_EMPLOYEES_FAILED",
        message: "Failed to attach employees to this payroll run.",
        details: insertError.message,
      },
      { status: 500 }
    );
  }

  // 6) Optionally mark run as "attached_all_due_employees"
  const { error: runUpdateError } = await supabase
    .from("payroll_runs")
    .update({
      attached_all_due_employees: true,
      // totals remain 0 until the calculation step runs
    })
    .eq("id", runId);

  if (runUpdateError) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_UPDATE_FAILED",
        message:
          "Employees were attached, but updating the payroll run metadata failed.",
        details: runUpdateError.message,
        attachedCount: rowsToInsert.length,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      error: null,
      message: "Employees attached to payroll run.",
      attachedCount: rowsToInsert.length,
      totalEmployeesConsidered: employees.length,
    },
    { status: 200 }
  );
}
