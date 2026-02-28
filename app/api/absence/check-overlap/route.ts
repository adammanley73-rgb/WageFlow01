// C:\Projects\wageflow01\app\api\absence\check-overlap\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CheckBody = {
  employee_id?: unknown;
  first_day?: unknown;
};

async function getCompanyIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const a = String(jar.get("active_company_id")?.value ?? "").trim();
  if (a) return a;

  const legacy = String(jar.get("company_id")?.value ?? "").trim();
  if (legacy) return legacy;

  return null;
}

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function isStartWithinRange(start: string, rangeStart: string, rangeEnd: string): boolean {
  // Safe because YYYY-MM-DD lexical order matches chronological order.
  return start >= rangeStart && start <= rangeEnd;
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
    const body = (await req.json().catch(() => null)) as CheckBody | null;

    const employeeId = toTrimmedString(body?.employee_id);
    const firstDay = toTrimmedString(body?.first_day);

    if (!employeeId || !firstDay || !isIsoDateOnly(firstDay)) {
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

    const conflicts =
      (Array.isArray(rows) ? rows : [])
        .map((row: any) => {
          const rangeStart = toTrimmedString(row?.first_day);
          const rangeEnd = toTrimmedString(row?.last_day_actual || row?.last_day_expected || row?.first_day);

          if (!rangeStart || !rangeEnd || !isIsoDateOnly(rangeStart) || !isIsoDateOnly(rangeEnd)) return null;

          const overlaps = isStartWithinRange(firstDay, rangeStart, rangeEnd);
          if (!overlaps) return null;

          return {
            id: row?.id ?? null,
            startDate: rangeStart,
            endDate: rangeEnd,
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
  } catch {
    return NextResponse.json({
      ok: true,
      code: "UNEXPECTED_ERROR",
      message: "Could not check overlaps.",
    });
  }
}