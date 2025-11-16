// C:\Users\adamm\Projects\wageflow01\app\api\counts\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCompanyIdFromCookie } from "@/lib/company";

export const dynamic = "force-dynamic";

type CountsPayload = {
  employeeCount: number;
  payrollRunCount: number;
  absenceRecordCount: number;
  // legacy keys for older callers (if any)
  employees: number;
  runs: number;
  absences: number;
};

function emptyCounts(): CountsPayload {
  return {
    employeeCount: 0,
    payrollRunCount: 0,
    absenceRecordCount: 0,
    employees: 0,
    runs: 0,
    absences: 0,
  };
}

export async function GET() {
  try {
    // Ensure cookies exist (middleware may also enforce active company)
    const jar = cookies();
    const cookieCompanyId =
      getCompanyIdFromCookie() ||
      jar.get("active_company_id")?.value ||
      jar.get("company_id")?.value ||
      "";

    if (!cookieCompanyId) {
      return NextResponse.json(emptyCounts(), {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const supabase = supabaseServer();

    const [
      employeesRes,
      payrollRunsRes,
      absencesRes,
    ] = await Promise.all([
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", cookieCompanyId),
      supabase
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", cookieCompanyId),
      supabase
        .from("absence_records")
        .select("id", { count: "exact", head: true })
        .eq("company_id", cookieCompanyId),
    ]);

    const employeeCount =
      typeof employeesRes.count === "number" ? employeesRes.count : 0;
    const payrollRunCount =
      typeof payrollRunsRes.count === "number" ? payrollRunsRes.count : 0;
    const absenceRecordCount =
      typeof absencesRes.count === "number" ? absencesRes.count : 0;

    const payload: CountsPayload = {
      employeeCount,
      payrollRunCount,
      absenceRecordCount,
      // aliases
      employees: employeeCount,
      runs: payrollRunCount,
      absences: absenceRecordCount,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/counts error:", err);
    return NextResponse.json(emptyCounts(), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
