// lib/data/employees.ts
// Server-safe employees data service for WageFlow.
// Reads active_company_* cookies, uses a server Supabase client, and returns
// query results suitable for SSR rendering and simple pickers.
// No client hooks. No local stores. Compile-safe with loose types.

import "server-only";
import { cookies } from "next/headers";

/**
 * Minimal runtime guard for required envs on the server.
 * Vercel/Next provides NEXT_PUBLIC_* at build/runtime, but we read them here only
 * to construct a server client. Do NOT put secrets here.
 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// We avoid importing project-specific wrappers to keep this file drop-in safe.
// If your repo already exposes a server client at "@/lib/supabase/server",
// you can swap to that import to centralize cookie handling.
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function createSupabaseServer() {
  const cookieStore = cookies();

  // Next/Supabase SSR helper wires auth cookies automatically.
  // We only need the public URL and anon key for RLS-protected reads.
  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Next 14 server components cannot set cookies during render here; ignore.
          // API routes or actions should set cookies.
        },
        remove(name: string, options: CookieOptions) {
          // No-op in server components.
        },
      },
    }
  );

  return supabase;
}

/**
 * Active company selection from cookies set by /api/select-company.
 * We tolerate either active_company_* or company_* naming.
 */
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

export type EmployeeRow = {
  id: string;
  employee_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  ni_number?: string | null;
  job_title?: string | null;
  hourly_rate?: number | null;
  annual_salary?: number | null;
  pay_frequency?: string | null;
  created_at?: string | null;
};

export type EmployeeListItem = {
  id: string;
  name: string;
  email: string | null;
  ni_number: string | null;
  job_title: string | null;
  hourly_rate: number | null;
  annual_salary: number | null;
};

export type EmployeePickerOption = {
  value: string;
  label: string;
  subtitle?: string;
};

/**
 * List employees for the active company. Safe for SSR.
 * Returns a normalized shape suitable for a basic table or list.
 */
export async function listEmployeesSSR(limit = 500): Promise<EmployeeListItem[]> {
  const { id: companyId } = getActiveCompanyFromCookies();
  if (!companyId) {
    // Middleware should redirect before we get here, but fail-soft if not.
    return [];
  }

  const supabase = createSupabaseServer();

  // Select the columns we actually show. Keep types loose to avoid compile churn.
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

  if (error) {
    // Fail soft. Consumers can render an empty state.
    return [];
  }

  return (data as EmployeeRow[]).map((r) => ({
    id: r.id,
    name: [r.first_name ?? "", r.last_name ?? ""].join(" ").trim() || "(No name)",
    email: r.email ?? null,
    ni_number: r.ni_number ?? null,
    job_title: r.job_title ?? null,
    hourly_rate: r.hourly_rate ?? null,
    annual_salary: r.annual_salary ?? null,
  }));
}

/**
 * Lightweight picker options for selects, dialogs, or wizards.
 * Keeps payload small and renders without JS.
 */
export async function listEmployeePickerOptions(limit = 500): Promise<EmployeePickerOption[]> {
  const rows = await listEmployeesSSR(limit);
  return rows.map((r) => ({
    value: r.id,
    label: r.name,
    subtitle: r.email ?? undefined,
  }));
}

/**
 * Basic by-id fetch for server components and actions.
 */
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
  return data as EmployeeRow;
}
