/* C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\page.tsx */

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MISSING = "\u2014";

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function createAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("employee details: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "")
  );
}

function safeStr(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : MISSING;
}

function fmtDate(d: any) {
  const s = String(d || "").trim();
  if (!s) return MISSING;
  const dt = new Date(s);
  if (!Number.isFinite(dt.getTime())) return s;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dt);
}

function fmtMoney(n: any) {
  const num = Number(n);
  if (!Number.isFinite(num)) return MISSING;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(num);
}

function calcAge(dobISO: any) {
  const s = String(dobISO || "").trim();
  if (!s) return null;
  const dob = new Date(s);
  if (!Number.isFinite(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function aeStatus(dobISO: any, annualSalary: any) {
  const age = calcAge(dobISO);
  const sal = Number(annualSalary);

  if (age === null || !Number.isFinite(sal)) {
    return {
      label: "Auto-enrolment: unknown",
      sub: "Needs date of birth and annual salary",
      className: "border-neutral-300 bg-neutral-100 text-neutral-800",
    };
  }

  if (age >= 22 && age < 75 && sal >= 10000) {
    return {
      label: "Eligible for auto-enrolment",
      sub: `Age ${age}, salary ${fmtMoney(sal)}`,
      className: "border-emerald-300 bg-emerald-100 text-emerald-800",
    };
  }

  if (age >= 16 && age < 75 && sal >= 6240) {
    return {
      label: "Entitled to opt-in",
      sub: `Age ${age}, salary ${fmtMoney(sal)}`,
      className: "border-amber-300 bg-amber-100 text-amber-900",
    };
  }

  return {
    label: "Not eligible",
    sub: `Age ${age}, salary ${fmtMoney(sal)}`,
    className: "border-neutral-300 bg-neutral-100 text-neutral-800",
  };
}

type EmployeeRow = {
  id?: string | null; // uuid in most environments
  employee_id?: string | null; // legacy text key in some environments
  company_id?: string | null;

  employee_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;

  ni_number?: string | null;
  pay_frequency?: string | null;

  status?: string | null;
  leaving_date?: string | null;

  job_title?: string | null;
  employment_type?: string | null;

  start_date?: string | null;
  date_of_birth?: string | null;

  annual_salary?: any | null;
  hourly_rate?: any | null;
  hours_per_week?: any | null;

  address?: any | null;

  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeAddress(address: any) {
  const a = address || {};
  const line1 = a.line1 ?? a.address_line1 ?? a.line_1 ?? null;
  const line2 = a.line2 ?? a.address_line2 ?? a.line_2 ?? null;
  const townCity = a.town_city ?? a.city ?? a.town ?? a.locality ?? null;
  const county = a.county ?? a.region ?? null;
  const postcode = a.postcode ?? a.post_code ?? a.zip ?? null;
  const country = a.country ?? null;

  const parts = [line1, line2, townCity, county, postcode, country]
    .map((x) => String(x ?? "").trim())
    .filter((x) => x);

  return {
    line1: line1 ? String(line1).trim() : null,
    line2: line2 ? String(line2).trim() : null,
    townCity: townCity ? String(townCity).trim() : null,
    county: county ? String(county).trim() : null,
    postcode: postcode ? String(postcode).trim() : null,
    country: country ? String(country).trim() : null,
    singleLine: parts.length ? parts.join(", ") : null,
  };
}

function pillClass(base: string) {
  return `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${base}`;
}

function cardBox(title: string, children: any) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{title}</div>
      <div className="mt-1 text-sm text-neutral-900">{children}</div>
    </div>
  );
}

function looksLikeMissingColumn(err: any, column: string) {
  const msg = String(err?.message || err || "");
  return msg.toLowerCase().includes(`column`) && msg.toLowerCase().includes(column.toLowerCase());
}

export default async function EmployeeDetailsPage({ params }: { params: { id: string } }) {
  const jar = cookies();

  const activeCompanyId =
    jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;

  if (!activeCompanyId || !isUuid(String(activeCompanyId))) {
    redirect("/dashboard/companies");
  }

  const routeId = String(params?.id || "").trim();
  if (!routeId) redirect("/dashboard/employees");

  const supabase = createAdminClient();

  // Use select("*") so demo schemas with missing optional columns do not explode.
  const selectCols = "*";

  async function fetchBy(col: "id" | "employee_id" | "employee_number", value: string) {
    const res = await supabase
      .from("employees")
      .select(selectCols)
      .eq("company_id", activeCompanyId)
      .eq(col, value)
      .maybeSingle<EmployeeRow>();

    return res;
  }

  let employee: EmployeeRow | null = null;
  let error: any = null;

  // 1) Prefer id lookup when the route looks like a uuid.
  if (isUuid(routeId)) {
    const r1 = await fetchBy("id", routeId);
    employee = (r1.data as any) ?? null;
    error = r1.error ?? null;

    // If id lookup didn’t find anything, try employee_id but only if that column exists.
    if (!employee) {
      const r2 = await fetchBy("employee_id", routeId);
      if (!r2.error || !looksLikeMissingColumn(r2.error, "employee_id")) {
        employee = (r2.data as any) ?? null;
        error = r2.error ?? null;
      }
    }
  } else {
    // 2) Non-uuid route. Try employee_id first, but ignore the "missing column" error on demo schema.
    const r1 = await fetchBy("employee_id", routeId);
    if (!r1.error || !looksLikeMissingColumn(r1.error, "employee_id")) {
      employee = (r1.data as any) ?? null;
      error = r1.error ?? null;
    }

    // 3) Last resort: try employee_number if someone routed by Emp No.
    if (!employee) {
      const r2 = await fetchBy("employee_number", routeId);
      employee = (r2.data as any) ?? null;
      error = r2.error ?? null;
    }
  }

  if (!employee) {
    return (
      <PageTemplate title="Employee" currentSection="employees">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
            <div className="px-6 py-10 text-center bg-white">
              <div className="text-2xl font-semibold text-neutral-900">Employee Not Found</div>
              <div className="mt-2 text-sm text-neutral-700">
                The employee with ID "{routeId}" could not be found for the active company.
              </div>
              {error ? (
                <div className="mt-3 text-xs text-red-700">{String(error?.message || "Lookup error")}</div>
              ) : null}
              <div className="mt-6">
                <Link
                  href="/dashboard/employees"
                  className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
                >
                  Back to Employees
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const fullName =
    `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() || "Unnamed employee";

  const preferredId = String(employee.id || "").trim();
  const legacyId = String(employee.employee_id || "").trim();
  const empKey = preferredId || legacyId || routeId;

  const status = String(employee.status ?? "active").toLowerCase();
  const isLeaver = status === "leaver";

  const statusPill = isLeaver
    ? pillClass("border-red-300 bg-red-100 text-red-800")
    : pillClass("border-emerald-300 bg-emerald-100 text-emerald-800");

  const ae = aeStatus(employee.date_of_birth, employee.annual_salary);
  const addr = normalizeAddress(employee.address);

  return (
    <PageTemplate title="Employee" currentSection="employees">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        <div className="rounded-2xl bg-white/80 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-lg sm:text-xl text-[#0f3c85] truncate">
                <span className="font-bold">{fullName}</span>
                {employee.employee_number ? (
                  <span className="text-neutral-700">
                    {" "}
                    {"\u00b7"} Emp {employee.employee_number}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
                <span className={statusPill}>{isLeaver ? "Leaver" : "Active"}</span>
                <span className={pillClass(ae.className)}>{ae.label}</span>
                <span className="text-xs text-neutral-600">{ae.sub}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/employees"
                className="inline-flex items-center justify-center rounded-full border border-neutral-400 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400"
              >
                Back
              </Link>

              <Link
                href={`/dashboard/employees/${empKey}/edit`}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
              >
                Edit employee
              </Link>

              <Link
                href={`/dashboard/employees/${empKey}/wizard/starter`}
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
              >
                Wizard
              </Link>

              <Link
                href={`/dashboard/employees/${empKey}/payroll`}
                className="inline-flex items-center justify-center rounded-full bg-neutral-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-700"
              >
                Payroll history
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Basic information</div>
            <div className="text-xs text-neutral-700">Core identity fields and HMRC basics.</div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {cardBox("Employee number", safeStr(employee.employee_number))}
              {cardBox("Email", safeStr(employee.email))}
              {cardBox("NI number", safeStr(employee.ni_number))}
              {cardBox("Date of birth", fmtDate(employee.date_of_birth))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Employment</div>
            <div className="text-xs text-neutral-700">Role, dates, and pay frequency.</div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {cardBox("Job title", safeStr(employee.job_title))}
              {cardBox("Employment type", safeStr(employee.employment_type))}
              {cardBox("Start date", fmtDate(employee.start_date))}
              {cardBox("Pay frequency", safeStr(employee.pay_frequency))}
              {cardBox("Leaving date", fmtDate(employee.leaving_date))}
              {cardBox("Status", isLeaver ? "Leaver" : "Active")}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Pay</div>
            <div className="text-xs text-neutral-700">Salary, hourly, and hours per week.</div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {cardBox("Annual salary", fmtMoney(employee.annual_salary))}
              {cardBox("Hourly rate", fmtMoney(employee.hourly_rate))}
              {cardBox(
                "Hours per week",
                employee.hours_per_week !== null && employee.hours_per_week !== undefined
                  ? String(employee.hours_per_week)
                  : MISSING
              )}
            </div>

            <div className="mt-4 rounded-lg border border-neutral-300 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Auto-enrolment</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={pillClass(ae.className)}>{ae.label}</span>
                <span className="text-sm text-neutral-800">{ae.sub}</span>
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                This is a simple indicator. Final AE decisions should be validated during payroll processing.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Address</div>
            <div className="text-xs text-neutral-700">Stored employee address (if provided).</div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {cardBox("Address", addr.singleLine || MISSING)}
              {cardBox("Postcode", addr.postcode || MISSING)}
              {cardBox("Town / city", addr.townCity || MISSING)}
              {cardBox("County", addr.county || MISSING)}
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
