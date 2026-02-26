// C:\Projects\wageflow01\app\api\absence\check-overlap\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

async function getCompanyIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("active_company_id")?.value || jar.get("company_id")?.value || null;
}

function statusFromErr(err: any, fallback = 500): number {
  const s = Number(err?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

// GET is intentionally a no-op to avoid Next trying to statically evaluate request.url.
// The real overlap check is POST.
export async function GET() {
  return NextResponse.json({
    ok: true,
    code: "USE_POST",
    message: "Use POST with JSON body { employee_id, first_day }.",
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => null);

    const employeeId = typeof body?.employee_id === "string" ? body.employee_id.trim() : "";
    const firstDay = typeof body?.first_day === "string" ? body.first_day.trim() : "";

    if (!employeeId || !firstDay) {
      return NextResponse.json({
        ok: true,
        code: "NO_CHECK",
        message: "Not enough information to check overlaps.",
      });
    }

    const companyId = (await getCompanyIdFromCookies()) || "";
    if (!companyId) {
      return NextResponse.json({
        ok: true,
        code: "NO_COMPANY",
        message: "No active company selected.",
      });
    }

    // Validate employee belongs to the active company (RLS-scoped)
    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (empErr) {
      return NextResponse.json({
        ok: true,
        code: "EMPLOYEE_LOAD_FAILED",
        message: "Could not check overlaps.",
      });
    }

    if (!emp?.id || !emp?.company_id) {
      return NextResponse.json({
        ok: true,
        code: "EMPLOYEE_NOT_FOUND",
        message: "Could not check overlaps.",
      });
    }

    if (String(emp.company_id) !== String(companyId)) {
      return NextResponse.json({
        ok: true,
        code: "EMPLOYEE_NOT_IN_COMPANY",
        message: "Could not check overlaps.",
      });
    }

    const { data: rows, error } = await supabase
      .from("absences")
      .select("id, status, first_day, last_day_expected, last_day_actual")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)
      .neq("status", "cancelled");

    if (error) {
      return NextResponse.json({
        ok: true,
        code: "DB_ERROR",
        message: "Could not check overlaps.",
      });
    }

    const newStart = firstDay;

    const conflicts =
      rows
        ?.map((row: any) => {
          const end = row.last_day_actual || row.last_day_expected || row.first_day;
          const overlaps = newStart >= row.first_day && newStart <= end;
          if (!overlaps) return null;

          return {
            id: row.id,
            startDate: row.first_day,
            endDate: end,
          };
        })
        .filter(Boolean) || [];

    if (conflicts.length > 0) {
      return NextResponse.json({
        ok: false,
        code: "ABSENCE_DATE_OVERLAP",
        message: "This absence would overlap another existing absence.",
        conflicts,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      code: "UNEXPECTED_ERROR",
      message: "Could not check overlaps.",
    });
  }
}
