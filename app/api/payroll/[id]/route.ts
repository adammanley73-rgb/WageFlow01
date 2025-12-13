/* @ts-nocheck */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Ctx = { params: { id: string } };

function getAdminClient() {
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
throw new Error("Supabase admin environment variables are missing");
}

return createClient(url, serviceRoleKey);
}

export async function GET(_req: Request, { params }: Ctx) {
try {
const id = params?.id;

if (!id) {
  return NextResponse.json(
    { ok: false, error: "Missing payroll run id" },
    { status: 400 }
  );
}

const supabase = getAdminClient();

const { data: row, error } = await supabase
  .from("payroll_runs")
  .select(
    "id, company_id, run_number, frequency, period_start, period_end, attached_all_due_employees, total_gross_pay, total_tax, total_ni, total_net_pay"
  )
  .eq("id", id)
  .single();

if (error && error.code !== "PGRST116") {
  return NextResponse.json(
    {
      ok: false,
      debugSource: "payroll_run_route_admin",
      supabaseError: error
    },
    { status: 500 }
  );
}

const run =
  row ??
  {
    id,
    run_number: "PREVIEW",
    frequency: "monthly",
    period_start: null,
    period_end: null,
    attached_all_due_employees: false
  };

const totals =
  row != null
    ? {
        gross: Number(row.total_gross_pay ?? 0),
        tax: Number(row.total_tax ?? 0),
        ni: Number(row.total_ni ?? 0),
        net: Number(row.total_net_pay ?? 0)
      }
    : {
        gross: 0,
        tax: 0,
        ni: 0,
        net: 0
      };

return NextResponse.json({
  ok: true,
  debugSource: "payroll_run_route_admin",
  run,
  employees: [],
  totals
});


} catch (err: any) {
return NextResponse.json(
{
ok: false,
debugSource: "payroll_run_route_admin",
error: err?.message ?? "Unexpected error"
},
{ status: 500 }
);
}
}