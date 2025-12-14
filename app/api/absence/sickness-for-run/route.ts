/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\sickness-for-run\route.ts

import { NextRequest, NextResponse } from "next/server";
import { fetchSicknessAbsencesForRun } from "@/lib/services/absenceService";

/**
 * Debug endpoint:
 * GET /api/absence/sickness-for-run?companyId=...&start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Example:
 *   /api/absence/sickness-for-run?companyId=7e80db41-8f80-459e-ae42-0e6cd30b3306&start=2025-04-06&end=2025-05-05
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const companyId = searchParams.get("companyId");
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  if (!companyId || !startDate || !endDate) {
    return NextResponse.json(
      {
        error:
          "Missing required query params. Expected companyId, start, and end (YYYY-MM-DD).",
      },
      { status: 400 }
    );
  }

  try {
    const absences = await fetchSicknessAbsencesForRun(
      companyId,
      startDate,
      endDate
    );

    return NextResponse.json(
      {
        companyId,
        startDate,
        endDate,
        count: absences.length,
        absences,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("sickness-for-run API error", err);
    return NextResponse.json(
      {
        error: err?.message || "Unexpected error fetching sickness absences.",
      },
      { status: 500 }
    );
  }
}
