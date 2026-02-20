/* C:\Users\adamm\Projects\wageflow01\app\api\employees\next-number\route.ts
   Returns the next employee_number for the active company.
   Important: This is a server route. No JSX in here. Ever.
*/

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getActiveCompanyId(): Promise<string> {
  const jar = await cookies();
  return (
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    ""
  ).trim();
}

function pad(num: number, width: number) {
  const s = String(num);
  if (s.length >= width) return s;
  return "0".repeat(width - s.length) + s;
}

function computeNext(existing: string[]) {
  let bestPrefix = "";
  let bestWidth = 4;
  let bestNum = 0;

  for (const raw of existing) {
    const v = String(raw || "").trim();
    if (!v) continue;

    const m = v.match(/^(.*?)(\d+)\s*$/);
    if (!m) continue;

    const prefix = (m[1] ?? "").trim();
    const digits = m[2] ?? "";
    const n = Number(digits);

    if (!Number.isFinite(n)) continue;

    if (n > bestNum) {
      bestNum = n;
      bestPrefix = prefix;
      bestWidth = Math.max(4, digits.length);
    }
  }

  const next = bestNum + 1;

  if (bestPrefix) return `${bestPrefix}${pad(next, bestWidth)}`;
  return pad(next, bestWidth);
}

export async function GET() {
  try {
    const companyId = getActiveCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "No active company selected." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    type Row = { employee_number: string | null };

    const { data, error } = await supabase
      .from("employees")
      .select("employee_number")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const existing = (data as Row[] | null)
      ?.map((r) => (r?.employee_number ? String(r.employee_number).trim() : ""))
      .filter(Boolean) as string[];

    const next_employee_number = computeNext(existing);

    return NextResponse.json(
      { ok: true, next_employee_number },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to generate employee number." },
      { status: 500 }
    );
  }
}
