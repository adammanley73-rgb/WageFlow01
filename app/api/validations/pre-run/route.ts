/* C:\Users\adamm\Projects\wageflow01\app\api\validations\pre-run\route.ts
   WageFlow — Pre-run validations API (Step 1)
   POST /api/validations/pre-run
   Body: { employees: EmployeeRecord[], enabledRules?: string[] }
   Returns: { issues, byEmployee, byRule, counts, severityCounts, took_ms }
*/

import { NextResponse } from "next/server";
import {
  runPreRunValidations,
  type EmployeeRecord,
} from "@/lib/workflows/pre_run_validations";

function isEmployeeRecord(obj: any): obj is EmployeeRecord {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.employee_id === "string" &&
    typeof obj.company_id === "string" &&
    typeof obj.is_active === "boolean"
  );
}

export async function POST(req: Request) {
  const started = performance.now();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const body = payload as {
    employees?: unknown;
    enabledRules?: string[];
  };

  if (!Array.isArray(body.employees)) {
    return NextResponse.json(
      { error: "Body must include 'employees' as an array." },
      { status: 400 }
    );
  }

  const invalidIndex = body.employees.findIndex((e) => !isEmployeeRecord(e));
  if (invalidIndex !== -1) {
    return NextResponse.json(
      {
        error:
          "employees[n] must include employee_id:string, company_id:string, is_active:boolean. Optional fields are allowed.",
        invalid_index: invalidIndex,
      },
      { status: 400 }
    );
  }

  const employees = body.employees as EmployeeRecord[];
  const { issues, byEmployee, byRule } = runPreRunValidations(employees, {
    enabledRules: Array.isArray(body.enabledRules)
      ? body.enabledRules
      : undefined,
  });

  const counts = {
    totalEmployees: employees.length,
    totalIssues: issues.length,
  };
  const severityCounts = issues.reduce(
    (acc, it) => {
      acc[it.severity] = (acc[it.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const took_ms = Math.round(performance.now() - started);

  return NextResponse.json({
    issues,
    byEmployee,
    byRule,
    counts,
    severityCounts,
    took_ms,
  });
}
