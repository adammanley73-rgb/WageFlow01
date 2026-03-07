/* C:\Projects\wageflow01\app\api\employees\next-number\route.ts
   Returns the next employee_number for the active company.
   Important: This is a server route. No JSX in here. Ever.
*/

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isUuid(v: any): boolean {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

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
    const companyId = await getActiveCompanyId();

    if (!companyId) {
      return json(400, { ok: false, error: "No active company selected." });
    }

    if (!isUuid(companyId)) {
      return json(400, { ok: false, error: "Active company id is not a valid UUID." });
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
      return json(500, { ok: false, error: error.message });
    }

    const existing = (data as Row[] | null)
      ?.map((r) => (r?.employee_number ? String(r.employee_number).trim() : ""))
      .filter(Boolean) as string[];

    const next_employee_number = computeNext(existing);

    return json(200, { ok: true, next_employee_number });
  } catch (err: any) {
    return json(500, {
      ok: false,
      error: err?.message ?? "Failed to generate employee number.",
    });
  }
}