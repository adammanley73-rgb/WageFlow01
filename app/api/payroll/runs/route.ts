// C:\Users\adamm\Projects\wageflow01\app\api\payroll\runs\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdmin } from "@lib/admin";

export const dynamic = "force-dynamic";

type RunsQuery = {
  frequency?: string | null;
  taxYearStart?: string | null;
};

type PostgrestSingleResponse<T> = {
  data: T | null;
  error: any | null;
};

type PayScheduleRow = {
  id: string;
  company_id: string | null;
  frequency: "weekly" | "fortnightly" | "four_weekly" | "monthly" | string;
  pay_day_of_week: number | null;
  pay_day_of_month: number | null;
  is_flexible: boolean | null;
  pay_timing: string | null;
  cycle_anchor_pay_date: string | null;
  pay_date_adjustment: "previous_working_day" | "next_working_day" | "none" | string | null;
  pay_date_offset_days: number | null;
  max_advance_days: number | null;
  max_lag_days: number | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  run_name: string;
  company_id: string;
  frequency: string;
  period_start: string;
  period_end: string;
  status: string;
  pay_date: string | null;
  pay_date_overridden: boolean | null;
  pay_date_override_reason: string | null;
  pay_schedule_id: string | null;
};

type PostgrestCountResponse = {
  data: any[] | null;
  error: any | null;
  count: number | null;
};

function normalizeQueryParam(v: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "all") return null;
  return s;
}

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function isoToUkDate(iso: string) {
  const s = String(iso || "").trim();
  if (!isIsoDateOnly(s)) return s;
  const parts = s.split("-");
  const y = parts[0] || "";
  const m = parts[1] || "";
  const d = parts[2] || "";
  return d + "-" + m + "-" + y;
}

function frequencyLabel(frequency: string) {
  const f = String(frequency || "").trim();
  if (f === "weekly") return "Weekly";
  if (f === "fortnightly") return "Fortnightly";
  if (f === "four_weekly") return "4-weekly";
  if (f === "monthly") return "Monthly";
  return f || "Payroll";
}

function defaultRunName(frequency: string, periodStartIso: string, periodEndIso: string) {
  const a = isoToUkDate(periodStartIso);
  const b = isoToUkDate(periodEndIso);
  return frequencyLabel(frequency) + " payroll " + a + " to " + b;
}

function getUkTaxYearBounds(taxYearStartParam?: string | null) {
  if (taxYearStartParam) {
    const start = new Date(taxYearStartParam);
    if (Number.isNaN(start.getTime())) {
      throw new Error("Invalid taxYearStart format, expected YYYY-MM-DD");
    }
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    return {
      taxYearStartIso: start.toISOString().slice(0, 10),
      taxYearEndIso: end.toISOString().slice(0, 10),
    };
  }

  const today = new Date();
  const year = today.getFullYear();
  const candidateStart = new Date(Date.UTC(year, 3, 6));
  const start = today >= candidateStart ? candidateStart : new Date(Date.UTC(year - 1, 3, 6));

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);

  return {
    taxYearStartIso: start.toISOString().slice(0, 10),
    taxYearEndIso: end.toISOString().slice(0, 10),
  };
}

/* -----------------------
   Date helpers (UTC, date-only)
------------------------ */

function parseIsoDateOnlyToUtc(iso: string) {
  const s = String(iso || "").trim();
  if (!isIsoDateOnly(s)) throw new Error("Bad date: " + s);
  const [y, m, d] = s.split("-").map((p) => parseInt(p, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function fmtUtcToIsoDateOnly(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

function addDaysUtc(dt: Date, days: number) {
  return new Date(dt.getTime() + Number(days || 0) * 86400000);
}

function diffDaysUtc(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function daysInMonthUtc(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function normalizeScheduleDow(payDayOfWeek: number | null) {
  if (payDayOfWeek === null || payDayOfWeek === undefined) return null;

  const n = Number(payDayOfWeek);
  if (!Number.isFinite(n)) return null;

  if (n >= 0 && n <= 6) return n;

  if (n >= 1 && n <= 7) return n === 7 ? 0 : n;

  return null;
}

function applyWeekendAdjustment(dt: Date, rule: string) {
  const r = String(rule || "").trim();
  if (r === "none") return dt;

  const dow = dt.getUTCDay();
  if (dow !== 0 && dow !== 6) return dt;

  if (r === "previous_working_day") {
    if (dow === 6) return addDaysUtc(dt, -1);
    if (dow === 0) return addDaysUtc(dt, -2);
  }

  if (r === "next_working_day") {
    if (dow === 6) return addDaysUtc(dt, 2);
    if (dow === 0) return addDaysUtc(dt, 1);
  }

  return dt;
}

function nextOrSameWeekdayUtc(from: Date, targetDow0to6: number) {
  const fromDow = from.getUTCDay();
  const t = Number(targetDow0to6);
  const delta = (t - fromDow + 7) % 7;
  return addDaysUtc(from, delta);
}

function calcSuggestedPayDateUtc(schedule: PayScheduleRow, periodEndUtc: Date) {
  const isFlexible = !!schedule?.is_flexible;
  const freq = String(schedule?.frequency || "").trim();
  const adj = String(schedule?.pay_date_adjustment || "previous_working_day");
  const offsetDays = Number(schedule?.pay_date_offset_days || 0);

  if (isFlexible) {
    return applyWeekendAdjustment(addDaysUtc(periodEndUtc, offsetDays), adj);
  }

  const dom = schedule?.pay_day_of_month;
  if (freq === "monthly" && dom !== null && dom !== undefined) {
    const y = periodEndUtc.getUTCFullYear();
    const m = periodEndUtc.getUTCMonth();
    const dim = daysInMonthUtc(y, m);
    const d = Math.max(1, Math.min(dim, Number(dom)));
    const base = new Date(Date.UTC(y, m, d));
    return applyWeekendAdjustment(addDaysUtc(base, offsetDays), adj);
  }

  const targetDow = normalizeScheduleDow(schedule?.pay_day_of_week ?? null);
  if (targetDow !== null) {
    const base = nextOrSameWeekdayUtc(periodEndUtc, targetDow);
    return applyWeekendAdjustment(addDaysUtc(base, offsetDays), adj);
  }

  return applyWeekendAdjustment(addDaysUtc(periodEndUtc, offsetDays), adj);
}

function cycleOk(schedule: PayScheduleRow, payDateUtc: Date) {
  if (!schedule) return true;
  if (schedule.is_flexible) return true;

  const freq = String(schedule.frequency || "").trim();
  if (freq !== "fortnightly" && freq !== "four_weekly") return true;

  const anchorIso = schedule.cycle_anchor_pay_date;
  if (!anchorIso || !isIsoDateOnly(anchorIso)) return true;

  const anchorUtc = parseIsoDateOnlyToUtc(anchorIso);
  const period = freq === "fortnightly" ? 14 : 28;
  const diff = diffDaysUtc(payDateUtc, anchorUtc);
  const mod = ((diff % period) + period) % period;
  return mod === 0;
}

/* -----------------------
   GET (list runs)
------------------------ */

export async function GET(req: Request) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Admin client not available" }, { status: 503 });
    }

    const { client, companyId } = admin;

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Active company not set. Expected active_company_id or company_id cookie." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const debugMode = normalizeQueryParam(searchParams.get("debug")) === "1";

    const query: RunsQuery = {
      frequency: normalizeQueryParam(searchParams.get("frequency")),
      taxYearStart: normalizeQueryParam(searchParams.get("taxYearStart")),
    };

    const allowedFrequencies = ["weekly", "fortnightly", "four_weekly", "monthly"];
    const frequency = query.frequency ?? null;

    if (frequency && !allowedFrequencies.includes(frequency)) {
      return NextResponse.json(
        { ok: false, error: "Invalid frequency, expected one of weekly, fortnightly, four_weekly, monthly" },
        { status: 400 }
      );
    }

    const { taxYearStartIso, taxYearEndIso } = getUkTaxYearBounds(query.taxYearStart ?? null);
    const companyIdTrim = String(companyId || "").trim();

    const debugCounts: any = debugMode ? {} : null;

    if (debugMode) {
      const base = client
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyIdTrim) as unknown as PostgrestCountResponse;

      const companyOnlyRes = await (client
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyIdTrim) as any);

      const strictRes = await (client
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyIdTrim)
        .gte("period_start", taxYearStartIso)
        .lte("period_end", taxYearEndIso) as any);

      const overlapRes = await (client
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyIdTrim)
        .lte("period_start", taxYearEndIso)
        .gte("period_end", taxYearStartIso) as any);

      debugCounts.companyOnly = {
        count: companyOnlyRes?.count ?? null,
        error: companyOnlyRes?.error ?? null,
      };

      debugCounts.strict = {
        count: strictRes?.count ?? null,
        error: strictRes?.error ?? null,
      };

      debugCounts.overlap = {
        count: overlapRes?.count ?? null,
        error: overlapRes?.error ?? null,
      };
    }

    let supaQuery = client
      .from("payroll_runs")
      .select(
        [
          "id",
          "company_id",
          "run_number",
          "run_name",
          "frequency",
          "period_start",
          "period_end",
          "status",
          "pay_date",
          "pay_date_overridden",
          "pay_date_override_reason",
          "pay_schedule_id",
          "attached_all_due_employees",
          "total_gross_pay",
          "total_tax",
          "total_ni",
          "total_net_pay",
        ].join(", ")
      )
      .eq("company_id", companyIdTrim)
      .lte("period_start", taxYearEndIso)
      .gte("period_end", taxYearStartIso);

    if (frequency) supaQuery = supaQuery.eq("frequency", frequency);

    const listRes = await supaQuery.order("period_start", { ascending: false });

    if (listRes.error) {
      return NextResponse.json(
        { ok: false, error: listRes.error, debugSource: "payroll_runs_list_debug_v5" },
        { status: 500 }
      );
    }

    const rows = Array.isArray(listRes.data) ? listRes.data : [];

    const runs = rows.map((row: any) => ({
      id: row.id,
      company_id: row.company_id,
      run_number: row.run_number,
      run_name: row.run_name ?? null,
      frequency: row.frequency,
      period_start: row.period_start,
      period_end: row.period_end,
      status: row.status,
      pay_date: row.pay_date,
      pay_date_overridden: row.pay_date_overridden,
      pay_date_override_reason: row.pay_date_override_reason ?? null,
      pay_schedule_id: row.pay_schedule_id ?? null,
      attached_all_due_employees: row.attached_all_due_employees,
      totals: {
        gross: row.total_gross_pay,
        tax: row.total_tax,
        ni: row.total_ni,
        net: row.total_net_pay,
      },
    }));

    const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "");
    const supabaseHost = supabaseUrl.replace("https://", "").replace("http://", "").split("/")[0] || null;

    return NextResponse.json({
      ok: true,
      debugSource: "payroll_runs_list_debug_v5",
      query,
      taxYear: { start: taxYearStartIso, end: taxYearEndIso },
      activeCompanyId: companyIdTrim,
      filterMode: "overlap",
      frequencyApplied: frequency,
      supabaseHost,
      debugCounts,
      runs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error", debugSource: "payroll_runs_list_debug_v5" },
      { status: 500 }
    );
  }
}

/* -----------------------
   POST (create run)
------------------------ */

export async function POST(req: Request) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Admin client not available" }, { status: 503 });
    }

    const { client, companyId } = admin;

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Active company not set. Expected active_company_id or company_id cookie." },
        { status: 400 }
      );
    }

    const jar = cookies();
    const cookieToken = jar.get("wf_payroll_run_wizard")?.value ?? null;

    const body = await req.json().catch(() => null);
    const wizardToken = typeof body?.wizardToken === "string" ? body.wizardToken.trim() : "";

    if (!cookieToken || !wizardToken || wizardToken !== cookieToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Payroll run creation is restricted. Use the Payroll Run Wizard on the Dashboard.",
          code: "WIZARD_ONLY",
        },
        { status: 403 }
      );
    }

    const allowedFrequencies = ["weekly", "fortnightly", "four_weekly", "monthly"];

    const pay_schedule_id = typeof body?.pay_schedule_id === "string" ? body.pay_schedule_id.trim() : "";
    const frequency_input = typeof body?.frequency === "string" ? body.frequency.trim() : "";

    const period_start = typeof body?.period_start === "string" ? body.period_start.trim() : "";
    const period_end = typeof body?.period_end === "string" ? body.period_end.trim() : "";

    const pay_date_raw_1 = typeof body?.pay_date === "string" ? body.pay_date.trim() : "";
    const pay_date_raw_2 = typeof body?.payment_date === "string" ? body.payment_date.trim() : "";
    const pay_date_input = pay_date_raw_1 || pay_date_raw_2 ? pay_date_raw_1 || pay_date_raw_2 : null;

    const overrideReason = typeof body?.pay_date_override_reason === "string" ? body.pay_date_override_reason.trim() : "";

    const pay_date_overridden_input = typeof body?.pay_date_overridden === "boolean" ? body.pay_date_overridden : null;

    if (!isIsoDateOnly(period_start) || !isIsoDateOnly(period_end)) {
      return NextResponse.json(
        { ok: false, error: "Invalid period dates. Expected YYYY-MM-DD for period_start and period_end.", code: "BAD_DATES" },
        { status: 400 }
      );
    }

    if (pay_date_input && !isIsoDateOnly(pay_date_input)) {
      return NextResponse.json({ ok: false, error: "Invalid pay_date. Expected YYYY-MM-DD.", code: "BAD_PAY_DATE" }, { status: 400 });
    }

    let schedule: PayScheduleRow | null = null;

    if (pay_schedule_id) {
      const scheduleRes = (await client
        .from("pay_schedules")
        .select(
          [
            "id",
            "company_id",
            "frequency",
            "pay_day_of_week",
            "pay_day_of_month",
            "is_flexible",
            "pay_timing",
            "cycle_anchor_pay_date",
            "pay_date_adjustment",
            "pay_date_offset_days",
            "max_advance_days",
            "max_lag_days",
            "is_active",
            "created_at",
          ].join(", ")
        )
        .eq("id", pay_schedule_id)
        .single()) as PostgrestSingleResponse<PayScheduleRow>;

      if (scheduleRes.error || !scheduleRes.data) {
        return NextResponse.json(
          { ok: false, error: "Pay schedule not found or not accessible.", code: "BAD_PAY_SCHEDULE", details: scheduleRes.error },
          { status: 400 }
        );
      }

      schedule = scheduleRes.data;
    } else {
      if (!allowedFrequencies.includes(frequency_input)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Missing pay_schedule_id, and frequency is invalid. Expected weekly, fortnightly, four_weekly, monthly.",
            code: "BAD_FREQUENCY",
          },
          { status: 400 }
        );
      }

      const scheduleRes = (await client
        .from("pay_schedules")
        .select(
          [
            "id",
            "company_id",
            "frequency",
            "pay_day_of_week",
            "pay_day_of_month",
            "is_flexible",
            "pay_timing",
            "cycle_anchor_pay_date",
            "pay_date_adjustment",
            "pay_date_offset_days",
            "max_advance_days",
            "max_lag_days",
            "is_active",
            "created_at",
          ].join(", ")
        )
        .eq("company_id", companyId)
        .eq("frequency", frequency_input)
        .neq("is_active", false)
        .order("is_flexible", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()) as PostgrestSingleResponse<PayScheduleRow>;

      if (scheduleRes.error || !scheduleRes.data) {
        return NextResponse.json(
          {
            ok: false,
            error: "No active pay schedule found for this company + frequency. Create or activate a pay schedule first.",
            code: "NO_PAY_SCHEDULE",
            details: scheduleRes.error ?? null,
          },
          { status: 400 }
        );
      }

      schedule = scheduleRes.data;
    }

    if (!schedule?.id) {
      return NextResponse.json({ ok: false, error: "Pay schedule not available.", code: "BAD_SCHEDULE" }, { status: 400 });
    }

    if (schedule.company_id && schedule.company_id !== companyId) {
      return NextResponse.json(
        { ok: false, error: "Pay schedule does not belong to the active company.", code: "SCHEDULE_COMPANY_MISMATCH" },
        { status: 400 }
      );
    }

    const scheduleFrequency = String(schedule.frequency || "").trim();
    if (!allowedFrequencies.includes(scheduleFrequency)) {
      return NextResponse.json(
        { ok: false, error: "Pay schedule has an invalid frequency. Expected weekly, fortnightly, four_weekly, monthly.", code: "SCHEDULE_BAD_FREQUENCY" },
        { status: 400 }
      );
    }

    const periodEndUtc = parseIsoDateOnlyToUtc(period_end);
    const suggestedPayDateUtc = calcSuggestedPayDateUtc(schedule, periodEndUtc);
    const suggestedPayDateIso = fmtUtcToIsoDateOnly(suggestedPayDateUtc);

    const finalPayDateIso = pay_date_input || suggestedPayDateIso;
    const finalPayDateUtc = parseIsoDateOnlyToUtc(finalPayDateIso);

    const maxAdvance = Number(schedule.max_advance_days ?? 7);
    const maxLag = Number(schedule.max_lag_days ?? 7);

    const deltaDays = diffDaysUtc(finalPayDateUtc, periodEndUtc);
    const advanceDays = deltaDays < 0 ? Math.abs(deltaDays) : 0;
    const lagDays = deltaDays > 0 ? deltaDays : 0;

    const outsideWindow = advanceDays > maxAdvance || lagDays > maxLag;
    const cycleAligned = cycleOk(schedule, finalPayDateUtc);

    let pay_date_overridden =
      pay_date_overridden_input !== null ? !!pay_date_overridden_input : finalPayDateIso !== suggestedPayDateIso;

    if (outsideWindow || !cycleAligned) pay_date_overridden = true;

    if (outsideWindow && !overrideReason) {
      return NextResponse.json(
        {
          ok: false,
          error: "Pay date is outside the allowed window for this schedule. Provide pay_date_override_reason to proceed.",
          code: "PAY_DATE_OUTSIDE_WINDOW",
          details: {
            pay_date: finalPayDateIso,
            period_end,
            max_advance_days: maxAdvance,
            max_lag_days: maxLag,
            advance_days: advanceDays,
            lag_days: lagDays,
            suggested_pay_date: suggestedPayDateIso,
          },
        },
        { status: 400 }
      );
    }

    const warnings: string[] = [];
    if (!cycleAligned) warnings.push("Pay date does not align with the schedule cycle anchor (fortnightly/four-weekly).");

    const run_name_raw = typeof body?.run_name === "string" ? body.run_name.trim() : "";
    const run_name = run_name_raw || defaultRunName(scheduleFrequency, period_start, period_end);

    const insertRow: any = {
      company_id: companyId,
      pay_schedule_id: schedule.id,
      frequency: scheduleFrequency,
      run_name,

      period_start,
      period_end,
      pay_period_start: period_start,
      pay_period_end: period_end,

      status: "draft",

      pay_date: finalPayDateIso,
      pay_date_overridden,
      pay_date_override_reason: pay_date_overridden && overrideReason ? overrideReason : null,

      attached_all_due_employees: false,
    };

    const createdRes = (await client
      .from("payroll_runs")
      .insert(insertRow)
      .select(
        [
          "id",
          "run_number",
          "run_name",
          "company_id",
          "frequency",
          "period_start",
          "period_end",
          "status",
          "pay_date",
          "pay_date_overridden",
          "pay_date_override_reason",
          "pay_schedule_id",
        ].join(", ")
      )
      .single()) as PostgrestSingleResponse<PayrollRunRow>;

    if (createdRes.error || !createdRes.data) {
      return NextResponse.json({ ok: false, error: createdRes.error, debugSource: "payroll_runs_create_debug_v4" }, { status: 500 });
    }

    const run = createdRes.data;

    const res = NextResponse.json(
      {
        ok: true,
        id: run.id,
        run_id: run.id,
        run,

        schedule: {
          id: schedule.id,
          frequency: scheduleFrequency,
          is_flexible: !!schedule.is_flexible,
          pay_day_of_week: schedule.pay_day_of_week ?? null,
          pay_day_of_month: schedule.pay_day_of_month ?? null,
          max_advance_days: maxAdvance,
          max_lag_days: maxLag,
          pay_date_adjustment: schedule.pay_date_adjustment ?? "previous_working_day",
          cycle_anchor_pay_date: schedule.cycle_anchor_pay_date ?? null,
        },

        suggested: { pay_date: suggestedPayDateIso },
        warnings,

        debugSource: "payroll_runs_create_debug_v4",
      },
      { status: 201 }
    );

    res.cookies.set("wf_payroll_run_wizard", "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error", debugSource: "payroll_runs_create_debug_v4" },
      { status: 500 }
    );
  }
}
