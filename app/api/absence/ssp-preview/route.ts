// C:\Projects\wageflow01\app\api\absence\ssp-preview\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSspPlansForRun } from "@/lib/services/absenceService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const companyId = String(searchParams.get("companyId") ?? "").trim();
  const startDate = String(searchParams.get("start") ?? "").trim();
  const endDate = String(searchParams.get("end") ?? "").trim();

  const dailyRateRaw = searchParams.get("dailyRate");
  const qualifyingDaysRaw = searchParams.get("qualifyingDaysPerWeek");

  if (!companyId || !startDate || !endDate) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_params",
        message: "Missing required query params. Expected companyId, start, and end (YYYY-MM-DD).",
      },
      { status: 400 }
    );
  }

  if (!isIsoDateOnly(startDate) || !isIsoDateOnly(endDate)) {
    return NextResponse.json(
      { ok: false, error: "invalid_dates", message: "Invalid start/end date. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  let qualifyingDaysPerWeek = 5;
  if (qualifyingDaysRaw !== null) {
    const parsed = Number(qualifyingDaysRaw);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 7) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_qualifying_days",
          message: "Invalid qualifyingDaysPerWeek. Must be a number from 1 to 7.",
        },
        { status: 400 }
      );
    }
    qualifyingDaysPerWeek = parsed;
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

    let dailyRate: number;
    let dailyRateSource: "override" | "compliance_pack";
    let packMeta: Record<string, unknown> | null = null;

    if (dailyRateRaw !== null) {
      const parsed = Number(dailyRateRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "invalid_daily_rate",
            message:
              "Invalid dailyRate. Provide a positive numeric SSP daily rate (e.g. 21.35) or omit it to derive from Compliance Pack.",
          },
          { status: 400 }
        );
      }
      dailyRate = parsed;
      dailyRateSource = "override";
    } else {
      const packDate = endDate;

      const { data: packData, error: packErr } = await supabase.rpc("get_compliance_pack_for_date", {
        p_pay_date: packDate,
      });

      if (packErr) {
        return NextResponse.json(
          { ok: false, error: "pack_rpc_failed", message: packErr.message },
          { status: 500 }
        );
      }

      const pack = Array.isArray(packData) ? packData[0] : packData;
      const weeklyFlatRaw = pack?.config?.rates?.ssp_weekly_flat;

      if (weeklyFlatRaw == null) {
        return NextResponse.json(
          {
            ok: false,
            error: "pack_missing_ssp_rate",
            message: `Compliance pack missing rates.ssp_weekly_flat for date ${packDate}`,
          },
          { status: 500 }
        );
      }

      const weeklyFlat = Number(weeklyFlatRaw);
      if (!Number.isFinite(weeklyFlat) || weeklyFlat <= 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "invalid_pack_ssp_rate",
            message: `Invalid SSP weekly flat rate in compliance pack for date ${packDate}`,
          },
          { status: 500 }
        );
      }

      dailyRate = Number((weeklyFlat / qualifyingDaysPerWeek).toFixed(2));
      dailyRateSource = "compliance_pack";
      packMeta = {
        packDateUsed: packDate,
        taxYear: pack?.tax_year ?? null,
        label: pack?.label ?? null,
        packId: pack?.id ?? null,
        weeklyFlat,
        qualifyingDaysPerWeek,
      };
    }

    const plans = await getSspPlansForRun(companyId, startDate, endDate);

    const employees = (Array.isArray(plans) ? plans : []).map((plan: any) => {
      const payableDays = Number(plan?.totalPayableDays) || 0;
      const sspAmount = Number((payableDays * dailyRate).toFixed(2));

      return {
        employeeId: plan?.employeeId ?? null,
        totalQualifyingDays: plan?.totalQualifyingDays ?? 0,
        totalPayableDays: payableDays,
        dailyRate,
        dailyRateSource,
        ...(packMeta ? { packMeta } : {}),
        sspAmount,
        absences: plan?.absences ?? [],
      };
    });

    const totalSsp = Number(
      employees.reduce((sum: number, e: any) => sum + (Number(e?.sspAmount) || 0), 0).toFixed(2)
    );

    return NextResponse.json(
      {
        ok: true,
        companyId,
        startDate,
        endDate,
        dailyRate,
        dailyRateSource,
        ...(packMeta ? { packMeta } : {}),
        totalSsp,
        employeeCount: employees.length,
        employees,
        note:
          dailyRateSource === "compliance_pack"
            ? "Daily rate derived from Compliance Pack weekly flat rate using qualifyingDaysPerWeek. If your scenario spans a tax-year boundary, this preview uses the pack for end date only."
            : "Daily rate overridden by query param for testing.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("ssp-preview API error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "server_error", message: msg || "Unexpected error while computing SSP preview for this run." },
      { status: 500 }
    );
  }
}