/* C:\Projects\wageflow01\app\api\payroll\runs\route.ts */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getAdmin } from "@lib/admin";
import { syncAbsencePayToRun } from "@lib/payroll/syncAbsencePayToRun";
import { labelForRun, type Frequency } from "@lib/payroll/naming";

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

  archived_at?: string | null;
};

type PayScheduleRow = {
  id: string;
  company_id: string;
  frequency: string | null;
  cycle_anchor_pay_date?: string | null;
  pay_timing?: string | null;
  pay_day_of_week?: number | null;
  pay_day_of_month?: number | null;
  pay_date_adjustment?: string | null;
  pay_date_offset_days?: number | null;
  is_template?: boolean | null;
  is_active?: boolean | null;
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

function parseIsoDateOnlyToUtc(iso: string) {
  const s = String(iso || "").trim();
  if (!isIsoDateOnly(s)) throw new Error("Bad date: " + s);
  const [y, m, d] = s.split("-").map((p) => parseInt(p, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
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

function normalizePayTiming(v: string | null | undefined) {
  const raw = String(v || "arrears").trim().toLowerCase();
  if (raw === "advance") return "advance";
  return "arrears";
}

function periodDaysForFrequency(frequency: string) {
  const f = String(frequency || "").trim();
  if (f === "weekly") return 7;
  if (f === "fortnightly") return 14;
  if (f === "four_weekly") return 28;
  return 7;
}

function computeManualPayPeriodFallback(args: {
  schedule: PayScheduleRow;
  payDateIso: string;
}): { startIso: string; endIso: string; warning?: string } {
  const schedule = args.schedule;
  const payUtc = parseIsoDateOnlyToUtc(args.payDateIso);
  const frequency = String(schedule.frequency || "").trim();
  const payTiming = normalizePayTiming(schedule.pay_timing);

  if (frequency === "monthly") {
    const y = payUtc.getUTCFullYear();
    const m = payUtc.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    return {
      startIso: dateOnlyIsoUtc(start),
      endIso: dateOnlyIsoUtc(end),
    };
  }

  if (frequency === "weekly") {
    if (payTiming === "arrears") {
      const payWeekStart = mondayOfWeekUtc(payUtc);
      const end = addDaysUtc(payWeekStart, -1);
      const start = addDaysUtc(end, -6);
      return {
        startIso: dateOnlyIsoUtc(start),
        endIso: dateOnlyIsoUtc(end),
      };
    }

    const start = mondayOfWeekUtc(payUtc);
    const end = addDaysUtc(start, 6);
    return {
      startIso: dateOnlyIsoUtc(start),
      endIso: dateOnlyIsoUtc(end),
    };
  }

  const periodDays = frequency === "fortnightly" ? 14 : 28;
  const anchorIso = String(schedule.cycle_anchor_pay_date || "").trim();

  if (isIsoDateOnly(anchorIso)) {
    let end = parseIsoDateOnlyToUtc(anchorIso);

    if (payUtc.getTime() > end.getTime()) {
      while (end.getTime() < payUtc.getTime()) {
        end = addDaysUtc(end, periodDays);
      }
    } else {
      while (addDaysUtc(end, -periodDays).getTime() >= payUtc.getTime()) {
        end = addDaysUtc(end, -periodDays);
      }
    }

    const start = addDaysUtc(end, -(periodDays - 1));

    return {
      startIso: dateOnlyIsoUtc(start),
      endIso: dateOnlyIsoUtc(end),
    };
  }

  const end = payUtc;
  const start = addDaysUtc(end, -(periodDays - 1));

  return {
    startIso: dateOnlyIsoUtc(start),
    endIso: dateOnlyIsoUtc(end),
    warning:
      "No cycle anchor date was found for this schedule, so the pay period was derived from the selected pay date.",
  };
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
  const start =
    today >= candidateStart
      ? candidateStart
      : new Date(Date.UTC(year - 1, 3, 6));

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);

  return {
    taxYearStartIso: start.toISOString().slice(0, 10),
    taxYearEndIso: end.toISOString().slice(0, 10),
  };
}

function getUkTaxYearBoundsForReferenceDate(referenceDateIso: string | null) {
  if (!referenceDateIso || !isIsoDateOnly(referenceDateIso)) {
    return getUkTaxYearBounds(null);
  }

  const referenceUtc = parseIsoDateOnlyToUtc(referenceDateIso);
  const year = referenceUtc.getUTCFullYear();
  const candidateStart = new Date(Date.UTC(year, 3, 6));
  const start =
    referenceUtc >= candidateStart
      ? candidateStart
      : new Date(Date.UTC(year - 1, 3, 6));

  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);

  return {
    taxYearStartIso: start.toISOString().slice(0, 10),
    taxYearEndIso: end.toISOString().slice(0, 10),
  };
}

function normalizeFrequencyForRunLabel(frequency: string): Frequency | null {
  const f = String(frequency || "").trim().toLowerCase();

  if (
    f === "weekly" ||
    f === "fortnightly" ||
    f === "fourweekly" ||
    f === "four_weekly" ||
    f === "monthly"
  ) {
    return f;
  }

  return null;
}

function makeRunNumberForDate(
  frequency: string,
  payDateIso: string | null,
  taxYearStartIso: string
) {
  if (!payDateIso || !isIsoDateOnly(payDateIso)) return null;
  if (!taxYearStartIso || !isIsoDateOnly(taxYearStartIso)) return null;

  const normalizedFrequency = normalizeFrequencyForRunLabel(frequency);
  if (!normalizedFrequency) return null;

  try {
    return labelForRun({
      frequency: normalizedFrequency,
      periodStart: payDateIso,
      taxYearStart: taxYearStartIso,
    });
  } catch {
    return null;
  }
}
function defaultRunNameFromPayDate(frequency: string, payDateIso: string | null) {
  const pay = payDateIso ? isoToUkDate(payDateIso) : "unscheduled";
  return frequencyLabel(frequency) + " payroll (pay date " + pay + ")";
}

function isMissingColumnError(err: any, columnNames: string[]) {
  const msg = String(err?.message ?? err ?? "");
  if (!msg) return false;

  const looksLikeMissingColumn =
    msg.toLowerCase().includes("does not exist") ||
    msg.toLowerCase().includes("column");

  if (!looksLikeMissingColumn) return false;

  return columnNames.some((c) => c && msg.includes(c));
}

function isUniqueViolation(err: any) {
  const code = String(err?.code ?? "").trim();
  const msg = String(err?.message ?? err ?? "").toLowerCase();

  if (code === "23505") return true;

  if (msg.includes("duplicate key value violates unique constraint")) return true;
  if (msg.includes("uq_payroll_runs_company_run_number")) return true;
  if (msg.includes("payroll_runs_one_primary_per_schedule_period")) return true;

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

function normalizeRpcError(err: any) {
  const code = String(err?.code ?? "").trim();
  const message = String(err?.message ?? err ?? "").trim();
  const details = String(err?.details ?? "").trim();
  const hint = String(err?.hint ?? "").trim();
  return { code, message, details, hint };
}

function mapCreateSupplementaryRpcErrorToResponse(err: any, parentRunId: string) {
  const e = normalizeRpcError(err);
  const msgLower = e.message.toLowerCase();

  const debug = {
    pg_code: e.code || null,
    message: e.message || null,
    details: e.details || null,
    hint: e.hint || null,
  };

  if (
    e.code === "PGRST202" ||
    msgLower.includes("schema cache") ||
    msgLower.includes("could not find the function")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Supplementary run RPC is not available to the API right now. This is usually schema cache lag or a missing migration.",
        code: "SUPPLEMENTARY_RPC_NOT_AVAILABLE",
        parent: { id: parentRunId },
        debugSource: "create_supplementary_run_rpc",
        debug,
      },
      { status: 503 }
    );
  }

  if (e.code === "P0001") {
    if (msgLower.includes("supplementary run already exists")) {
      const match = e.message.match(/existing_run_id=([0-9a-f-]{36})/i);
      const existingId = match ? String(match[1]).trim() : null;

      return NextResponse.json(
        {
          ok: false,
          error:
            "A supplementary run already exists for this parent. Open it instead of creating another.",
          code: "SUPPLEMENTARY_ALREADY_EXISTS",
          parent: { id: parentRunId },
          existing: existingId ? { id: existingId } : null,
          debugSource: "create_supplementary_run_rpc",
          debug,
        },
        { status: 409 }
      );
    }

    if (msgLower.includes("parent run must be completed")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supplementary runs are only allowed after the parent run is completed.",
          code: "PARENT_NOT_COMPLETED",
          parent: { id: parentRunId },
          debugSource: "create_supplementary_run_rpc",
          debug,
        },
        { status: 409 }
      );
    }

    if (msgLower.includes("parent run is missing pay_schedule_id")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Parent run is missing pay_schedule_id. Fix the parent run first.",
          code: "PARENT_MISSING_SCHEDULE",
          parent: { id: parentRunId },
          debugSource: "create_supplementary_run_rpc",
          debug,
        },
        { status: 400 }
      );
    }

    if (msgLower.includes("parent run not found")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Parent run not found.",
          code: "PARENT_NOT_FOUND",
          parent: { id: parentRunId },
          debugSource: "create_supplementary_run_rpc",
          debug,
        },
        { status: 404 }
      );
    }

    if (msgLower.includes("weekly") && msgLower.includes("not allowed")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supplementary runs are not allowed for weekly payroll runs.",
          code: "SUPPLEMENTARY_NOT_ALLOWED_WEEKLY",
          parent: { id: parentRunId },
          debugSource: "create_supplementary_run_rpc",
          debug,
        },
        { status: 409 }
      );
    }

    if (
      msgLower.includes("only allowed for fortnightly") ||
      msgLower.includes(
        "only allowed for fortnightly, four_weekly, or monthly"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supplementary runs are only allowed for fortnightly, 4-weekly, or monthly payroll runs.",
          code: "SUPPLEMENTARY_NOT_ALLOWED_FREQUENCY",
          parent: { id: parentRunId },
          debugSource: "create_supplementary_run_rpc",
          debug,
        },
        { status: 409 }
      );
    }

    if (
      msgLower.includes("open supplementary") ||
      msgLower.includes("already exists for this parent") ||
      msgLower.includes("complete or archive it first")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "An open supplementary run already exists for this parent. Complete it before creating another.",
          code: "SUPPLEMENTARY_ALREADY_OPEN",
          parent: { id: parentRunId },
          debugSource: "create_supplementary_run_rpc",
          debug,
        },
        { status: 409 }
      );
    }

    if (
      msgLower.includes("cannot create a supplementary run from a supplementary run")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cannot create a supplementary run from a supplementary run.",
          code: "BAD_PARENT_KIND",
          parent: { id: parentRunId },
          debugSource: "create_supplementary_run_rpc",
          debug,
        },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Could not create supplementary run.",
      code: "SUPPLEMENTARY_CREATE_FAILED",
      parent: { id: parentRunId },
      debugSource: "create_supplementary_run_rpc",
      debug,
    },
    { status: 500 }
  );
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

async function findExistingPrimaryRunBySchedulePeriod(
  client: any,
  companyId: string,
  payScheduleId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ row: any | null; error: any | null }> {
  const attempts = [
    {
      startCol: "pay_period_start",
      endCol: "pay_period_end",
      includeRunKind: true,
    },
    {
      startCol: "pay_period_start",
      endCol: "pay_period_end",
      includeRunKind: false,
    },
    {
      startCol: "period_start",
      endCol: "period_end",
      includeRunKind: true,
    },
    {
      startCol: "period_start",
      endCol: "period_end",
      includeRunKind: false,
    },
  ];

  let lastErr: any = null;

  for (const attempt of attempts) {
    const selectCols = [
      "id",
      "pay_date",
      "frequency",
      "status",
      "pay_schedule_id",
      "run_name",
      "run_number",
      "parent_run_id",
      ...(attempt.includeRunKind ? ["run_kind"] : []),
      attempt.startCol,
      attempt.endCol,
    ].join(", ");

    let q = client
      .from("payroll_runs")
      .select(selectCols)
      .eq("company_id", companyId)
      .eq("pay_schedule_id", payScheduleId)
      .eq(attempt.startCol, periodStart)
      .eq(attempt.endCol, periodEnd);

    if (attempt.includeRunKind) {
      q = q.eq("run_kind", "primary");
    }

    const res = await q.limit(1);

    const row = Array.isArray(res.data) ? res.data[0] ?? null : null;

    if (!res.error) {
      return { row, error: null };
    }

    const relevantMissingCols = [attempt.startCol, attempt.endCol];
    if (attempt.includeRunKind) relevantMissingCols.push("run_kind");

    if (!isMissingColumnError(res.error, relevantMissingCols)) {
      return { row: null, error: res.error };
    }

    lastErr = res.error;
  }

  return { row: null, error: lastErr };
}

function buildExistingPrimaryRunResponse(args: {
  existing: any;
  companyId: string;
  derivedFrequency: string;
  requestedPayDate: string;
  computedRunNumber: string | null;
  safeRunName: string;
  payScheduleId: string;
  period: { startIso: string; endIso: string };
  warning?: string | null;
}) {
  const existingStart =
    args.existing.pay_period_start ??
    args.existing.period_start ??
    args.period.startIso;

  const existingEnd =
    args.existing.pay_period_end ??
    args.existing.period_end ??
    args.period.endIso;

  const existingPayDate = args.existing.pay_date ?? null;

  let warning = args.warning ?? null;

  if (
    existingPayDate &&
    isIsoDateOnly(existingPayDate) &&
    existingPayDate !== args.requestedPayDate
  ) {
    warning = warning
      ? `${warning} Existing primary run for this schedule and period has pay date ${existingPayDate}; opening it instead of creating another.`
      : `Existing primary run for this schedule and period has pay date ${existingPayDate}; opening it instead of creating another.`;
  }

  const res = NextResponse.json(
    {
      ok: true,
      id: args.existing.id,
      run_id: args.existing.id,
      reusedExisting: true,
      existingReason: "SCHEDULE_PERIOD",
      warning,
      run: {
        id: args.existing.id,
        company_id: args.companyId,
        frequency: args.existing.frequency ?? args.derivedFrequency,
        status: args.existing.status ?? "draft",
        pay_date: existingPayDate ?? args.requestedPayDate,
        run_number: args.existing.run_number ?? args.computedRunNumber,
        run_name: args.existing.run_name ?? args.safeRunName,
        period_start: existingStart,
        period_end: existingEnd,
        pay_period_start: existingStart,
        pay_period_end: existingEnd,
        pay_schedule_id: args.existing.pay_schedule_id ?? args.payScheduleId,
        run_kind: args.existing.run_kind ?? "primary",
        parent_run_id: args.existing.parent_run_id ?? null,
      },
      debugSource: "payroll_runs_create_debug_v16_schedule_period_reuse",
    },
    { status: 200 }
  );

  clearWizardCookie(res);
  return res;
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

async function bestEffortAbsenceSync(args: {
  client: any;
  runId: string;
  runRow: any;
}) {
  const { client, runId, runRow } = args;

  try {
    const { data: preRows, error: preErr } = await client
      .from("payroll_run_employees")
      .select("*")
      .eq("run_id", runId);

    if (preErr) {
      console.error("[payroll_runs] absence sync: failed to load payroll_run_employees", {
        runId,
        error: preErr,
      });
      return;
    }

    const payrollRunEmployees = Array.isArray(preRows) ? preRows : [];

    await syncAbsencePayToRun({
      supabase: client,
      runId,
      runRow,
      payrollRunEmployees,
    });
  } catch (err: any) {
    console.error("[payroll_runs] absence sync: unexpected failure", {
      runId,
      error: err?.message ?? err,
    });
  }
}

export async function GET(req: Request) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Admin client not available" },
        { status: 503 }
      );
    }

    const { client, companyId } = admin;

    if (!companyId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Active company not set. Expected active_company_id or company_id cookie.",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const debugMode = normalizeQueryParam(searchParams.get("debug")) === "1";
    const includeArchived =
      normalizeQueryParam(searchParams.get("includeArchived")) === "1";

    const query: RunsQuery = {
      frequency: normalizeQueryParam(searchParams.get("frequency")),
      taxYearStart: normalizeQueryParam(searchParams.get("taxYearStart")),
    };

    const allowedFrequencies = [
      "weekly",
      "fortnightly",
      "four_weekly",
      "monthly",
    ];
    const frequency = query.frequency ?? null;

    if (frequency && !allowedFrequencies.includes(frequency)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid frequency, expected one of weekly, fortnightly, four_weekly, monthly",
        },
        { status: 400 }
      );
    }

    const { taxYearStartIso, taxYearEndIso } = getUkTaxYearBounds(
      query.taxYearStart ?? null
    );
    const companyIdTrim = String(companyId || "").trim();

    const debugCounts: any = debugMode ? {} : null;

    if (debugMode) {
      let companyOnlyQ = client
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyIdTrim);

      let inTaxYearQ = client
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyIdTrim)
        .gte("pay_date", taxYearStartIso)
        .lte("pay_date", taxYearEndIso);

      if (!includeArchived) {
        companyOnlyQ = companyOnlyQ.is("archived_at", null);
        inTaxYearQ = inTaxYearQ.is("archived_at", null);
      }

      const companyOnlyRes =
        (await companyOnlyQ) as unknown as PostgrestCountResponse;
      const inTaxYearRes =
        (await inTaxYearQ) as unknown as PostgrestCountResponse;

      debugCounts.companyOnly = {
        count: (companyOnlyRes as any)?.count ?? null,
        error: (companyOnlyRes as any)?.error ?? null,
      };

      debugCounts.inTaxYearByPayDate = {
        count: (inTaxYearRes as any)?.count ?? null,
        error: (inTaxYearRes as any)?.error ?? null,
      };
    }

    const baseSelectCols = [
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
    ];

    const selectWithArchived = baseSelectCols.concat(["archived_at"]).join(", ");
    const selectWithoutArchived = baseSelectCols.join(", ");

    const buildListQuery = (selectCols: string, filterArchived: boolean) => {
      let q = client
        .from("payroll_runs")
        .select(selectCols)
        .eq("company_id", companyIdTrim)
        .gte("pay_date", taxYearStartIso)
        .lte("pay_date", taxYearEndIso);

      if (frequency) q = q.eq("frequency", frequency);
      if (filterArchived) q = q.is("archived_at", null);

      return q
        .order("pay_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    };

    let listRes = await buildListQuery(selectWithArchived, !includeArchived);

    if (listRes.error && isMissingColumnError(listRes.error, ["archived_at"])) {
      listRes = await buildListQuery(selectWithoutArchived, false);
    }

    if (listRes.error) {
      return NextResponse.json(
        {
          ok: false,
          error: listRes.error,
          debugSource: "payroll_runs_list_debug_v14",
        },
        { status: 500 }
      );
    }

    const rows = Array.isArray(listRes.data) ? listRes.data : [];

    const runs = rows.map((row: any) => {
      const f = String(row.frequency || "").trim();
      const payDateIso = row.pay_date ?? null;

      const computedRunNumber = makeRunNumberForDate(
        f,
        payDateIso,
        taxYearStartIso
      );
      const computedRunName = defaultRunNameFromPayDate(f, payDateIso);

      const kind = String(row.run_kind || "primary").trim().toLowerCase();
      const parent = row.parent_run_id ?? null;

      const startIso = row.pay_period_start ?? row.period_start ?? null;
      const endIso = row.pay_period_end ?? row.period_end ?? null;

      const baseNumber = row.run_number ?? computedRunNumber ?? null;
      const runNumberOut =
        kind === "supplementary"
          ? baseNumber
            ? String(baseNumber) + " SUPP"
            : "SUPP"
          : baseNumber;

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

        archived_at: row.archived_at ?? null,

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
      debugSource: "payroll_runs_list_debug_v14",
      query,
      taxYear: { start: taxYearStartIso, end: taxYearEndIso },
      activeCompanyId: companyIdTrim,
      filterMode: "pay_date_in_tax_year",
      frequencyApplied: frequency,
      includeArchived,
      debugCounts,
      runs,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unexpected error",
        debugSource: "payroll_runs_list_debug_v14",
      },
      { status: 500 }
    );
  }
}

async function createSupplementaryRunRpc(client: any, parentRunId: string) {
  const preferred = await client.rpc("create_supplementary_run", {
    p_parent_run_id: parentRunId,
  });
  if (!preferred?.error) return preferred;

  const code = String(preferred?.error?.code ?? "").trim();
  const msg = String(preferred?.error?.message ?? preferred?.error ?? "");
  const msgLower = msg.toLowerCase();

  const looksLikeArgOrCache =
    code === "PGRST202" ||
    msgLower.includes("schema cache") ||
    msgLower.includes("could not find the function") ||
    msgLower.includes("searched for the function") ||
    msgLower.includes("parameter") ||
    msgLower.includes("named") ||
    msgLower.includes("argument");

  if (looksLikeArgOrCache) {
    const fallback = await client.rpc("create_supplementary_run", {
      parent_run_id: parentRunId,
    });
    return fallback;
  }

  return preferred;
}

export async function POST(req: Request) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Admin client not available" },
        { status: 503 }
      );
    }

    const { client, companyId } = admin;

    if (!companyId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Active company not set. Expected active_company_id or company_id cookie.",
        },
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
          {
            ok: false,
            error: "Missing or invalid parent_run_id.",
            code: "BAD_PARENT_RUN_ID",
          },
          { status: 400 }
        );
      }

      const parentRes = (await client
        .from("payroll_runs")
        .select(
          "id, company_id, run_kind, frequency, pay_schedule_id, pay_date, pay_period_start, pay_period_end, status"
        )
        .eq("id", parentRunId)
        .single()) as PostgrestSingleResponse<PayrollRunRow>;

      if (parentRes.error || !parentRes.data) {
        return NextResponse.json(
          {
            ok: false,
            error: "Parent run not found.",
            code: "PARENT_NOT_FOUND",
            debug: parentRes.error ?? null,
          },
          { status: 404 }
        );
      }

      const parent = parentRes.data;

      if (String(parent.company_id || "").trim() !== companyIdStr) {
        return NextResponse.json(
          {
            ok: false,
            error: "Parent run does not belong to the active company.",
            code: "PARENT_COMPANY_MISMATCH",
          },
          { status: 403 }
        );
      }

      const parentKind = String(parent.run_kind || "primary")
        .trim()
        .toLowerCase();

      if (parentKind === "supplementary") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Cannot create a supplementary run from a supplementary run.",
            code: "BAD_PARENT_KIND",
          },
          { status: 400 }
        );
      }

      const parentStatus = String(parent.status || "").trim().toLowerCase();
      if (parentStatus !== "completed") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Supplementary runs are only allowed after the parent run is completed.",
            code: "PARENT_NOT_COMPLETED",
            parent: { id: parentRunId, status: parent.status ?? null },
          },
          { status: 409 }
        );
      }

      const parentFrequency = String(parent.frequency || "").trim().toLowerCase();
      const allowedSuppFrequencies = ["fortnightly", "four_weekly", "monthly"];

      if (parentFrequency === "weekly") {
        return NextResponse.json(
          {
            ok: false,
            error: "Supplementary runs are not allowed for weekly payroll runs.",
            code: "SUPPLEMENTARY_NOT_ALLOWED_WEEKLY",
            parent: { id: parentRunId, frequency: parent.frequency ?? null },
          },
          { status: 409 }
        );
      }

      if (!allowedSuppFrequencies.includes(parentFrequency)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Supplementary runs are only allowed for fortnightly, 4-weekly, or monthly payroll runs.",
            code: "SUPPLEMENTARY_NOT_ALLOWED_FREQUENCY",
            parent: { id: parentRunId, frequency: parent.frequency ?? null },
          },
          { status: 409 }
        );
      }

      if (!parent.pay_schedule_id) {
        return NextResponse.json(
          {
            ok: false,
            error: "Parent run is missing pay_schedule_id. Fix the parent run first.",
            code: "PARENT_MISSING_SCHEDULE",
          },
          { status: 400 }
        );
      }

      const existingSuppQuery = await client
        .from("payroll_runs")
        .select("id, status, archived_at, created_at, parent_run_id, run_kind")
        .eq("company_id", companyIdStr)
        .eq("parent_run_id", parentRunId)
        .eq("run_kind", "supplementary")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingSuppQuery.error) {
        return NextResponse.json(
          {
            ok: false,
            error: existingSuppQuery.error,
            code: "SUPPLEMENTARY_EXISTS_CHECK_FAILED",
            debugSource: "supp_exists_check_v1",
          },
          { status: 500 }
        );
      }

      const existingSupp = Array.isArray(existingSuppQuery.data)
        ? existingSuppQuery.data[0]
        : null;

      if (existingSupp?.id) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "A supplementary run already exists for this parent. Open it instead of creating another.",
            code: "SUPPLEMENTARY_ALREADY_EXISTS",
            parent: { id: parentRunId },
            existing: {
              id: String(existingSupp.id),
              status: existingSupp.status ?? null,
              archived_at: existingSupp.archived_at ?? null,
            },
            debugSource: "supp_exists_check_v1",
          },
          { status: 409 }
        );
      }

      const rpcRes = await createSupplementaryRunRpc(client, parentRunId);

      if (rpcRes?.error) {
        return mapCreateSupplementaryRpcErrorToResponse(rpcRes.error, parentRunId);
      }

      let newId: string | null = null;
      if (typeof rpcRes?.data === "string") newId = rpcRes.data;
      else if (rpcRes?.data && typeof rpcRes.data === "object") {
        newId = String((rpcRes.data as any)?.id || "");
      } else if (Array.isArray(rpcRes?.data) && rpcRes.data.length > 0) {
        newId = String(rpcRes.data[0]);
      }

      newId = String(newId || "").trim();

      if (!isUuid(newId)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Supplementary run RPC returned no valid id.",
            code: "SUPPLEMENTARY_NO_ID",
          },
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
          {
            ok: true,
            run_id: newId,
            created: true,
            run: null,
            warning: "Created but could not fetch run row.",
            debug: newRes.error ?? null,
          },
          { status: 201 }
        );
      }

      await bestEffortAbsenceSync({
        client,
        runId: newId,
        runRow: newRes.data,
      });

      return NextResponse.json(
        {
          ok: true,
          run_id: newId,
          created: true,
          run: newRes.data,
          debugSource: "supplementary_create_v2",
        },
        { status: 201 }
      );
    }

    const jar = await cookies();
    const cookieToken = jar.get("wf_payroll_run_wizard")?.value ?? null;
    const wizardToken =
      typeof body?.wizardToken === "string" ? body.wizardToken.trim() : "";

    if (!cookieToken || !wizardToken || wizardToken !== cookieToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Payroll run creation is restricted. Use the Payroll Run Wizard on the Dashboard.",
          code: "WIZARD_ONLY",
        },
        { status: 403 }
      );
    }

    const allowedFrequencies = ["weekly", "fortnightly", "four_weekly", "monthly"];

    const pay_schedule_id_input =
      typeof body?.pay_schedule_id === "string"
        ? body.pay_schedule_id.trim()
        : "";

    const pay_date_raw_1 =
      typeof body?.pay_date === "string" ? body.pay_date.trim() : "";
    const pay_date_raw_2 =
      typeof body?.payment_date === "string" ? body.payment_date.trim() : "";
    const pay_date_input = (pay_date_raw_1 || pay_date_raw_2 || "").trim();

    const run_name_input =
      typeof body?.run_name === "string" ? body.run_name.trim() : "";
    const period_start_input =
      typeof body?.period_start === "string" ? body.period_start.trim() : "";
    const period_end_input =
      typeof body?.period_end === "string" ? body.period_end.trim() : "";

    if (!pay_schedule_id_input) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing pay_schedule_id.",
          code: "MISSING_PAY_SCHEDULE_ID",
        },
        { status: 400 }
      );
    }

    if (!isIsoDateOnly(pay_date_input)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid pay_date. Expected YYYY-MM-DD.",
          code: "BAD_PAY_DATE",
        },
        { status: 400 }
      );
    }

    const scheduleRes = (await client
      .from("pay_schedules")
      .select(
        "id, company_id, frequency, cycle_anchor_pay_date, pay_timing, pay_day_of_week, pay_day_of_month, pay_date_adjustment, pay_date_offset_days, is_template, is_active"
      )
      .eq("id", pay_schedule_id_input)
      .eq("company_id", companyIdStr)
      .eq("is_template", false)
      .eq("is_active", true)
      .maybeSingle()) as PostgrestSingleResponse<PayScheduleRow>;

    if (scheduleRes.error || !scheduleRes.data) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid pay_schedule_id for this company.",
          code: "BAD_PAY_SCHEDULE_ID",
          debug: scheduleRes.error ?? null,
        },
        { status: 400 }
      );
    }

    const schedule = scheduleRes.data;
    const derivedFrequency = String(schedule.frequency || "").trim();

    if (!allowedFrequencies.includes(derivedFrequency)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid derived frequency from schedule. Expected weekly, fortnightly, four_weekly, monthly.",
          code: "BAD_DERIVED_FREQUENCY",
          derivedFrequency,
        },
        { status: 400 }
      );
    }

    let period:
      | { startIso: string; endIso: string; warning?: string }
      | null = null;

    if (isIsoDateOnly(period_start_input) && isIsoDateOnly(period_end_input)) {
      if (period_start_input > period_end_input) {
        return NextResponse.json(
          {
            ok: false,
            error: "period_start must be on or before period_end.",
            code: "BAD_PERIOD_RANGE",
          },
          { status: 400 }
        );
      }

      period = {
        startIso: period_start_input,
        endIso: period_end_input,
      };
    } else {
      period = computeManualPayPeriodFallback({
        schedule,
        payDateIso: pay_date_input,
      });
    }

    const runNumberReferenceDateIso =
      derivedFrequency === "monthly" ? pay_date_input : period.startIso;
    const { taxYearStartIso } = getUkTaxYearBoundsForReferenceDate(runNumberReferenceDateIso);
    const computedRunNumber = makeRunNumberForDate(
      derivedFrequency,
      runNumberReferenceDateIso,
      taxYearStartIso
    );
    const safeRunName =
      run_name_input || defaultRunNameFromPayDate(derivedFrequency, pay_date_input);

    const existingPeriodRes = await findExistingPrimaryRunBySchedulePeriod(
      client,
      companyIdStr,
      pay_schedule_id_input,
      period.startIso,
      period.endIso
    );

    if (existingPeriodRes.error) {
      return NextResponse.json(
        {
          ok: false,
          error: existingPeriodRes.error,
          debugSource: "payroll_runs_create_debug_v16_period_check",
        },
        { status: 500 }
      );
    }

    if (existingPeriodRes.row?.id) {
      return buildExistingPrimaryRunResponse({
        existing: existingPeriodRes.row,
        companyId: companyIdStr,
        derivedFrequency,
        requestedPayDate: pay_date_input,
        computedRunNumber,
        safeRunName,
        payScheduleId: pay_schedule_id_input,
        period,
        warning: period.warning ?? null,
      });
    }

    if (computedRunNumber) {
      const existingRes = await findExistingRunByRunNumber(
        client,
        companyIdStr,
        computedRunNumber
      );

      if (existingRes.error) {
        return NextResponse.json(
          {
            ok: false,
            error: existingRes.error,
            debugSource: "payroll_runs_create_debug_v12_existing_check",
          },
          { status: 500 }
        );
      }

      if (existingRes.row?.id) {
        const existingPayDate = existingRes.row.pay_date ?? null;

        if (
          existingPayDate &&
          isIsoDateOnly(existingPayDate) &&
          existingPayDate !== pay_date_input
        ) {
          return payDateMismatchResponse({
            existingId: existingRes.row.id,
            existingPayDate,
            requestedPayDate: pay_date_input,
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
              pay_date: existingPayDate ?? pay_date_input,
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

    const overrideReason =
      typeof body?.pay_date_override_reason === "string"
        ? body.pay_date_override_reason.trim()
        : "";
    const pay_date_overridden_input =
      typeof body?.pay_date_overridden === "boolean"
        ? body.pay_date_overridden
        : null;

    let pay_date_overridden =
      pay_date_overridden_input !== null ? !!pay_date_overridden_input : false;
    if (overrideReason) pay_date_overridden = true;

    const create_request_id = randomUUID();

    const insertRowBase: any = {
      company_id: companyIdStr,
      frequency: derivedFrequency,
      status: "draft",
      pay_date: pay_date_input,
      pay_date_overridden,
      pay_date_override_reason:
        pay_date_overridden && overrideReason ? overrideReason : null,
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

      if (isUniqueViolation(attempt.error)) {
        const existingPeriodResAfterInsert =
          await findExistingPrimaryRunBySchedulePeriod(
            client,
            companyIdStr,
            pay_schedule_id_input,
            period.startIso,
            period.endIso
          );

        if (existingPeriodResAfterInsert.error) {
          return NextResponse.json(
            {
              ok: false,
              error: existingPeriodResAfterInsert.error,
              debugSource:
                "payroll_runs_create_debug_v16_period_reuse_lookup_after_unique",
            },
            { status: 500 }
          );
        }

        if (existingPeriodResAfterInsert.row?.id) {
          return buildExistingPrimaryRunResponse({
            existing: existingPeriodResAfterInsert.row,
            companyId: companyIdStr,
            derivedFrequency,
            requestedPayDate: pay_date_input,
            computedRunNumber,
            safeRunName,
            payScheduleId: pay_schedule_id_input,
            period,
            warning: period.warning ?? null,
          });
        }

        if (computedRunNumber) {
          const existingRes = await findExistingRunByRunNumber(
            client,
            companyIdStr,
            computedRunNumber
          );

          if (existingRes.error) {
            return NextResponse.json(
              {
                ok: false,
                error: existingRes.error,
                debugSource: "payroll_runs_create_debug_v12_dupe_reuse_lookup",
              },
              { status: 500 }
            );
          }

          if (existingRes.row?.id) {
            const existingPayDate = existingRes.row.pay_date ?? null;

            if (
              existingPayDate &&
              isIsoDateOnly(existingPayDate) &&
              existingPayDate !== pay_date_input
            ) {
              return payDateMismatchResponse({
                existingId: existingRes.row.id,
                existingPayDate,
                requestedPayDate: pay_date_input,
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
                  pay_date: existingPayDate ?? pay_date_input,
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
      return NextResponse.json(
        {
          ok: false,
          error: lastErr,
          debugSource: "payroll_runs_create_debug_v12",
        },
        { status: 500 }
      );
    }

    const run = createdRes.data;

    await bestEffortAbsenceSync({
      client,
      runId: run.id,
      runRow: run,
    });

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
        debugSource: "payroll_runs_create_debug_v16",
      },
      { status: 201 }
    );

    clearWizardCookie(res);
    return res;
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unexpected error",
        debugSource: "payroll_runs_post_debug_v15",
      },
      { status: 500 }
    );
  }
}
