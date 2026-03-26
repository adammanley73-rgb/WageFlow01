// C:\Projects\wageflow01\app\api\rti\logs\route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isUuid(v: any): boolean {
  const s = String(v ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function toPositiveInt(v: any, fallback: number, max: number) {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();

    const authRes = await supabase.auth.getUser();
    const user = authRes.data?.user ?? null;

    if (authRes.error || !user) {
      return json(401, {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sign in required.",
      });
    }

    const url = new URL(req.url);
    const companyId = String(url.searchParams.get("company_id") || "").trim();
    const payRunId = String(url.searchParams.get("pay_run_id") || "").trim();
    const limit = toPositiveInt(url.searchParams.get("limit"), 50, 200);

    if (companyId && !isUuid(companyId)) {
      return json(400, {
        ok: false,
        code: "BAD_COMPANY_ID",
        message: "Invalid company_id.",
      });
    }

    if (payRunId && !isUuid(payRunId)) {
      return json(400, {
        ok: false,
        code: "BAD_PAY_RUN_ID",
        message: "Invalid pay_run_id.",
      });
    }

    let companyIds: string[] = [];

    if (companyId) {
      const membership = await supabase
        .from("company_memberships")
        .select("company_id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership.error) {
        return json(500, {
          ok: false,
          code: "MEMBERSHIP_CHECK_FAILED",
          message: membership.error.message || "Could not validate company membership.",
        });
      }

      if (!membership.data?.company_id) {
        return json(403, {
          ok: false,
          code: "FORBIDDEN",
          message: "You do not have access to this company.",
        });
      }

      companyIds = [String(membership.data.company_id)];
    } else {
      const memberships = await supabase
        .from("company_memberships")
        .select("company_id")
        .eq("user_id", user.id);

      if (memberships.error) {
        return json(500, {
          ok: false,
          code: "MEMBERSHIP_FETCH_FAILED",
          message: memberships.error.message || "Could not load company memberships.",
        });
      }

      companyIds = Array.from(
        new Set(
          (Array.isArray(memberships.data) ? memberships.data : [])
            .map((row: any) => String(row?.company_id || "").trim())
            .filter(Boolean)
        )
      );
    }

    if (companyIds.length === 0) {
      return json(200, {
        ok: true,
        logs: [],
        count: 0,
      });
    }

    let query = supabase
      .from("rti_logs")
      .select("id,pay_run_id,type,period,submitted_at,reference,status,message,company_id")
      .in("company_id", companyIds)
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (payRunId) {
      query = query.eq("pay_run_id", payRunId);
    }

    const { data, error } = await query;

    if (error) {
      return json(500, {
        ok: false,
        code: "RTI_LOGS_QUERY_FAILED",
        message: error.message || "Failed to load RTI logs.",
      });
    }

    const logs = Array.isArray(data) ? data : [];

    return json(200, {
      ok: true,
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: String(error?.message || "Unexpected error loading RTI logs."),
    });
  }
}