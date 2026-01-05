// C:\Users\adamm\Projects\wageflow01\app\api\employees\[id]\route.ts
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

function canonNi(v: any): string | null {
  const s = strOrNull(v);
  if (!s) return null;
  return s.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
}

function isValidNi(ni: string) {
  return /^[A-Z]{2}\d{6}[A-Z]$/.test(ni);
}

function isAllowedPayFrequency(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return true; // allow null/empty
  return ["weekly", "fortnightly", "four_weekly", "monthly"].includes(s);
}

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "")
  );
}

async function loadEmployee(companyId: string, routeId: string) {
  const supabase = createClient();

  const selectCols = [
    "employee_id",
    "id",
    "company_id",
    "employee_number",
    "first_name",
    "last_name",
    "email",
    "phone",
    "job_title",
    "start_date",
    "hire_date",
    "date_of_birth",
    "employment_type",
    "pay_frequency",
    "ni_number",
    "national_insurance_number",
    "annual_salary",
    "hourly_rate",
    "hours_per_week",
    "address",
    "status",
    "leaving_date",
    "updated_at",
    "created_at",
  ].join(",");

  // Primary: employee_id
  let r = await supabase
    .from("employees")
    .select(selectCols)
    .eq("company_id", companyId)
    .eq("employee_id", routeId)
    .maybeSingle();

  if (!r.data && isUuid(routeId)) {
    r = await supabase
      .from("employees")
      .select(selectCols)
      .eq("company_id", companyId)
      .eq("id", routeId)
      .maybeSingle();
  }

  return r;
}

// GET /api/employees/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "No active company selected" }, { status: 400 });
    }

    const routeId = String(params?.id || "").trim();
    if (!routeId) {
      return NextResponse.json({ ok: false, error: "Missing employee id" }, { status: 400 });
    }

    const { data, error } = await loadEmployee(companyId, routeId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, employee: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load employee" },
      { status: 500 }
    );
  }
}

// PATCH /api/employees/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "No active company selected" }, { status: 400 });
    }

    const routeId = String(params?.id || "").trim();
    if (!routeId) {
      return NextResponse.json({ ok: false, error: "Missing employee id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));

    const ni = canonNi(body?.ni_number ?? body?.national_insurance_number);
    if (ni && !isValidNi(ni)) {
      return NextResponse.json(
        { ok: false, error: "NI number must be 2 letters, 6 numbers, then 1 letter. Example: AB123456C." },
        { status: 400 }
      );
    }

    const pay_frequency = strOrNull(body?.pay_frequency);
    if (!isAllowedPayFrequency(pay_frequency)) {
      return NextResponse.json(
        { ok: false, error: "pay_frequency must be weekly, fortnightly, four_weekly, or monthly" },
        { status: 400 }
      );
    }

    const patch: Record<string, any> = {
      employee_number: strOrNull(body?.employee_number),
      first_name: strOrNull(body?.first_name),
      last_name: strOrNull(body?.last_name),
      email: strOrNull(body?.email),
      phone: strOrNull(body?.phone),
      job_title: strOrNull(body?.job_title),

      start_date: strOrNull(body?.start_date),
      hire_date: strOrNull(body?.hire_date),
      date_of_birth: strOrNull(body?.date_of_birth),

      employment_type: strOrNull(body?.employment_type),
      pay_frequency: pay_frequency,

      annual_salary: numOrNull(body?.annual_salary),
      hourly_rate: numOrNull(body?.hourly_rate),
      hours_per_week: numOrNull(body?.hours_per_week),

      address: body?.address ?? null,

      status: strOrNull(body?.status),
      leaving_date: strOrNull(body?.leaving_date),

      ni_number: ni,
      national_insurance_number: ni,
    };

    // Remove undefined only (keep nulls if caller intended)
    Object.keys(patch).forEach((k) => {
      if (patch[k] === undefined) delete patch[k];
    });

    const supabase = createClient();

    // Update by employee_id first (your routes use employee_id)
    let r = await supabase
      .from("employees")
      .update(patch)
      .eq("company_id", companyId)
      .eq("employee_id", routeId)
      .select("employee_id,id")
      .maybeSingle();

    // Fallback by uuid id if needed
    if (!r.data && isUuid(routeId)) {
      r = await supabase
        .from("employees")
        .update(patch)
        .eq("company_id", companyId)
        .eq("id", routeId)
        .select("employee_id,id")
        .maybeSingle();
    }

    if (r.error) {
      return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
    }

    if (!r.data) {
      return NextResponse.json({ ok: false, error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, employee_id: r.data.employee_id, id: r.data.employee_id, uuid: r.data.id },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to update employee" },
      { status: 500 }
    );
  }
}
