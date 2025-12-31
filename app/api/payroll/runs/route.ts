/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\payroll\runs\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdmin } from "@lib/admin";

export const dynamic = "force-dynamic";

type RunsQuery = {
  frequency?: string | null;
  taxYearStart?: string | null;
};

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

function defaultRunName(
  frequency: string,
  periodStartIso: string,
  periodEndIso: string
) {
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
  let start: Date;

  if (today >= candidateStart) {
    start = candidateStart;
  } else {
    start = new Date(Date.UTC(year - 1, 3, 6));
  }

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);

  return {
    taxYearStartIso: start.toISOString().slice(0, 10),
    taxYearEndIso: end.toISOString().slice(0, 10),
  };
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
    const query: RunsQuery = {
      frequency: searchParams.get("frequency"),
      taxYearStart: searchParams.get("taxYearStart"),
    };

    const allowedFrequencies = ["weekly", "fortnightly", "four_weekly", "monthly"];
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

    const taxYearBounds = getUkTaxYearBounds(query.taxYearStart ?? null);
    const taxYearStartIso = taxYearBounds.taxYearStartIso;
    const taxYearEndIso = taxYearBounds.taxYearEndIso;

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
          "attached_all_due_employees",
          "total_gross_pay",
          "total_tax",
          "total_ni",
          "total_net_pay",
        ].join(", ")
      )
      .eq("company_id", companyId)
      .gte("period_start", taxYearStartIso)
      .lte("period_end", taxYearEndIso);

    if (frequency) {
      supaQuery = supaQuery.eq("frequency", frequency);
    }

    supaQuery = supaQuery.order("period_start", { ascending: false });

    const { data, error } = await supaQuery;

    if (error) {
      return NextResponse.json(
        { ok: false, error, debugSource: "payroll_runs_list_debug_v1" },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];

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
      attached_all_due_employees: row.attached_all_due_employees,
      totals: {
        gross: row.total_gross_pay,
        tax: row.total_tax,
        ni: row.total_ni,
        net: row.total_net_pay,
      },
    }));

    return NextResponse.json({
      ok: true,
      debugSource: "payroll_runs_list_debug_v1",
      query,
      taxYear: {
        start: taxYearStartIso,
        end: taxYearEndIso,
      },
      activeCompanyId: companyId,
      summary: {
        totalRows: rows.length,
        distinctCompanyIds: Array.from(
          new Set(rows.map((r: any) => r?.company_id).filter(Boolean))
        ),
        distinctFrequencies: Array.from(
          new Set(rows.map((r: any) => r?.frequency).filter(Boolean))
        ),
      },
      runs,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unexpected error",
        debugSource: "payroll_runs_list_debug_v1",
      },
      { status: 500 }
    );
  }
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

    const jar = cookies();
    const cookieToken = jar.get("wf_payroll_run_wizard")?.value ?? null;

    const body = await req.json().catch(() => null);
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
    const frequency =
      typeof body?.frequency === "string" ? body.frequency.trim() : "";

    const period_start =
      typeof body?.period_start === "string" ? body.period_start.trim() : "";
    const period_end =
      typeof body?.period_end === "string" ? body.period_end.trim() : "";

    // Accept either pay_date (preferred) or payment_date (legacy UI naming)
    const pay_date_raw_1 =
      typeof body?.pay_date === "string" ? body.pay_date.trim() : "";
    const pay_date_raw_2 =
      typeof body?.payment_date === "string" ? body.payment_date.trim() : "";
    const pay_date_raw = pay_date_raw_1 || pay_date_raw_2;
    const pay_date = pay_date_raw ? pay_date_raw : null;

    const run_name_raw =
      typeof body?.run_name === "string" ? body.run_name.trim() : "";
    const run_name =
      run_name_raw || defaultRunName(frequency, period_start, period_end);

    if (!allowedFrequencies.includes(frequency)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid frequency. Expected weekly, fortnightly, four_weekly, monthly.",
          code: "BAD_FREQUENCY",
        },
        { status: 400 }
      );
    }

    if (!isIsoDateOnly(period_start) || !isIsoDateOnly(period_end)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid period dates. Expected YYYY-MM-DD for period_start and period_end.",
          code: "BAD_DATES",
        },
        { status: 400 }
      );
    }

    if (pay_date && !isIsoDateOnly(pay_date)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid pay_date. Expected YYYY-MM-DD.",
          code: "BAD_PAY_DATE",
        },
        { status: 400 }
      );
    }

    if (!run_name || !String(run_name).trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing run_name after defaults.",
          code: "BAD_RUN_NAME",
        },
        { status: 400 }
      );
    }

    const insertRow: any = {
      company_id: companyId,
      run_name: run_name,
      frequency,
      period_start,
      period_end,

      // DB constraint expects these, so map them to the same period by default.
      pay_period_start: period_start,
      pay_period_end: period_end,

      status: "draft",
      pay_date: pay_date,
      pay_date_overridden: false,
      attached_all_due_employees: false,
    };

    const { data, error } = await client
      .from("payroll_runs")
      .insert(insertRow)
      .select(
        "id, run_number, run_name, company_id, frequency, period_start, period_end, status"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error, debugSource: "payroll_runs_create_debug_v1" },
        { status: 500 }
      );
    }

    const res = NextResponse.json(
      {
        ok: true,

        // New stable fields (use these everywhere going forward)
        id: data?.id ?? null,
        run_id: data?.id ?? null,

        // Backwards compatible payload
        run: data,

        debugSource: "payroll_runs_create_debug_v1",
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
      {
        ok: false,
        error: err?.message ?? "Unexpected error",
        debugSource: "payroll_runs_create_debug_v1",
      },
      { status: 500 }
    );
  }
}
