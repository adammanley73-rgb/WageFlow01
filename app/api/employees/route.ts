/* C:\Users\adamm\Projects\wageflow01\app\api\employees\route.ts
   Real API route (Supabase-backed).
   - Uses active company from cookies
   - GET lists employees for active company
   - POST inserts an employee and returns { id } where id = employee_id (text PK)
   Notes:
   - Your employees table does NOT have a "name" column. It has first_name and last_name.
   - employees.employee_id (text) is NOT NULL, so we generate one if missing.
   - employees.hire_date is NOT NULL, so we default it if missing.
*/

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function getActiveCompanyId(): string {
  const jar = cookies();
  return (
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    ""
  ).trim();
}

function strOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function canonNi(v: any): string | null {
  const s = strOrNull(v);
  if (!s) return null;
  return s.toUpperCase().replace(/\s+/g, "");
}

function splitName(full: string): { first_name: string; last_name: string } | null {
  const s = String(full || "").trim().replace(/\s+/g, " ");
  if (!s) return null;

  const parts = s.split(" ");
  if (parts.length < 2) return null;

  const first_name = parts[0].trim();
  const last_name = parts.slice(1).join(" ").trim();

  if (!first_name || !last_name) return null;
  return { first_name, last_name };
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
        [
          "employee_id",
          "id",
          "first_name",
          "last_name",
          "known_as",
          "email",
          "phone",
          "job_title",
          "hire_date",
          "start_date",
          "employment_type",
          "annual_salary",
          "hourly_rate",
          "hours_per_week",
          "ni_number",
          "national_insurance_number",
          "pay_frequency",
          "created_at",
          "updated_at",
        ].join(",")
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
      return NextResponse.json({ ok: false, error: "No active company selected" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));

    // Prefer explicit first/last, otherwise split "name" (caller convenience)
    const firstNameRaw = strOrNull(body?.first_name);
    const lastNameRaw = strOrNull(body?.last_name);

    let first_name = firstNameRaw ?? "";
    let last_name = lastNameRaw ?? "";

    if (!first_name || !last_name) {
      const nm = strOrNull(body?.name);
      const split = nm ? splitName(nm) : null;
      if (split) {
        first_name = split.first_name;
        last_name = split.last_name;
      }
    }

    if (!first_name || !last_name) {
      return NextResponse.json(
        { ok: false, error: "first_name and last_name are required" },
        { status: 400 }
      );
    }

    const hire_date =
      strOrNull(body?.hire_date) ??
      strOrNull(body?.start_date) ??
      todayISO();

    const annual_salary = numOrNull(
      body?.annual_salary !== undefined ? body.annual_salary : body?.salary
    );

    const ni = canonNi(body?.ni_number ?? body?.national_insurance_number);

    // employee_id (text) is NOT NULL in your schema
    const employee_id = strOrNull(body?.employee_id) ?? randomUUID();

    // Build insert row. Keep it aligned to your actual schema.
    const insertRow: Record<string, any> = {
      company_id: companyId,
      employee_id,

      first_name,
      last_name,

      email: strOrNull(body?.email),
      phone: strOrNull(body?.phone),
      job_title: strOrNull(body?.job_title),

      hire_date,
      start_date: strOrNull(body?.start_date),

      employment_type: strOrNull(body?.employment_type),
      annual_salary,
      hourly_rate: numOrNull(body?.hourly_rate),
      hours_per_week: numOrNull(body?.hours_per_week),

      // Your table has both. Keep them in sync.
      ni_number: ni,
      national_insurance_number: ni,

      pay_frequency: strOrNull(body?.pay_frequency),

      // Safe defaults for NOT NULL columns (even if DB has defaults, this avoids surprises)
      has_pgl: false,
      is_director: false,
      pay_after_leaving: false,
      is_apprentice: false,

      ytd_gross: 0,
      ytd_tax: 0,
      ytd_ni_emp: 0,
      ytd_ni_er: 0,
      ytd_pension_emp: 0,
      ytd_pension_er: 0,
    };

    // Remove undefined keys (Supabase dislikes them)
    Object.keys(insertRow).forEach((k) => {
      if (insertRow[k] === undefined) delete insertRow[k];
    });

    const supabase = createClient();

    const { data, error } = await supabase
      .from("employees")
      .insert(insertRow)
      .select("employee_id, id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const eid = (data as any)?.employee_id ?? null;
    const uuid = (data as any)?.id ?? null;

    if (!eid) {
      return NextResponse.json(
        { ok: false, error: "Employee created but no employee_id returned" },
        { status: 500 }
      );
    }

    // IMPORTANT: The UI expects json.id. We set it to employee_id so the wizard URL works.
    return NextResponse.json(
      { ok: true, id: eid, employee_id: eid, uuid },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}
