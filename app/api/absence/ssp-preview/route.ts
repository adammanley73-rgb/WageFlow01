/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\ssp-preview\route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSspPlansForRun } from "@/lib/services/absenceService";
import { getSspDailyRate } from "@/lib/statutory/sspRates";

/**
 * Debug endpoint:
 *
 *   GET /api/absence/ssp-preview?companyId=...&start=YYYY-MM-DD&end=YYYY-MM-DD[&dailyRate=NN.NN]
 *
 * - Uses getSspPlansForRun to get total SSP payable days per employee.
 * - Multiplies payable days by the SSP daily rate.
 *
 * Behaviour:
 * - If dailyRate query param is provided and valid, it is used (for testing).
 * - Otherwise we fall back to getSspDailyRate() from the SSP config module.
 *
 * This does NOT touch the payroll engine. It is just a preview to check
 * that waiting days + amounts match HMRC for a given scenario.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const companyId = searchParams.get("companyId");
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");
  const dailyRateRaw = searchParams.get("dailyRate");

  if (!companyId || !startDate || !endDate) {
    return NextResponse.json(
      {
        error:
          "Missing required query params. Expected companyId, start, and end (YYYY-MM-DD).",
      },
      { status: 400 }
    );
  }

  // Decide which daily rate to use
  let dailyRate: number;

  if (dailyRateRaw !== null) {
    const parsed = Number(dailyRateRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json(
        {
          error:
            "Invalid dailyRate. Provide a positive numeric SSP daily rate (e.g. 21.35) or omit it to use the configured rate.",
        },
        { status: 400 }
      );
    }
    dailyRate = parsed;
  } else {
    // Fall back to configured SSP rate
    dailyRate = getSspDailyRate();
  }

  try {
    const plans = await getSspPlansForRun(companyId, startDate, endDate);

    const employees = plans.map((plan) => {
      const sspAmount = plan.totalPayableDays * dailyRate;

      return {
        employeeId: plan.employeeId,
        totalQualifyingDays: plan.totalQualifyingDays,
        totalPayableDays: plan.totalPayableDays,
        dailyRate,
        sspAmount,
        absences: plan.absences,
      };
    });

    const totalSsp = employees.reduce(
      (sum, e) => sum + e.sspAmount,
      0
    );

    return NextResponse.json(
      {
        companyId,
        startDate,
        endDate,
        dailyRate,
        totalSsp,
        employeeCount: employees.length,
        employees,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("ssp-preview API error", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unexpected error while computing SSP preview for this run.",
      },
      { status: 500 }
    );
  }
}
