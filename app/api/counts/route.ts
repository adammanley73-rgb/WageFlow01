// C:\Projects\wageflow01\app\api\counts\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CountsResult = {
  employeeCount: number;
  payrollRunCount: number;
  absenceRecordCount: number;
};

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
  );
}

async function getActiveCompanyId(): Promise<string | null> {
  const jar = await cookies();
  const raw =
    jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;

  if (!raw) return null;

  const trimmed = String(raw).trim();
  return isUuid(trimmed) ? trimmed : null;
}

async function getCountsForCompany(
  supabase: any,
  companyId: string
): Promise<CountsResult> {
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
    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return json(401, { ok: false, error: "NOT_AUTHENTICATED" });
    }

    const activeCompanyId = await getActiveCompanyId();

    if (!activeCompanyId) {
      return json(200, {
        ok: true,
        activeCompanyId: null,
        reason: "NO_ACTIVE_COMPANY",
        counts: {
          employeeCount: 0,
          payrollRunCount: 0,
          absenceRecordCount: 0,
        },
      });
    }

    const { data: membership, error: membershipErr } = await supabase
      .from("company_memberships")
      .select("role")
      .eq("company_id", activeCompanyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipErr) {
      console.error("counts api: membership check error", membershipErr);
      return json(403, { ok: false, error: "FORBIDDEN" });
    }

    if (!membership) {
      return json(403, { ok: false, error: "NOT_A_MEMBER" });
    }

    const counts = await getCountsForCompany(supabase, activeCompanyId);

    return json(200, {
      ok: true,
      activeCompanyId,
      counts,
    });
  } catch (err: any) {
    console.error("counts api: unhandled error", err);

    return json(500, {
      ok: false,
      error: err?.message ?? "Unknown error",
    });
  }
}