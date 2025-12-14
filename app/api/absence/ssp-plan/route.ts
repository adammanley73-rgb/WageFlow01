/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\ssp-plan\route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSspPlansForRun } from "@/lib/services/absenceService";

/**
 * Debug endpoint:
 * GET /api/absence/ssp-plan?companyId=...&start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns SSP plans grouped per employee:
 *  - totalQualifyingDays
 *  - totalPayableDays
 *  - absences with qualifyingDays / payableDays
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
    const plans = await getSspPlansForRun(companyId, startDate, endDate);

    return NextResponse.json(
      {
        companyId,
        startDate,
        endDate,
        count: plans.length,
        employees: plans,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("ssp-plan API error", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unexpected error while computing SSP plans for this run.",
      },
      { status: 500 }
    );
  }
}
