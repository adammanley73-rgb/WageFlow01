/* C:\Projects\wageflow01\app\api\employees\route.ts
   Supabase-backed Employees API.
   Multi-tenant safe: uses session + RLS, validates company membership, avoids service role.
*/

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

async function getActiveCompanyId(): Promise<string | null> {
  const jar = await cookies();
  const raw =
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    null;

  if (!raw) return null;

  const trimmed = String(raw).trim();
  return isUuid(trimmed) ? trimmed : null;
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
  return s.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
}

function isValidNi(ni: string) {
  return /^[A-Z]{2}\d{6}[A-Z]$/.test(ni);
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

function isAllowedPayFrequency(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return true; // allow null/empty
  return ["weekly", "fortnightly", "four_weekly", "monthly"].includes(s);
}

function isStaffRole(role: string) {
  return ["owner", "admin", "manager", "processor"].includes(
    String(role || "").toLowerCase()
  );
}

async function requireUserAndMembership(companyId: string) {
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return {
      ok: false as const,
      res: json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." }),
    };
  }

  const { data: membership, error: memErr } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    return {
      ok: false as const,
      res: json(500, { ok: false, code: "MEMBERSHIP_CHECK_FAILED", message: "Could not validate company membership." }),
    };
  }

  if (!membership) {
    return {
      ok: false as const,
      res: json(403, { ok: false, code: "FORBIDDEN", message: "You do not have access to the active company." }),
    };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    role: String((membership as any).role || "member"),
  };
}

// GET /api/employees
export async function GET() {
  try {
    const companyId = await getActiveCompanyId();

    if (!companyId) {
      return json(200, { ok: true, employees: [], warning: "No active company selected" });
    }

    const gate = await requireUserAndMembership(companyId);
    if (!gate.ok) return gate.res;

    const { data, error } = await gate.supabase
      .from("employees")
      .select(
        [
          "employee_id",
          "id",
          "company_id",
          "employee_number",
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
          "status",
          "created_at",
        ].join(",")
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return json(500, { ok: false, code: "DB_ERROR", error: error.message });
    }

    return json(200, { ok: true, employees: data ?? [] });
  } catch (err: any) {
    return json(500, { ok: false, code: "UNHANDLED", error: err?.message ?? "Failed to fetch employees" });
  }
}

// POST /api/employees
export async function POST(req: Request) {
  try {
    const companyId = await getActiveCompanyId();

    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", error: "No active company selected" });
    }

    const gate = await requireUserAndMembership(companyId);
    if (!gate.ok) return gate.res;

    if (!isStaffRole(gate.role)) {
      return json(403, { ok: false, code: "INSUFFICIENT_ROLE", error: "You do not have permission to create employees." });
    }

    const body = await req.json().catch(() => ({} as any));

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
      return json(400, { ok: false, code: "MISSING_NAME", error: "first_name and last_name are required" });
    }

    const email = strOrNull(body?.email);
    if (!email) {
      return json(400, { ok: false, code: "MISSING_EMAIL", error: "email is required" });
    }

    const start_date = strOrNull(body?.start_date);
    if (!start_date) {
      return json(400, { ok: false, code: "MISSING_START_DATE", error: "start_date is required" });
    }

    const hire_date = strOrNull(body?.hire_date) ?? start_date ?? todayISO();

    const pay_frequency = strOrNull(body?.pay_frequency);
    if (!isAllowedPayFrequency(pay_frequency)) {
      return json(400, {
        ok: false,
        code: "BAD_PAY_FREQUENCY",
        error: "pay_frequency must be weekly, fortnightly, four_weekly, or monthly",
      });
    }

    const ni = canonNi(body?.ni_number ?? body?.national_insurance_number);
    if (ni && !isValidNi(ni)) {
      return json(400, {
        ok: false,
        code: "BAD_NI",
        error: "NI number must be 2 letters, 6 numbers, then 1 letter. Example: AB123456C.",
      });
    }

    const annual_salary = numOrNull(body?.annual_salary !== undefined ? body.annual_salary : body?.salary);

    const employee_id = strOrNull(body?.employee_id) ?? randomUUID();

    const insertRow: Record<string, any> = {
      company_id: companyId,
      employee_id,

      employee_number: strOrNull(body?.employee_number),

      first_name,
      last_name,

      email,
      phone: strOrNull(body?.phone),
      job_title: strOrNull(body?.job_title),

      hire_date,
      start_date,

      date_of_birth: strOrNull(body?.date_of_birth),

      employment_type: strOrNull(body?.employment_type) ?? "full_time",

      annual_salary,
      hourly_rate: numOrNull(body?.hourly_rate),
      hours_per_week: numOrNull(body?.hours_per_week),

      ni_number: ni,
      national_insurance_number: ni,

      pay_frequency,

      address: body?.address ?? null,

      has_pgl: false,
      is_director: false,
      pay_after_leaving: false,
      is_apprentice: !!body?.is_apprentice,

      ytd_gross: 0,
      ytd_tax: 0,
      ytd_ni_emp: 0,
      ytd_ni_er: 0,
      ytd_pension_emp: 0,
      ytd_pension_er: 0,
    };

    Object.keys(insertRow).forEach((k) => {
      if (insertRow[k] === undefined) delete insertRow[k];
    });

    const { data, error } = await gate.supabase
      .from("employees")
      .insert(insertRow)
      .select("employee_id, id")
      .single();

    if (error) {
      return json(500, { ok: false, code: "INSERT_FAILED", error: error.message });
    }

    const eid = (data as any)?.employee_id ?? null;
    const uuid = (data as any)?.id ?? null;

    if (!eid) {
      return json(500, { ok: false, code: "MISSING_EMPLOYEE_ID", error: "Employee created but no employee_id returned" });
    }

    return json(201, { ok: true, id: eid, employee_id: eid, uuid, employee: { employee_id: eid, id: uuid } });
  } catch (err: any) {
    return json(500, { ok: false, code: "UNHANDLED", error: err?.message ?? "Unexpected server error" });
  }
}