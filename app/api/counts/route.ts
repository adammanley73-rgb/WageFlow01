/* @ts-nocheck /
/ C:\Users\adamm\Projects\wageflow01\app\api\counts\route.ts */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

type Counts = {
employeeCount: number;
payrollRunCount: number;
absenceRecordCount: number;
};

function adminClient() {
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
throw new Error("counts api: missing Supabase env");
}

return createClient(url, key, {
auth: { persistSession: false },
});
}

function getActiveCompanyId(): string | null {
const jar = cookies();
return (
jar.get("active_company_id")?.value ??
jar.get("company_id")?.value ??
null
);
}

async function safeCountByCompany(
tableName: string,
companyId: string
): Promise<number | null> {
try {
const supabase = adminClient();

const { count, error } = await supabase
  .from(tableName)
  .select("id", { count: "exact", head: true })
  .eq("company_id", companyId);

if (error) return null;
if (typeof count !== "number") return 0;
return count;


} catch {
return null;
}
}

async function countWithFallback(
tables: string[],
companyId: string
): Promise<number> {
for (const t of tables) {
const c = await safeCountByCompany(t, companyId);
if (c !== null) return c;
}
return 0;
}

export async function GET() {
try {
const activeCompanyId = getActiveCompanyId();

if (!activeCompanyId) {
  return NextResponse.json(
    {
      ok: true,
      activeCompanyId: null,
      counts: {
        employeeCount: 0,
        payrollRunCount: 0,
        absenceRecordCount: 0,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

const [employeeCount, payrollRunCount, absenceRecordCount] =
  await Promise.all([
    countWithFallback(["employees"], activeCompanyId),
    countWithFallback(
      ["payroll_runs", "pay_runs", "payroll_run"],
      activeCompanyId
    ),
    countWithFallback(["absences", "absence_records"], activeCompanyId),
  ]);

const counts: Counts = {
  employeeCount,
  payrollRunCount,
  absenceRecordCount,
};

return NextResponse.json(
  { ok: true, activeCompanyId, counts },
  { headers: { "Cache-Control": "no-store" } }
);


} catch (err: any) {
return NextResponse.json(
{
ok: false,
error: "counts api failed",
detail: err?.message ?? String(err),
counts: {
employeeCount: 0,
payrollRunCount: 0,
absenceRecordCount: 0,
},
},
{ status: 500, headers: { "Cache-Control": "no-store" } }
);
}
}