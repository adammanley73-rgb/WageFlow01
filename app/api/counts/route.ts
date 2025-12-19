// C:\Users\adamm\Projects\wageflow01\app\api\counts\route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type CountsResult = {
  employeeCount: number;
  payrollRunCount: number;
  absenceRecordCount: number;
};

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("counts api: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    throw new Error("Missing Supabase admin env");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });
}

async function getCountsForCompany(companyId: string): Promise<CountsResult> {
  const supabase = createAdminClient();

  const [employeesRes, payrollRunsRes, absencesRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("payroll_runs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("absences")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
  ]);

  if (employeesRes.error) {
    console.error("counts api: employee count error", employeesRes.error);
  }
  if (payrollRunsRes.error) {
    console.error("counts api: payroll run count error", payrollRunsRes.error);
  }
  if (absencesRes.error) {
    console.error("counts api: absence count error", absencesRes.error);
  }

  return {
    employeeCount: employeesRes.count ?? 0,
    payrollRunCount: payrollRunsRes.count ?? 0,
    absenceRecordCount: absencesRes.count ?? 0,
  };
}

export async function GET() {
  try {
    const jar = cookies();

    const activeCompanyId =
      jar.get("active_company_id")?.value ??
      jar.get("company_id")?.value ??
      null;

    if (!activeCompanyId) {
      // No company chosen yet; return zeroes but make it explicit
      return NextResponse.json(
        {
          ok: true,
          activeCompanyId: null,
          reason: "NO_ACTIVE_COMPANY",
          counts: {
            employeeCount: 0,
            payrollRunCount: 0,
            absenceRecordCount: 0,
          },
        },
        { status: 200 }
      );
    }

    const counts = await getCountsForCompany(activeCompanyId);

    return NextResponse.json(
      {
        ok: true,
        activeCompanyId,
        counts,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("counts api: unhandled error", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
