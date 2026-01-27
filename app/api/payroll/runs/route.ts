// C:\Users\adamm\Projects\wageflow01\app\api\payroll\runs\route.ts

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

type PayrollRunRow = {
  id: string;
  company_id: string;
  frequency: string | null;
  status: string | null;
  pay_date: string | null;
  pay_date_overridden: boolean | null;
  pay_date_override_reason: string | null;
  attached_all_due_employees: boolean | null;
  created_at?: string | null;

  total_gross_pay?: number | null;
  total_tax?: number | null;
  total_ni?: number | null;
  total_net_pay?: number | null;
};

type CompanyPayScheduleRow = {
  id: string;
  company_id: string;
  frequency: string | null;
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

function derivePeriodFromPayDate(
  frequency: string,
  payDateIso: string | null
): { startIso: string | null; endIso: string | null } {
  if (!payDateIso || !isIsoDateOnly(payDateIso)) return { startIso: null, endIso: null };

  const f = String(frequency || "").trim();
  const payUtc = parseIsoDateOnlyToUtc(payDateIso);

  if (f === "monthly") {
    const y = payUtc.getUTCFullYear();
    const m = payUtc.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    return { startIso: dateOnlyIsoUtc(start), endIso: dateOnlyIsoUtc(end) };
  }

  const periodDays = f === "weekly" ? 7 : f === "fortnightly" ? 14 : f === "four_weekly" ? 28 : null;
  if (!periodDays) return { startIso: null, endIso: null };

  const end = payUtc;
  const start = addDaysUtc(end, -(periodDays - 1));
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

  const looksLikeMissingColumn =
    msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("column");

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
      return NextResponse.json({ ok: false, error: listRes.error, debugSource: "payroll_runs_list_debug_v10" }, { status: 500 });
    }

    const rows = Array.isArray(listRes.data) ? listRes.data : [];

    const runs = rows.map((row: any) => {
      const f = String(row.frequency || "").trim();
      const payDateIso = row.pay_date ?? null;

      const computedRunNumber = makeRunNumberFromPayDate(f, payDateIso, taxYearStartIso);
      const computedRunName = defaultRunNameFromPayDate(f, payDateIso);

      const derivedPeriod = derivePeriodFromPayDate(f, payDateIso);

      return {
        id: row.id,
        company_id: row.company_id,

        run_number: computedRunNumber,
        run_name: computedRunName,
        period_start: derivedPeriod.startIso,
        period_end: derivedPeriod.endIso,
        pay_schedule_id: null,

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
      debugSource: "payroll_runs_list_debug_v10",
      query,
      taxYear: { start: taxYearStartIso, end: taxYearEndIso },
      activeCompanyId: companyIdTrim,
      filterMode: "pay_date_in_tax_year",
      frequencyApplied: frequency,
      debugCounts,
      runs,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error", debugSource: "payroll_runs_list_debug_v10" }, { status: 500 });
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

    const pay_schedule_id_input = typeof body?.pay_schedule_id === "string" ? body.pay_schedule_id.trim() : "";

    const period_start_input = typeof body?.period_start === "string" ? body.period_start.trim() : "";
    const period_end_input = typeof body?.period_end === "string" ? body.period_end.trim() : "";

    const pay_date_raw_1 = typeof body?.pay_date === "string" ? body.pay_date.trim() : "";
    const pay_date_raw_2 = typeof body?.payment_date === "string" ? body.payment_date.trim() : "";
    const pay_date_input = (pay_date_raw_1 || pay_date_raw_2 || "").trim();

    const run_name_input = typeof body?.run_name === "string" ? body.run_name.trim() : "";

    if (!pay_schedule_id_input) {
      return NextResponse.json({ ok: false, error: "Missing pay_schedule_id.", code: "MISSING_PAY_SCHEDULE_ID" }, { status: 400 });
    }

    if (!isIsoDateOnly(period_start_input) || !isIsoDateOnly(period_end_input)) {
      return NextResponse.json({ ok: false, error: "Invalid period_start or period_end. Expected YYYY-MM-DD.", code: "BAD_PERIOD" }, { status: 400 });
    }

    if (!isIsoDateOnly(pay_date_input)) {
      return NextResponse.json({ ok: false, error: "Invalid pay_date. Expected YYYY-MM-DD.", code: "BAD_PAY_DATE" }, { status: 400 });
    }

    const companyIdStr = String(companyId || "").trim();

    const scheduleRes = (await client
      .from("company_pay_schedules")
      .select("id, company_id, frequency")
      .eq("id", pay_schedule_id_input)
      .eq("company_id", companyIdStr)
      .single()) as PostgrestSingleResponse<CompanyPayScheduleRow>;

    if (scheduleRes.error || !scheduleRes.data) {
      return NextResponse.json(
        { ok: false, error: "Invalid pay_schedule_id for this company.", code: "BAD_PAY_SCHEDULE_ID", debug: scheduleRes.error ?? null },
        { status: 400 }
      );
    }

    const derivedFrequency = String(scheduleRes.data.frequency || "").trim();

    if (!allowedFrequencies.includes(derivedFrequency)) {
      return NextResponse.json(
        { ok: false, error: "Invalid derived frequency from schedule. Expected weekly, fortnightly, four_weekly, monthly.", code: "BAD_DERIVED_FREQUENCY", derivedFrequency },
        { status: 400 }
      );
    }

    const { taxYearStartIso } = getUkTaxYearBounds(null);
    const computedRunNumber = makeRunNumberFromPayDate(derivedFrequency, pay_date_input, taxYearStartIso);
    const safeRunName = run_name_input || defaultRunNameFromPayDate(derivedFrequency, pay_date_input);

    if (computedRunNumber) {
      const existingRes = await findExistingRunByRunNumber(client, companyIdStr, computedRunNumber);
      if (existingRes.error) {
        return NextResponse.json(
          { ok: false, error: existingRes.error, debugSource: "payroll_runs_create_debug_v10_existing_check" },
          { status: 500 }
        );
      }

      if (existingRes.row?.id) {
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
              pay_date: existingRes.row.pay_date ?? pay_date_input,
              run_number: computedRunNumber,
              run_name: safeRunName,
              period_start: period_start_input,
              period_end: period_end_input,
              pay_schedule_id: pay_schedule_id_input,
              run_kind: "primary",
              parent_run_id: null,
            },
            debugSource: "payroll_runs_create_debug_v10_existing_check",
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
      pay_date: pay_date_input,
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
        pay_period_start: period_start_input,
        pay_period_end: period_end_input,
        period_start: period_start_input,
        period_end: period_end_input,
      },
      {
        ...insertRowBase,
        pay_schedule_id: pay_schedule_id_input,
        pay_period_start: period_start_input,
        pay_period_end: period_end_input,
      },
      {
        ...insertRowBase,
        pay_schedule_id: pay_schedule_id_input,
        period_start: period_start_input,
        period_end: period_end_input,
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
    ].join(", ");

    let createdRes: PostgrestSingleResponse<PayrollRunRow> | null = null;
    let lastErr: any = null;

    for (const row of rowVariants) {
      const attempt = (await client.from("payroll_runs").insert(row).select(selectCols).single()) as PostgrestSingleResponse<PayrollRunRow>;

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
            { ok: false, error: existingRes.error, debugSource: "payroll_runs_create_debug_v10_dupe_reuse_lookup" },
            { status: 500 }
          );
        }

        if (existingRes.row?.id) {
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
                pay_date: existingRes.row.pay_date ?? pay_date_input,
                run_number: computedRunNumber,
                run_name: safeRunName,
                period_start: period_start_input,
                period_end: period_end_input,
                pay_schedule_id: pay_schedule_id_input,
                run_kind: "primary",
                parent_run_id: null,
                create_request_id: null,
              },
              debugSource: "payroll_runs_create_debug_v10_dupe_reuse",
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
      return NextResponse.json(
        { ok: false, error: lastErr, debugSource: "payroll_runs_create_debug_v10" },
        { status: 500 }
      );
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
          period_start: period_start_input,
          period_end: period_end_input,
          pay_schedule_id: pay_schedule_id_input,
          pay_period_start: period_start_input,
          pay_period_end: period_end_input,
          run_kind: "primary",
          parent_run_id: null,
          create_request_id,
        },
        debugSource: "payroll_runs_create_debug_v10",
      },
      { status: 201 }
    );

    clearWizardCookie(res);
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error", debugSource: "payroll_runs_create_debug_v10" },
      { status: 500 }
    );
  }
}
