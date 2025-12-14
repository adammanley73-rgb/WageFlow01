/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\payroll\runs\route.ts

import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";

type RunsQuery = {
frequency?: string | null;
taxYearStart?: string | null;
};

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

const allowedFrequencies = [
  "weekly",
  "fortnightly",
  "four_weekly",
  "monthly",
];

const frequency = query.frequency ?? null;

// If a frequency is supplied, validate it
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
const { taxYearStartIso, taxYearEndIso } = taxYearBounds;

let supaQuery = client
  .from("payroll_runs")
  .select(
    [
      "id",
      "company_id",
      "run_number",
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

// Only filter by frequency if one was provided
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