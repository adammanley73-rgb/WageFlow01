/* C:\Users\adamm\Projects\wageflow01\app\api\payroll\runs\route.ts */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
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

type PostgrestCountResponse = {
  data: any[] | null;
  error: any | null;
  count: number | null;
};

type PayrollRunRow = {
  id: string;
  company_id: string;

  frequency: string | null;
  status: string | null;

  run_name?: string | null;
  run_number?: string | null;

  run_kind?: string | null;
  parent_run_id?: string | null;

  pay_date: string | null;
  pay_date_overridden: boolean | null;
  pay_date_override_reason: string | null;

  pay_schedule_id?: string | null;

  pay_period_start?: string | null;
  pay_period_end?: string | null;

  period_start?: string | null;
  period_end?: string | null;

  attached_all_due_employees: boolean | null;
  created_at?: string | null;

  total_gross_pay?: number | null;
  total_tax?: number | null;
  total_ni?: number | null;
  total_net_pay?: number | null;
};

type PayScheduleRow = {
  id: string;
  company_id: string;

  frequency: string | null;

  pay_date_mode: string | null;
  pay_date_param_int: number | null;
  allow_override: boolean | null;
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

function isUuid(s: any) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || "").trim());
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

function diffDaysUtc(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function addDaysUtc(d: Date, days: number) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function dateOnlyIsoUtc(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mondayOfWeekUtc(d: Date) {
  const out = new Date(d.getTime());
  const jsDow = out.getUTCDay();
  const daysSinceMonday = (jsDow + 6) % 7;
  out.setUTCDate(out.getUTCDate() - daysSinceMonday);
  return out;
}

function adjustWorkingDayUtc(d: Date, modeRaw: string) {
  const mode = String(modeRaw || "previous_working_day").trim().toLowerCase();
  if (mode === "none") return d;

  const out = new Date(d.getTime());

  const isWeekend = () => {
    const js = out.getUTCDay();
    return js === 0 || js === 6;
  };

  if (!isWeekend()) return out;

  if (mode === "next_working_day") {
    while (isWeekend()) out.setUTCDate(out.getUTCDate() + 1);
    return out;
  }

  while (isWeekend()) out.setUTCDate(out.getUTCDate() - 1);
  return out;
}

function computeWeekPaydayUtc(weekAnyDay: Date, scheduleDow: number) {
  const mon = mondayOfWeekUtc(weekAnyDay);
  const target = addDaysUtc(mon, Math.max(0, Math.min(6, (scheduleDow || 1) - 1)));
  return target;
}

function computeMonthlyPayDateUtc(monthAnyDay: Date, payDayOfMonth: number | null) {
  const y = monthAnyDay.getUTCFullYear();
  const m = monthAnyDay.getUTCMonth();

  if (payDayOfMonth && payDayOfMonth >= 1 && payDayOfMonth <= 28) {
    return new Date(Date.UTC(y, m, payDayOfMonth));
  }

  return new Date(Date.UTC(y, m + 1, 0));
}

function periodDaysForFrequency(frequency: string) {
  const f = String(frequency || "").trim();
  if (f === "weekly") return 7;
  if (f === "fortnightly") return 14;
  if (f === "four_weekly") return 28;
  return 7;
}

function normalizePayDateMode(v: any) {
  const s = String(v || "offset_from_period_end").trim().toLowerCase();
  if (s === "offset_from_period_end" || s === "fixed_calendar_day" || s === "fixed_weekday") return s;
  return "offset_from_period_end";
}

function computeCanonicalPayDateOrError(args: {
  schedule: PayScheduleRow;
  inputPayDateIso: string;
}): { ok: true; payDateIso: string } | { ok: false; code: string; error: string; details?: any } {
  const s = args.schedule;
  const inputIso = args.inputPayDateIso;

  if (!isIsoDateOnly(inputIso)) {
    return { ok: false, code: "BAD_PAY_DATE", error: "Invalid pay_date. Expected YYYY-MM-DD." };
  }

  const frequency = String(s.frequency || "").trim();
  const mode = normalizePayDateMode(s.pay_date_mode);
  const param = Number.isFinite(Number(s.pay_date_param_int)) ? Number(s.pay_date_param_int) : 0;

  const inputUtc = parseIsoDateOnlyToUtc(inputIso);

  const workingDayAdjustment = "previous_working_day";

  if (mode === "fixed_calendar_day") {
    const base = computeMonthlyPayDateUtc(inputUtc, param || null);
    const adjusted = adjustWorkingDayUtc(base, workingDayAdjustment);
    return { ok: true, payDateIso: dateOnlyIsoUtc(adjusted) };
  }

  if (mode === "fixed_weekday") {
    const dow = param >= 1 && param <= 7 ? param : 5;
    const base = computeWeekPaydayUtc(inputUtc, dow);
    const adjusted = adjustWorkingDayUtc(base, workingDayAdjustment);
    return { ok: true, payDateIso: dateOnlyIsoUtc(adjusted) };
  }

  const offsetDays = param;
  const candidateEnd = addDaysUtc(inputUtc, -offsetDays);

  if (frequency === "monthly") {
    const periodEnd = computeMonthlyPayDateUtc(candidateEnd, null);
    const pay = addDaysUtc(periodEnd, offsetDays);
    const adjusted = adjustWorkingDayUtc(pay, workingDayAdjustment);
    return { ok: true, payDateIso: dateOnlyIsoUtc(adjusted) };
  }

  const pd = periodDaysForFrequency(frequency);

  if (frequency === "weekly") {
    const end = addDaysUtc(mondayOfWeekUtc(candidateEnd), 6);
    const pay = addDaysUtc(end, offsetDays);
    const adjusted = adjustWorkingDayUtc(pay, workingDayAdjustment);
    return { ok: true, payDateIso: dateOnlyIsoUtc(adjusted) };
  }

  const pay = addDaysUtc(candidateEnd, offsetDays);
  const adjusted = adjustWorkingDayUtc(pay, workingDayAdjustment);
  return { ok: true, payDateIso: dateOnlyIsoUtc(adjusted) };
}

function computePayPeriodFromSchedule(args: {
  schedule: PayScheduleRow;
  canonicalPayDateIso: string;
}): { startIso: string; endIso: string } {
  const s = args.schedule;
  const frequency = String(s.frequency || "").trim();
  const mode = normalizePayDateMode(s.pay_date_mode);
  const param = Number.isFinite(Number(s.pay_date_param_int)) ? Number(s.pay_date_param_int) : 0;

  const payUtc = parseIsoDateOnlyToUtc(args.canonicalPayDateIso);

  if (mode === "offset_from_period_end") {
    const offsetDays = param;
    const candidateEnd = addDaysUtc(payUtc, -offsetDays);

    if (frequency === "monthly") {
      const y = candidateEnd.getUTCFullYear();
      const m = candidateEnd.getUTCMonth();
      const start = new Date(Date.UTC(y, m, 1));
      const end = new Date(Date.UTC(y, m + 1, 0));
      return { startIso: dateOnlyIsoUtc(start), endIso: dateOnlyIsoUtc(end) };
    }

    const pd = periodDaysForFrequency(frequency);

    if (frequency === "weekly") {
      const end = addDaysUtc(mondayOfWeekUtc(candidateEnd), 6);
      const start = mondayOfWeekUtc(end);
      return { startIso: dateOnlyIsoUtc(start), endIso: dateOnlyIsoUtc(end) };
    }

    const end = candidateEnd;
    const start = addDaysUtc(end, -(pd - 1));
    return { startIso: dateOnlyIsoUtc(start), endIso: dateOnlyIsoUtc(end) };
  }

  if (frequency === "monthly") {
    const y = payUtc.getUTCFullYear();
    const m = payUtc.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    return { startIso: dateOnlyIsoUtc(start), endIso: dateOnlyIsoUtc(end) };
  }

  const pd = periodDaysForFrequency(frequency);
  const end = addDaysUtc(mondayOfWeekUtc(payUtc), -1);
  const start = addDaysUtc(end, -(pd - 1));
  return { startIso: dateOnlyIsoUtc(start), endIso: dateOnlyIsoUtc(end) };
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

function makeRunNumberFromPayDate(frequency: string, payDateIso: string | null, taxYearStartIso: string) {
  if (!payDateIso || !isIsoDateOnly(payDateIso)) return null;

  const f = String(frequency || "").trim();
  const payUtc = parseIsoDateOnlyToUtc(payDateIso);
  const startUtc = parseIsoDateOnlyToUtc(taxYearStartIso);

  const diff = diffDaysUtc(payUtc, startUtc);
  if (diff < 0) return null;

  if (f === "monthly") {
    const m = payUtc.getUTCMonth();
    const mth = m >= 3 ? m - 3 + 1 : m + 9 + 1;
    return `Mth ${mth}`;
  }

  const period = f === "weekly" ? 7 : f === "fortnightly" ? 14 : f === "four_weekly" ? 28 : null;
  if (!period) return null;

  const n = Math.floor(diff / period) + 1;

  if (f === "weekly") return `wk ${n}`;
  if (f === "fortnightly") return `fn ${n}`;
  if (f === "four_weekly") return `4wk ${n}`;

  return null;
}

function defaultRunNameFromPayDate(frequency: string, payDateIso: string | null) {
  const pay = payDateIso ? isoToUkDate(payDateIso) : "unscheduled";
  return frequencyLabel(frequency) + " payroll (pay date " + pay + ")";
}

function isMissingColumnError(err: any, columnNames: string[]) {
  const msg = String(err?.message ?? err ?? "");
  if (!msg) return false;

  const looksLikeMissingColumn = msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("column");

  if (!looksLikeMissingColumn) return false;

  return columnNames.some((c) => msg.includes(c));
}

function isUniqueViolation(err: any) {
  const code = String(err?.code ?? "").trim();
  const msg = String(err?.message ?? err ?? "").toLowerCase();

  if (code === "23505") return true;

  if (msg.includes("duplicate key value violates unique constraint")) return true;
  if (msg.includes("uq_payroll_runs_company_run_number")) return true;

  return false;
}

function clearWizardCookie(res: any) {
  res.cookies.set("wf_payroll_run_wizard", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

async function findExistingRunByRunNumber(
  client: any,
  companyId: string,
  runNumber: string
): Promise<{ row: any | null; error: any | null }> {
  const tryWithKind = await client
    .from("payroll_runs")
    .select("id, pay_date, frequency, status, run_kind")
    .eq("company_id", companyId)
    .eq("run_number", runNumber)
    .eq("run_kind", "primary")
    .limit(1);

  let existing = Array.isArray(tryWithKind.data) ? tryWithKind.data[0] : null;
  let existingErr: any = tryWithKind.error;

  if (existingErr && isMissingColumnError(existingErr, ["run_kind"])) {
    const tryWithoutKind = await client
      .from("payroll_runs")
      .select("id, pay_date, frequency, status")
      .eq("company_id", companyId)
      .eq("run_number", runNumber)
      .limit(1);

    existing = Array.isArray(tryWithoutKind.data) ? tryWithoutKind.data[0] : null;
    existingErr = tryWithoutKind.error;
  }

  if (existingErr) return { row: null, error: existingErr };
  return { row: existing, error: null };
}

function payDateMismatchResponse(args: {
  existingId: string;
  existingPayDate: string | null;
  requestedPayDate: string;
  runNumber: string;
}) {
  return NextResponse.json(
    {
      ok: false,
      code: "PAY_DATE_MISMATCH",
      error:
        "A payroll run already exists for this run_number, but with a different pay_date. Refusing to reuse the wrong run.",
      run_number: args.runNumber,
      requestedPayDate: args.requestedPayDate,
      existing: { id: args.existingId, pay_date: args.existingPayDate },
      debugSource: "payroll_runs_create_debug_v12_paydate_guard",
    },
    { status: 409 }
  );
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
      const companyOnlyRes = (await client
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyIdTrim)) as unknown as PostgrestCountResponse;

      const inTaxYearRes = (await client
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyIdTrim)
        .gte("pay_date", taxYearStartIso)
        .lte("pay_date", taxYearEndIso)) as unknown as PostgrestCountResponse;

      debugCounts.companyOnly = {
        count: (companyOnlyRes as any)?.count ?? null,
        error: (companyOnlyRes as any)?.error ?? null,
      };

      debugCounts.inTaxYearByPayDate = {
        count: (inTaxYearRes as any)?.count ?? null,
        error: (inTaxYearRes as any)?.error ?? null,
      };
    }

    let supaQuery = client
      .from("payroll_runs")
      .select(
        [
          "id",
          "company_id",
          "frequency",
          "status",
          "pay_date",
          "pay_date_overridden",
          "pay_date_override_reason",
          "attached_all_due_employees",
          "created_at",
          "total_gross_pay",
          "total_tax",
          "total_ni",
          "total_net_pay",
          "pay_period_start",
          "pay_period_end",
          "pay_schedule_id",
          "run_kind",
          "parent_run_id",
          "run_name",
          "run_number",
        ].join(", ")
      )
      .eq("company_id", companyIdTrim)
      .gte("pay_date", taxYearStartIso)
      .lte("pay_date", taxYearEndIso);

    if (frequency) supaQuery = supaQuery.eq("frequency", frequency);

    const listRes = await supaQuery
      .order("pay_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (listRes.error) {
      return NextResponse.json(
        { ok: false, error: listRes.error, debugSource: "payroll_runs_list_debug_v13" },
        { status: 500 }
      );
    }

    const rows = Array.isArray(listRes.data) ? listRes.data : [];

    const runs = rows.map((row: any) => {
      const f = String(row.frequency || "").trim();
      const payDateIso = row.pay_date ?? null;

      const computedRunNumber = makeRunNumberFromPayDate(f, payDateIso, taxYearStartIso);
      const computedRunName = defaultRunNameFromPayDate(f, payDateIso);

      const kind = String(row.run_kind || "primary").trim().toLowerCase();
      const parent = row.parent_run_id ?? null;

      const startIso = row.pay_period_start ?? row.period_start ?? null;
      const endIso = row.pay_period_end ?? row.period_end ?? null;

      const baseNumber = row.run_number ?? computedRunNumber ?? null;
      const runNumberOut =
        kind === "supplementary" ? (baseNumber ? String(baseNumber) + " SUPP" : "SUPP") : baseNumber;

      const runNameOut = row.run_name ?? computedRunName;

      return {
        id: row.id,
        company_id: row.company_id,

        run_number: runNumberOut,
        run_name: runNameOut,

        run_kind: kind,
        parent_run_id: parent,

        period_start: startIso,
        period_end: endIso,
        pay_schedule_id: row.pay_schedule_id ?? null,

        frequency: row.frequency,
        status: row.status,
        pay_date: row.pay_date,
        pay_date_overridden: row.pay_date_overridden,
        pay_date_override_reason: row.pay_date_override_reason ?? null,
        attached_all_due_employees: row.attached_all_due_employees,

        totals: {
          gross: row.total_gross_pay ?? 0,
          tax: row.total_tax ?? 0,
          ni: row.total_ni ?? 0,
          net: row.total_net_pay ?? 0,
        },
      };
    });

    return NextResponse.json({
      ok: true,
      debugSource: "payroll_runs_list_debug_v13",
      query,
      taxYear: { start: taxYearStartIso, end: taxYearEndIso },
      activeCompanyId: companyIdTrim,
      filterMode: "pay_date_in_tax_year",
      frequencyApplied: frequency,
      debugCounts,
      runs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error", debugSource: "payroll_runs_list_debug_v13" },
      { status: 500 }
    );
  }
}

/* -----------------------
   POST
   - Primary run creation is wizard-only.
   - Supplementary run creation is allowed from inside a run detail page,
     but only after the parent run is COMPLETED.
------------------------ */

async function createSupplementaryRunRpc(client: any, parentRunId: string) {
  const attempt1 = await client.rpc("create_supplementary_run", { parent_run_id: parentRunId });
  if (!attempt1?.error) return attempt1;

  const msg = String(attempt1?.error?.message ?? attempt1?.error ?? "");
  const looksLikeParamMismatch =
    msg.toLowerCase().includes("parameter") ||
    msg.toLowerCase().includes("named") ||
    msg.toLowerCase().includes("argument");

  if (looksLikeParamMismatch) {
    const attempt2 = await client.rpc("create_supplementary_run", { p_parent_run_id: parentRunId });
    if (!attempt2?.error) return attempt2;
    return attempt2;
  }

  return attempt1;
}

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

    const body = await req.json().catch(() => null);
    const action = String(body?.action || "").trim().toLowerCase();

    const companyIdStr = String(companyId || "").trim();

    if (action === "create_supplementary" || action === "create_supplementary_run") {
      const parentRunId = String(body?.parent_run_id || body?.parentRunId || "").trim();

      if (!isUuid(parentRunId)) {
        return NextResponse.json(
          { ok: false, error: "Missing or invalid parent_run_id.", code: "BAD_PARENT_RUN_ID" },
          { status: 400 }
        );
      }

      const parentRes = (await client
        .from("payroll_runs")
        .select("id, company_id, run_kind, frequency, pay_schedule_id, pay_date, pay_period_start, pay_period_end, status")
        .eq("id", parentRunId)
        .single()) as PostgrestSingleResponse<PayrollRunRow>;

      if (parentRes.error || !parentRes.data) {
        return NextResponse.json(
          { ok: false, error: "Parent run not found.", code: "PARENT_NOT_FOUND", debug: parentRes.error ?? null },
          { status: 404 }
        );
      }

      const parent = parentRes.data;

      if (String(parent.company_id || "").trim() !== companyIdStr) {
        return NextResponse.json(
          { ok: false, error: "Parent run does not belong to the active company.", code: "PARENT_COMPANY_MISMATCH" },
          { status: 403 }
        );
      }

      const parentKind = String(parent.run_kind || "primary").trim().toLowerCase();
      if (parentKind === "supplementary") {
        return NextResponse.json(
          { ok: false, error: "Cannot create a supplementary run from a supplementary run.", code: "BAD_PARENT_KIND" },
          { status: 400 }
        );
      }

      const parentStatus = String(parent.status || "").trim().toLowerCase();

      if (parentStatus !== "completed") {
        return NextResponse.json(
          {
            ok: false,
            error: "Supplementary runs are only allowed after the parent run is completed.",
            code: "PARENT_NOT_COMPLETED",
            parent: { id: parentRunId, status: parent.status ?? null },
          },
          { status: 409 }
        );
      }

      if (!parent.pay_schedule_id) {
        return NextResponse.json(
          { ok: false, error: "Parent run is missing pay_schedule_id. Fix the parent run first.", code: "PARENT_MISSING_SCHEDULE" },
          { status: 400 }
        );
      }

      const rpcRes = await createSupplementaryRunRpc(client, parentRunId);

      if (rpcRes?.error) {
        return NextResponse.json(
          { ok: false, error: rpcRes.error, code: "SUPPLEMENTARY_CREATE_FAILED", debugSource: "create_supplementary_run_rpc" },
          { status: 500 }
        );
      }

      let newId: string | null = null;
      if (typeof rpcRes?.data === "string") newId = rpcRes.data;
      else if (rpcRes?.data && typeof rpcRes.data === "object") newId = String((rpcRes.data as any)?.id || "");
      else if (Array.isArray(rpcRes?.data) && rpcRes.data.length > 0) newId = String(rpcRes.data[0]);

      newId = String(newId || "").trim();

      if (!isUuid(newId)) {
        return NextResponse.json(
          { ok: false, error: "Supplementary run RPC returned no valid id.", code: "SUPPLEMENTARY_NO_ID" },
          { status: 500 }
        );
      }

      const newRes = (await client
        .from("payroll_runs")
        .select(
          [
            "id",
            "company_id",
            "frequency",
            "status",
            "pay_date",
            "pay_date_overridden",
            "pay_date_override_reason",
            "pay_period_start",
            "pay_period_end",
            "pay_schedule_id",
            "run_kind",
            "parent_run_id",
            "run_name",
            "run_number",
            "created_at",
          ].join(", ")
        )
        .eq("id", newId)
        .single()) as PostgrestSingleResponse<PayrollRunRow>;

      if (newRes.error || !newRes.data) {
        return NextResponse.json(
          { ok: true, run_id: newId, created: true, run: null, warning: "Created but could not fetch run row.", debug: newRes.error ?? null },
          { status: 201 }
        );
      }

      return NextResponse.json(
        { ok: true, run_id: newId, created: true, run: newRes.data, debugSource: "supplementary_create_v1" },
        { status: 201 }
      );
    }

    const jar = cookies();
    const cookieToken = jar.get("wf_payroll_run_wizard")?.value ?? null;
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

    const pay_schedule_id_input = typeof body?.pay_schedule_id === "string" ? body.pay_schedule_id.trim() : "";

    const pay_date_raw_1 = typeof body?.pay_date === "string" ? body.pay_date.trim() : "";
    const pay_date_raw_2 = typeof body?.payment_date === "string" ? body.payment_date.trim() : "";
    const pay_date_input = (pay_date_raw_1 || pay_date_raw_2 || "").trim();

    const run_name_input = typeof body?.run_name === "string" ? body.run_name.trim() : "";

    if (!pay_schedule_id_input) {
      return NextResponse.json({ ok: false, error: "Missing pay_schedule_id.", code: "MISSING_PAY_SCHEDULE_ID" }, { status: 400 });
    }

    if (!isIsoDateOnly(pay_date_input)) {
      return NextResponse.json({ ok: false, error: "Invalid pay_date. Expected YYYY-MM-DD.", code: "BAD_PAY_DATE" }, { status: 400 });
    }

    const scheduleRes = (await client
      .from("company_pay_schedules")
      .select(["id", "company_id", "frequency", "pay_date_mode", "pay_date_param_int", "allow_override"].join(", "))
      .eq("id", pay_schedule_id_input)
      .eq("company_id", companyIdStr)
      .single()) as PostgrestSingleResponse<PayScheduleRow>;

    if (scheduleRes.error || !scheduleRes.data) {
      return NextResponse.json(
        { ok: false, error: "Invalid pay_schedule_id for this company.", code: "BAD_PAY_SCHEDULE_ID", debug: scheduleRes.error ?? null },
        { status: 400 }
      );
    }

    const schedule = scheduleRes.data;

    const derivedFrequency = String(schedule.frequency || "").trim();

    if (!allowedFrequencies.includes(derivedFrequency)) {
      return NextResponse.json(
        { ok: false, error: "Invalid derived frequency from schedule. Expected weekly, fortnightly, four_weekly, monthly.", code: "BAD_DERIVED_FREQUENCY", derivedFrequency },
        { status: 400 }
      );
    }

    const canonicalPay = computeCanonicalPayDateOrError({
      schedule,
      inputPayDateIso: pay_date_input,
    });

    if (!canonicalPay.ok) {
      return NextResponse.json(
        { ok: false, code: canonicalPay.code, error: canonicalPay.error, details: canonicalPay.details ?? null, debugSource: "payroll_runs_create_debug_v12_paydate" },
        { status: 400 }
      );
    }

    const canonicalPayDateIso = canonicalPay.payDateIso;

    const period = computePayPeriodFromSchedule({
      schedule,
      canonicalPayDateIso,
    });

    const { taxYearStartIso } = getUkTaxYearBounds(null);
    const computedRunNumber = makeRunNumberFromPayDate(derivedFrequency, canonicalPayDateIso, taxYearStartIso);

    const safeRunName = run_name_input || defaultRunNameFromPayDate(derivedFrequency, canonicalPayDateIso);

    if (computedRunNumber) {
      const existingRes = await findExistingRunByRunNumber(client, companyIdStr, computedRunNumber);
      if (existingRes.error) {
        return NextResponse.json(
          { ok: false, error: existingRes.error, debugSource: "payroll_runs_create_debug_v12_existing_check" },
          { status: 500 }
        );
      }

      if (existingRes.row?.id) {
        const existingPayDate = existingRes.row.pay_date ?? null;

        if (existingPayDate && isIsoDateOnly(existingPayDate) && existingPayDate !== canonicalPayDateIso) {
          return payDateMismatchResponse({
            existingId: existingRes.row.id,
            existingPayDate,
            requestedPayDate: canonicalPayDateIso,
            runNumber: computedRunNumber,
          });
        }

        const res = NextResponse.json(
          {
            ok: true,
            id: existingRes.row.id,
            run_id: existingRes.row.id,
            reusedExisting: true,
            run: {
              id: existingRes.row.id,
              company_id: companyIdStr,
              frequency: existingRes.row.frequency ?? derivedFrequency,
              status: existingRes.row.status ?? "draft",
              pay_date: existingPayDate ?? canonicalPayDateIso,
              run_number: computedRunNumber,
              run_name: safeRunName,
              period_start: period.startIso,
              period_end: period.endIso,
              pay_period_start: period.startIso,
              pay_period_end: period.endIso,
              pay_schedule_id: pay_schedule_id_input,
              run_kind: "primary",
              parent_run_id: null,
            },
            debugSource: "payroll_runs_create_debug_v12_existing_check",
          },
          { status: 200 }
        );

        clearWizardCookie(res);
        return res;
      }
    }

    const overrideReason = typeof body?.pay_date_override_reason === "string" ? body.pay_date_override_reason.trim() : "";
    const pay_date_overridden_input = typeof body?.pay_date_overridden === "boolean" ? body.pay_date_overridden : null;

    let pay_date_overridden = pay_date_overridden_input !== null ? !!pay_date_overridden_input : false;
    if (overrideReason) pay_date_overridden = true;

    const create_request_id = randomUUID();

    const insertRowBase: any = {
      company_id: companyIdStr,
      frequency: derivedFrequency,
      status: "draft",
      pay_date: canonicalPayDateIso,
      pay_date_overridden,
      pay_date_override_reason: pay_date_overridden && overrideReason ? overrideReason : null,
      attached_all_due_employees: false,

      run_kind: "primary",
      parent_run_id: null,

      create_request_id,
      run_name: safeRunName,
    };

    if (computedRunNumber) {
      insertRowBase.run_number = computedRunNumber;
    }

    const rowVariants: any[] = [
      {
        ...insertRowBase,
        pay_schedule_id: pay_schedule_id_input,
        pay_period_start: period.startIso,
        pay_period_end: period.endIso,
        period_start: period.startIso,
        period_end: period.endIso,
      },
      {
        ...insertRowBase,
        pay_schedule_id: pay_schedule_id_input,
        pay_period_start: period.startIso,
        pay_period_end: period.endIso,
      },
      {
        ...insertRowBase,
        pay_schedule_id: pay_schedule_id_input,
        period_start: period.startIso,
        period_end: period.endIso,
      },
      {
        ...insertRowBase,
      },
    ];

    const selectCols = [
      "id",
      "company_id",
      "frequency",
      "status",
      "pay_date",
      "pay_date_overridden",
      "pay_date_override_reason",
      "attached_all_due_employees",
      "created_at",
      "total_gross_pay",
      "total_tax",
      "total_ni",
      "total_net_pay",
      "pay_period_start",
      "pay_period_end",
      "pay_schedule_id",
      "run_kind",
      "parent_run_id",
      "run_name",
      "run_number",
    ].join(", ");

    let createdRes: PostgrestSingleResponse<PayrollRunRow> | null = null;
    let lastErr: any = null;

    for (const row of rowVariants) {
      const attempt = (await client
        .from("payroll_runs")
        .insert(row)
        .select(selectCols)
        .single()) as PostgrestSingleResponse<PayrollRunRow>;

      if (!attempt.error && attempt.data) {
        createdRes = attempt;
        lastErr = null;
        break;
      }

      lastErr = attempt.error;

      if (computedRunNumber && isUniqueViolation(attempt.error)) {
        const existingRes = await findExistingRunByRunNumber(client, companyIdStr, computedRunNumber);

        if (existingRes.error) {
          return NextResponse.json(
            { ok: false, error: existingRes.error, debugSource: "payroll_runs_create_debug_v12_dupe_reuse_lookup" },
            { status: 500 }
          );
        }

        if (existingRes.row?.id) {
          const existingPayDate = existingRes.row.pay_date ?? null;

          if (existingPayDate && isIsoDateOnly(existingPayDate) && existingPayDate !== canonicalPayDateIso) {
            return payDateMismatchResponse({
              existingId: existingRes.row.id,
              existingPayDate,
              requestedPayDate: canonicalPayDateIso,
              runNumber: computedRunNumber,
            });
          }

          const res = NextResponse.json(
            {
              ok: true,
              id: existingRes.row.id,
              run_id: existingRes.row.id,
              reusedExisting: true,
              run: {
                id: existingRes.row.id,
                company_id: companyIdStr,
                frequency: existingRes.row.frequency ?? derivedFrequency,
                status: existingRes.row.status ?? "draft",
                pay_date: existingPayDate ?? canonicalPayDateIso,
                run_number: computedRunNumber,
                run_name: safeRunName,
                period_start: period.startIso,
                period_end: period.endIso,
                pay_period_start: period.startIso,
                pay_period_end: period.endIso,
                pay_schedule_id: pay_schedule_id_input,
                run_kind: "primary",
                parent_run_id: null,
                create_request_id: null,
              },
              debugSource: "payroll_runs_create_debug_v12_dupe_reuse",
            },
            { status: 200 }
          );

          clearWizardCookie(res);
          return res;
        }
      }

      const missingCols = [
        "pay_schedule_id",
        "pay_period_start",
        "pay_period_end",
        "period_start",
        "period_end",
        "run_number",
        "run_name",
        "run_kind",
        "parent_run_id",
        "create_request_id",
      ];

      if (!isMissingColumnError(attempt.error, missingCols)) {
        break;
      }
    }

    if (!createdRes || createdRes.error || !createdRes.data) {
      return NextResponse.json({ ok: false, error: lastErr, debugSource: "payroll_runs_create_debug_v12" }, { status: 500 });
    }

    const run = createdRes.data;

    const res = NextResponse.json(
      {
        ok: true,
        id: run.id,
        run_id: run.id,
        reusedExisting: false,
        run: {
          ...run,
          run_number: computedRunNumber,
          run_name: safeRunName,
          period_start: run.pay_period_start ?? period.startIso,
          period_end: run.pay_period_end ?? period.endIso,
          pay_period_start: run.pay_period_start ?? period.startIso,
          pay_period_end: run.pay_period_end ?? period.endIso,
          pay_schedule_id: pay_schedule_id_input,
          run_kind: "primary",
          parent_run_id: null,
          create_request_id,
        },
        debugSource: "payroll_runs_create_debug_v12",
      },
      { status: 201 }
    );

    clearWizardCookie(res);
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error", debugSource: "payroll_runs_post_debug_v13" },
      { status: 500 }
    );
  }
}
