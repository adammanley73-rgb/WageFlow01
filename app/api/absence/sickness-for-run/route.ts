// C:\Projects\wageflow01\app\api\absence\sickness-for-run\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSicknessAbsencesForRun } from "@/lib/services/absenceService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

/**
 * Debug endpoint:
 * GET /api/absence/sickness-for-run?companyId=...&start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const companyId = String(searchParams.get("companyId") ?? "").trim();
  const startDate = String(searchParams.get("start") ?? "").trim();
  const endDate = String(searchParams.get("end") ?? "").trim();

  if (!companyId || !startDate || !endDate) {
    return NextResponse.json(
      { ok: false, error: "missing_params", message: "Expected companyId, start, and end (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  if (!isIsoDateOnly(startDate) || !isIsoDateOnly(endDate)) {
    return NextResponse.json(
      { ok: false, error: "invalid_dates", message: "Use YYYY-MM-DD for start and end." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes?.user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "You must be logged in." },
        { status: 401 }
      );
    }

    const absences = await fetchSicknessAbsencesForRun(companyId, startDate, endDate);

    return NextResponse.json(
      {
        ok: true,
        companyId,
        startDate,
        endDate,
        count: Array.isArray(absences) ? absences.length : 0,
        absences,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("sickness-for-run API error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "server_error", message: msg || "Unexpected error fetching sickness absences." },
      { status: 500 }
    );
  }
}