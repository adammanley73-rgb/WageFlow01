/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\page.tsx

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import PageTemplate from "@/components/layout/PageTemplate";
import { formatUkDate } from "@/lib/formatUkDate";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("employee details: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

type EmployeeDetailsPageProps = {
  params: { id: string };
};

function formatDisplayDate(value: string | null, fallback: string = "Not set") {
  return formatUkDate(value, fallback);
}

function formatMoney(value: number | null | undefined) {
  if (value == null || !isFinite(value)) return "Not set";
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

function titleCase(value: string | null | undefined) {
  if (!value) return "Not set";
  const str = String(value).replace(/_/g, " ").toLowerCase();
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function calculateAge(dobIso: string | null | undefined): string {
  if (!dobIso) return "Not set";
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return "Not set";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  const dobDisplay = formatUkDate(dobIso, "Not set");
  return `${dobDisplay} (Age: ${age})`;
}

function formatSortCodeDisplay(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "").slice(0, 6);
  if (digits.length !== 6) return digits || null;
  return digits.replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3");
}

function maskAccountNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 4) return digits || null;
  return digits.slice(-4);
}

export default async function EmployeeDetailsPage({
  params,
}: EmployeeDetailsPageProps) {
  const routeId = params.id;

  const jar = cookies();
  const activeCompanyId =
    jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;

  if (!activeCompanyId) {
    redirect("/dashboard/companies");
  }

  const supabase = createAdminClient();

  const companyPromise = supabase
    .from("companies")
    .select("id, name")
    .eq("id", activeCompanyId)
    .maybeSingle();

  const employeePromise = supabase
    .from("employees")
    .select(
      `
      id,
      employee_id,
      employee_number,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      ni_number,
      job_title,
      department,
      employment_type,
      status,
      hire_date,
      pay_frequency,
      annual_salary,
      leaving_date,
      final_pay_date,
      leaver_reason,
      pay_after_leaving,
      created_at,
      updated_at
    `
    )
    .or(`id.eq.${routeId},employee_id.eq.${routeId}`)
    .eq("company_id", activeCompanyId)
    .maybeSingle();

  const [
    { data: company, error: companyError },
    { data: employee, error: employeeError },
  ] = await Promise.all([companyPromise, employeePromise]);

  const activeCompanyName =
    !companyError && company ? company.name ?? null : null;

  if (employeeError || !employee) {
    return (
      <PageTemplate title="Employee details" currentSection="employees">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="rounded-2xl bg-white/80 px-4 py-4">
            <p className="text-lg text-neutral-900 font-semibold">
              Employee not found
            </p>
            <p className="text-sm text-neutral-700 mt-1">
              The employee with ID{" "}
              <span className="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">
                {routeId}
              </span>{" "}
              could not be found for this company.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/employees"
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
              >
                â† Back to employees
              </Link>
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const canonicalEmployeeId =
    (employee as any)?.id ?? (employee as any)?.employee_id ?? routeId;

  let bankRow: {
    account_name: string | null;
    sort_code: string | null;
    account_number: string | null;
  } | null = null;

  try {
    const { data: bankData, error: bankError } = await supabase
      .from("employee_bank")
      .select("account_name, sort_code, account_number")
      .eq("employee_id", canonicalEmployeeId)
      .maybeSingle();

    if (!bankError && bankData) {
      bankRow = bankData;
    }
  } catch {
    bankRow = null;
  }

  const hasBankDetails =
    !!bankRow &&
    !!bankRow.account_name &&
    !!bankRow.sort_code &&
    !!bankRow.account_number;

  const bankSortCodeDisplay = formatSortCodeDisplay(bankRow?.sort_code ?? null);
  const bankAccountEnding = maskAccountNumber(bankRow?.account_number ?? null);

  const fullName = `${employee.first_name ?? ""} ${
    employee.last_name ?? ""
  }`.trim();

  const rawStatus = employee.status ?? "active";
  const isLeaver = rawStatus === "leaver";
  const statusLabel = isLeaver ? "Leaver" : "Active";
  const statusClass = isLeaver
    ? "border-red-300 bg-red-100 text-red-800"
    : "border-emerald-300 bg-emerald-100 text-emerald-800";

  const payAfterLeavingText =
    employee.pay_after_leaving == null
      ? "Not set"
      : employee.pay_after_leaving
      ? "Yes, payments after leaving"
      : "No, no payments after leaving";

  return (
    <PageTemplate title="Employee details" currentSection="employees">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          {activeCompanyName ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg sm:text-xl text-[#0f3c85]">
                <span className="font-semibold">Active company:</span>{" "}
                <span className="font-bold">{activeCompanyName}</span>
              </p>
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
              >
                Change company
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm sm:text-base text-neutral-800">
                Active company is selected, but details could not be loaded.
              </p>
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
              >
                Check companies
              </Link>
            </div>
          )}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 border text-sm ${
            hasBankDetails
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          {hasBankDetails ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-emerald-900">
                Bank details on file
              </span>
              <span className="text-xs sm:text-sm text-emerald-900">
                {bankSortCodeDisplay && (
                  <>
                    Sort code {bankSortCodeDisplay}
                    {" \u2022 "}
                  </>
                )}
                {bankAccountEnding && <>Account ending {bankAccountEnding}</>}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-red-700">
                Bank details missing
              </span>
              <Link
                href={`/dashboard/employees/${canonicalEmployeeId}/wizard/bank`}
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85] mt-1 sm:mt-0"
              >
                Add bank details
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white ring-1 ring-neutral-300 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-neutral-900">
                  {fullName || "Unnamed employee"}
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass}`}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="text-xs text-neutral-700">
                Employee number: {employee.employee_number || "Not set"}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard/employees"
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
              >
                â† Back to employees
              </Link>
              <Link
                href={`/dashboard/employees/${employee.employee_id}/edit`}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
              >
                Edit employee
              </Link>
            </div>
          </div>

          <div className="px-4 py-4 space-y-6 text-sm text-neutral-900">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 border-b border-neutral-200 pb-1 mb-3">
                Basic information
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Full name
                  </div>
                  <div className="text-sm text-neutral-900">
                    {fullName || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Employee number
                  </div>
                  <div className="text-sm text-neutral-900">
                    {employee.employee_number || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Email
                  </div>
                  <div className="text-sm text-neutral-900">
                    {employee.email || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Phone
                  </div>
                  <div className="text-sm text-neutral-900">
                    {employee.phone || "Not provided"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Date of birth
                  </div>
                  <div className="text-sm text-neutral-900">
                    {employee.date_of_birth
                      ? calculateAge(employee.date_of_birth)
                      : "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    National Insurance
                  </div>
                  <div className="text-sm text-neutral-900">
                    {employee.ni_number || "Not set"}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 border-b border-neutral-200 pb-1 mb-3">
                Employment
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Job title
                  </div>
                  <div className="text-sm text-neutral-900">
                    {employee.job_title || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Department
                  </div>
                  <div className="text-sm text-neutral-900">
                    {employee.department || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Employment type
                  </div>
                  <div className="text-sm text-neutral-900">
                    {titleCase(employee.employment_type)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Status
                  </div>
                  <div className="text-sm text-neutral-900">{statusLabel}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Hire date
                  </div>
                  <div className="text-sm text-neutral-900">
                    {formatDisplayDate(employee.hire_date ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Pay frequency
                  </div>
                  <div className="text-sm text-neutral-900">
                    {titleCase(employee.pay_frequency)}
                  </div>
                </div>
              </div>
            </section>

            {isLeaver && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 border-b border-neutral-200 pb-1 mb-3">
                  Leaver details
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-neutral-600">
                      Leaving date
                    </div>
                    <div className="text-sm text-neutral-900">
                      {formatDisplayDate(employee.leaving_date ?? null)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-neutral-600">
                      Final pay date
                    </div>
                    <div className="text-sm text-neutral-900">
                      {formatDisplayDate(employee.final_pay_date ?? null)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-neutral-600">
                      Reason for leaving
                    </div>
                    <div className="text-sm text-neutral-900">
                      {employee.leaver_reason
                        ? titleCase(employee.leaver_reason)
                        : "Not set"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-neutral-600">
                      Payments after leaving
                    </div>
                    <div className="text-sm text-neutral-900">
                      {payAfterLeavingText}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 border-b border-neutral-200 pb-1 mb-3">
                Pay
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Annual salary
                  </div>
                  <div className="text-sm text-neutral-900">
                    {formatMoney(employee.annual_salary)}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 border-b border-neutral-200 pb-1 mb-3">
                System information
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Employee ID
                  </div>
                  <div className="text-xs font-mono text-neutral-900 break-all">
                    {employee.employee_id}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Created
                  </div>
                  <div className="text-sm text-neutral-900">
                    {formatDisplayDate(employee.created_at ?? null, "Not set")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-neutral-600">
                    Last updated
                  </div>
                  <div className="text-sm text-neutral-900">
                    {formatDisplayDate(employee.updated_at ?? null, "Not set")}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
