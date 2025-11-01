// app/_server/employees.ts
// Server-only employees data service. Lives under /app.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  EmployeeRow,
  EmployeeListItem,
  EmployeePickerOption,
} from "@/lib/data/employees.types";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(_name: string, _value: string, _options: CookieOptions) {},
        remove(_name: string, _options: CookieOptions) {},
      },
    }
  );
}

function getActiveCompanyFromCookies() {
  const jar = cookies();
  const id =
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    "";
  const name =
    jar.get("active_company_name")?.value ??
    jar.get("company_name")?.value ??
    null;
  return { id, name };
}

export async function listEmployeesSSR(limit = 500): Promise<EmployeeListItem[]> {
  const { id: companyId } = getActiveCompanyFromCookies();
  if (!companyId) return [];

  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("employees")
    .select(
      [
        "id",
        "employee_code",
        "first_name",
        "last_name",
        "email",
        "ni_number",
        "job_title",
        "hourly_rate",
        "annual_salary",
        "created_at",
        "company_id",
      ].join(",")
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data || !Array.isArray(data)) return [];

  // Supabase types aren’t guaranteed. Coerce through unknown to satisfy TS.
  const rows = (data ?? []) as unknown as EmployeeRow[];

  return rows.map((r) => ({
    id: r.id,
    name: [r.first_name ?? "", r.last_name ?? ""].join(" ").trim() || "(No name)",
    email: r.email ?? null,
    ni_number: r.ni_number ?? null,
    job_title: r.job_title ?? null,
    hourly_rate: r.hourly_rate ?? null,
    annual_salary: r.annual_salary ?? null,
  }));
}

export async function listEmployeePickerOptions(limit = 500): Promise<EmployeePickerOption[]> {
  const rows = await listEmployeesSSR(limit);
  return rows.map((r) => ({
    value: r.id,
    label: r.name,
    subtitle: r.email ?? undefined,
  }));
}

export async function getEmployeeById(id: string): Promise<EmployeeRow | null> {
  if (!id) return null;

  const { id: companyId } = getActiveCompanyFromCookies();
  if (!companyId) return null;

  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("employees")
    .select(
      [
        "id",
        "employee_code",
        "first_name",
        "last_name",
        "email",
        "ni_number",
        "job_title",
        "hourly_rate",
        "annual_salary",
        "pay_frequency",
        "created_at",
        "company_id",
      ].join(",")
    )
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as EmployeeRow;
}
