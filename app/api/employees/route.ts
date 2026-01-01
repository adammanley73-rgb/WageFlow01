/* C:\Users\adamm\Projects\wageflow01\app\api\employees\route.ts
   Real API route (replaces CI stub).
   - Reads active company from cookies
   - GET lists employees for the active company
   - POST inserts an employee and returns { id }
*/

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getActiveCompanyId(): string {
  const jar = cookies();
  return (
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    ""
  ).trim();
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function canonNi(v: any): string | null {
  const s = strOrNull(v);
  if (!s) return null;
  return s.toUpperCase().replace(/\s+/g, "");
}

// GET /api/employees
export async function GET() {
  try {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { ok: true, employees: [], warning: "No active company selected" },
        { status: 200 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, employee_id, name, email, job_title, start_date, employment_type, annual_salary, hourly_rate, hours_per_week, ni_number, pay_frequency, created_at"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, employees: data ?? [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST /api/employees
export async function POST(req: Request) {
  try {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "No active company selected" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({} as any));

    const name = strOrNull(body?.name);
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Accept either salary or annual_salary from callers
    const annual_salary = numOrNull(
      body?.annual_salary !== undefined ? body.annual_salary : body?.salary
    );

    const insertRow: Record<string, any> = {
      company_id: companyId,
      name,
      email: strOrNull(body?.email),
      job_title: strOrNull(body?.job_title),
      start_date: strOrNull(body?.start_date),
      employment_type: strOrNull(body?.employment_type),
      annual_salary,
      hourly_rate: numOrNull(body?.hourly_rate),
      hours_per_week: numOrNull(body?.hours_per_week),
      ni_number: canonNi(body?.ni_number),
      pay_frequency: strOrNull(body?.pay_frequency),
    };

    // Remove undefined keys (Supabase dislikes them)
    Object.keys(insertRow).forEach((k) => {
      if (insertRow[k] === undefined) delete insertRow[k];
    });

    const supabase = createClient();

    const { data, error } = await supabase
      .from("employees")
      .insert(insertRow)
      .select("id, employee_id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const id = (data as any)?.id ?? (data as any)?.employee_id ?? null;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Employee created but no id returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}
