import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const MISSING = "—";

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "")
  );
}

async function getActiveCompanyId(): Promise<string | null> {
  const jar = await cookies();
  const v =
    jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;

  if (!v) return null;

  const trimmed = String(v).trim();
  return isUuid(trimmed) ? trimmed : null;
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

function fmtPercent(n: any) {
  const num = Number(n);
  if (!Number.isFinite(num)) return MISSING;
  return `${num.toFixed(2).replace(/\.00$/, "")}%`;
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
  id?: string | null;
  employee_id?: string | null;
  company_id?: string | null;

  employee_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;

  ni_number?: string | null;
  ni?: string | null;
  ni_number_formatted?: string | null;
  national_insurance_number?: string | null;

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

  tax_code?: string | null;
  tax_code_basis?: string | null;
  tax_basis?: string | null;
  ni_category?: string | null;
  is_director?: boolean | null;

  pension_status?: string | null;
  pension_scheme_name?: string | null;
  pension_reference?: string | null;
  pension_contribution_method?: string | null;
  pension_earnings_basis?: string | null;
  pension_employee_rate?: any | null;
  pension_employer_rate?: any | null;
  pension_enrolment_date?: string | null;
  pension_opt_in_date?: string | null;
  pension_opt_out_date?: string | null;
  pension_postponement_date?: string | null;
  pension_worker_category?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type ContractRow = {
  id?: string | null;
  employee_id?: string | null;
  contract_number?: string | null;
  job_title?: string | null;
  department?: string | null;
  status?: string | null;
  start_date?: string | null;
  leave_date?: string | null;
  pay_frequency?: string | null;
  pay_basis?: string | null;
  annual_salary?: any | null;
  hourly_rate?: any | null;
  hours_per_week?: any | null;
  pay_after_leaving?: boolean | null;
  created_at?: string | null;

  pension_enabled?: boolean | null;
  pension_status?: string | null;
  pension_scheme_name?: string | null;
  pension_reference?: string | null;
  pension_contribution_method?: string | null;
  pension_earnings_basis?: string | null;
  pension_employee_rate?: any | null;
  pension_employer_rate?: any | null;
  pension_worker_category?: string | null;
  pension_enrolment_date?: string | null;
  pension_opt_in_date?: string | null;
  pension_opt_out_date?: string | null;
  pension_postponement_date?: string | null;
};

function tryParseJsonObject(v: any): any {
  if (!v) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;

  const s = v.trim();
  if (!s) return null;

  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeAddress(address: any) {
  const parsed = tryParseJsonObject(address);
  const a = parsed || address || {};

  const line1 =
    (a as any).line1 ?? (a as any).address_line1 ?? (a as any).line_1 ?? null;
  const line2 =
    (a as any).line2 ?? (a as any).address_line2 ?? (a as any).line_2 ?? null;
  const townCity =
    (a as any).town_city ??
    (a as any).city ??
    (a as any).town ??
    (a as any).locality ??
    null;
  const county = (a as any).county ?? (a as any).region ?? null;
  const postcode =
    (a as any).postcode ?? (a as any).post_code ?? (a as any).zip ?? null;
  const country = (a as any).country ?? null;

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
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
        {title}
      </div>
      <div className="mt-1 text-sm text-neutral-900">{children}</div>
    </div>
  );
}

function looksLikeMissingColumn(err: any, column: string) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("column") && msg.includes(column.toLowerCase());
}

function formatTaxBasis(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "week1_month1") return "Week 1 / Month 1";
  if (v === "cumulative") return "Cumulative";
  return MISSING;
}

function formatPensionStatus(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "not_assessed") return "Not assessed";
  if (v === "not_eligible") return "Not eligible";
  if (v === "eligible") return "Eligible";
  if (v === "enrolled") return "Enrolled";
  if (v === "opted_in") return "Opted in";
  if (v === "opted_out") return "Opted out";
  if (v === "postponed") return "Postponed";
  if (v === "ceased") return "Ceased";

  return MISSING;
}

function formatPensionMethod(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "relief_at_source") return "Relief at source";
  if (v === "net_pay") return "Net pay";
  if (v === "salary_sacrifice") return "Salary sacrifice";

  return MISSING;
}

function formatPensionBasis(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "qualifying_earnings") return "Qualifying earnings";
  if (v === "pensionable_pay") return "Pensionable pay";
  if (v === "basic_pay") return "Basic pay";

  return MISSING;
}

function formatWorkerCategory(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "eligible_jobholder") return "Eligible jobholder";
  if (v === "non_eligible_jobholder") return "Non-eligible jobholder";
  if (v === "entitled_worker") return "Entitled worker";
  if (v === "postponed") return "Postponed";
  if (v === "unknown") return "Unknown";

  return MISSING;
}

function formatContractStatus(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "active") return "Active";
  if (v === "inactive") return "Inactive";
  if (v === "leaver") return "Leaver";
  return MISSING;
}

function contractStatusClass(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "active") return "border-emerald-300 bg-emerald-100 text-emerald-800";
  if (v === "leaver") return "border-red-300 bg-red-100 text-red-800";
  if (v === "inactive") return "border-neutral-300 bg-neutral-100 text-neutral-700";
  return "border-neutral-300 bg-neutral-100 text-neutral-700";
}

function formatPayBasis(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "salary" || v === "salaried") return "Salary";
  if (v === "hourly") return "Hourly";
  return MISSING;
}

function formatPayFrequency(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "weekly") return "Weekly";
  if (v === "fortnightly") return "Fortnightly";
  if (v === "four_weekly") return "Four-weekly";
  if (v === "monthly") return "Monthly";
  return MISSING;
}

function getContractSuffixNumber(contractNumber: string | null | undefined): number | null {
  const raw = String(contractNumber || "").trim();
  if (!raw) return null;
  const match = raw.match(/-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function toSortableTime(value: string | null | undefined): number {
  const raw = String(value || "").trim();
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
}

function sortContractsMainFirst(rows: ContractRow[]): ContractRow[] {
  return [...rows].sort((a, b) => {
    const aSuffix = getContractSuffixNumber(a.contract_number);
    const bSuffix = getContractSuffixNumber(b.contract_number);

    if (aSuffix !== null && bSuffix !== null && aSuffix !== bSuffix) {
      return aSuffix - bSuffix;
    }

    if (aSuffix !== null && bSuffix === null) return -1;
    if (aSuffix === null && bSuffix !== null) return 1;

    const aStart = toSortableTime(a.start_date);
    const bStart = toSortableTime(b.start_date);
    if (aStart !== bStart) return aStart - bStart;

    const aCreated = toSortableTime(a.created_at);
    const bCreated = toSortableTime(b.created_at);
    if (aCreated !== bCreated) return aCreated - bCreated;

    return String(a.contract_number || "").localeCompare(String(b.contract_number || ""));
  });
}

function contractDisplayLabel(index: number): string {
  if (index === 0) return "Primary contract";
  return `Additional contract ${index + 1}`;
}

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();

  const activeCompanyId = await getActiveCompanyId();
  if (!activeCompanyId) {
    redirect("/dashboard/companies");
  }

  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return (
      <PageTemplate title="Employee" currentSection="employees">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">
              Sign in required
            </div>
            <div className="mt-1 text-sm text-neutral-700">
              Please sign in again.
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const { data: membership, error: memErr } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", activeCompanyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr || !membership) {
    redirect("/dashboard/companies");
  }

  const resolvedParams = await params;
  const routeId = String(resolvedParams?.id || "").trim();
  if (!routeId) redirect("/dashboard/employees");

  const selectCols = "*";

  async function fetchBy(
    col: "id" | "employee_id" | "employee_number",
    value: string
  ) {
    return await supabase
      .from("employees")
      .select(selectCols)
      .eq("company_id", activeCompanyId)
      .eq(col, value)
      .maybeSingle<EmployeeRow>();
  }

  let employee: EmployeeRow | null = null;
  let error: any = null;

  if (isUuid(routeId)) {
    const r1 = await fetchBy("id", routeId);
    employee = (r1.data as any) ?? null;
    error = r1.error ?? null;

    if (!employee) {
      const r2 = await fetchBy("employee_id", routeId);
      if (!r2.error || !looksLikeMissingColumn(r2.error, "employee_id")) {
        employee = (r2.data as any) ?? null;
        error = r2.error ?? null;
      }
    }
  } else {
    const r1 = await fetchBy("employee_id", routeId);
    if (!r1.error || !looksLikeMissingColumn(r1.error, "employee_id")) {
      employee = (r1.data as any) ?? null;
      error = r1.error ?? null;
    }

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
              <div className="text-2xl font-semibold text-neutral-900">
                Employee Not Found
              </div>
              <div className="mt-2 text-sm text-neutral-700">
                The employee with ID "{routeId}" could not be found for the active
                company.
              </div>
              {error ? (
                <div className="mt-3 text-xs text-red-700">
                  {String(error?.message || "Lookup error")}
                </div>
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
    `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() ||
    "Unnamed employee";

  const preferredId = String(employee.id || "").trim();
  const legacyId = String(employee.employee_id || "").trim();
  const empKey = preferredId || legacyId || routeId;
  const addContractHref = `/dashboard/employees/${empKey}/contracts/new`;

  let contracts: ContractRow[] = [];
  let contractsError: string | null = null;

  if (preferredId) {
    const { data: contractData, error: contractErr } = await supabase
      .from("employee_contracts")
      .select(
        [
          "id",
          "employee_id",
          "contract_number",
          "job_title",
          "department",
          "status",
          "start_date",
          "leave_date",
          "pay_frequency",
          "pay_basis",
          "annual_salary",
          "hourly_rate",
          "hours_per_week",
          "pay_after_leaving",
          "created_at",
          "pension_enabled",
          "pension_status",
          "pension_scheme_name",
          "pension_reference",
          "pension_contribution_method",
          "pension_earnings_basis",
          "pension_employee_rate",
          "pension_employer_rate",
          "pension_worker_category",
          "pension_enrolment_date",
          "pension_opt_in_date",
          "pension_opt_out_date",
          "pension_postponement_date",
        ].join(",")
      )
      .eq("company_id", activeCompanyId)
      .eq("employee_id", preferredId);

    if (contractErr) {
      contractsError = String(contractErr.message || "Could not load contracts.");
    } else {
      contracts = sortContractsMainFirst(
        (Array.isArray(contractData) ? contractData : []) as ContractRow[]
      );
    }
  }

  const status = String(employee.status ?? "active").toLowerCase();
  const isLeaver = status === "leaver";

  const statusPill = isLeaver
    ? pillClass("border-red-300 bg-red-100 text-red-800")
    : pillClass("border-emerald-300 bg-emerald-100 text-emerald-800");

  const ae = aeStatus(employee.date_of_birth, employee.annual_salary);
  const addr = normalizeAddress(employee.address);

  const niDisplay =
    employee.ni_number ??
    employee.ni ??
    employee.national_insurance_number ??
    employee.ni_number_formatted ??
    null;

  const taxBasisValue =
    employee.tax_code_basis ?? employee.tax_basis ?? null;

  const hasPensionData =
    !!String(employee.pension_status || "").trim() ||
    !!String(employee.pension_scheme_name || "").trim() ||
    !!String(employee.pension_reference || "").trim() ||
    !!String(employee.pension_contribution_method || "").trim() ||
    !!String(employee.pension_earnings_basis || "").trim() ||
    employee.pension_employee_rate !== null ||
    employee.pension_employee_rate !== undefined ||
    employee.pension_employer_rate !== null ||
    employee.pension_employer_rate !== undefined ||
    !!String(employee.pension_enrolment_date || "").trim() ||
    !!String(employee.pension_opt_in_date || "").trim() ||
    !!String(employee.pension_opt_out_date || "").trim() ||
    !!String(employee.pension_postponement_date || "").trim() ||
    !!String(employee.pension_worker_category || "").trim();

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
                    {"·"} Emp {employee.employee_number}
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
                className="inline-flex items-center justify-center rounded-full bg-neutral-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-700"
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
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-900">
                Contracts
              </div>
              <div className="text-xs text-neutral-700">
                Contract records for this employee. One person can hold two or more contracts.
              </div>
            </div>

            <Link
              href={addContractHref}
              className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
            >
              Add contract
            </Link>
          </div>

          <div className="p-4">
            {contractsError ? (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                {contractsError}
              </div>
            ) : contracts.length === 0 ? (
              <div className="rounded-lg border border-neutral-300 bg-white p-4 text-sm text-neutral-700">
                No contract records found for this employee.
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract, index) => {
                  const contractNumber = safeStr(contract.contract_number);
                  const contractStatus = String(contract.status || "").trim().toLowerCase();
                  const humanLabel = contractDisplayLabel(index);
                  const pensionEnabled = Boolean(contract.pension_enabled);
                  const editContractHref = contract.id
                    ? `/dashboard/employees/${empKey}/contracts/${contract.id}/edit`
                    : null;

                  return (
                    <div
                      key={String(contract.id || contract.contract_number || `${index}`)}
                      className="rounded-lg border border-neutral-300 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900">
                            {contractNumber}
                          </div>
                          <div className="mt-1 text-xs text-neutral-600">
                            {humanLabel}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {editContractHref ? (
                            <Link
                              href={editContractHref}
                              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                            >
                              Edit contract
                            </Link>
                          ) : null}

                          <span className={pillClass(contractStatusClass(contractStatus))}>
                            {formatContractStatus(contract.status)}
                          </span>

                          {contract.pay_after_leaving === true ? (
                            <span className={pillClass("border-amber-300 bg-amber-100 text-amber-900")}>
                              Pay after leaving
                            </span>
                          ) : null}

                          {pensionEnabled ? (
                            <span className={pillClass("border-blue-300 bg-blue-100 text-blue-800")}>
                              Pension on
                            </span>
                          ) : (
                            <span className={pillClass("border-neutral-300 bg-neutral-100 text-neutral-700")}>
                              Pension off
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {cardBox("Job title", safeStr(contract.job_title))}
                        {cardBox("Department", safeStr(contract.department))}
                        {cardBox("Start date", fmtDate(contract.start_date))}
                        {cardBox("Leave date", fmtDate(contract.leave_date))}
                        {cardBox("Pay frequency", formatPayFrequency(contract.pay_frequency))}
                        {cardBox("Pay basis", formatPayBasis(contract.pay_basis))}
                        {cardBox("Annual salary", fmtMoney(contract.annual_salary))}
                        {cardBox("Hourly rate", fmtMoney(contract.hourly_rate))}
                        {cardBox(
                          "Hours per week",
                          contract.hours_per_week !== null && contract.hours_per_week !== undefined
                            ? String(contract.hours_per_week)
                            : MISSING
                        )}
                      </div>

                      <div className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                          Contract pension
                        </div>

                        {pensionEnabled ? (
                          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {cardBox("Pension status", formatPensionStatus(contract.pension_status))}
                            {cardBox("Worker category", formatWorkerCategory(contract.pension_worker_category))}
                            {cardBox("Scheme name", safeStr(contract.pension_scheme_name))}
                            {cardBox("Pension reference", safeStr(contract.pension_reference))}
                            {cardBox(
                              "Contribution method",
                              formatPensionMethod(contract.pension_contribution_method)
                            )}
                            {cardBox(
                              "Earnings basis",
                              formatPensionBasis(contract.pension_earnings_basis)
                            )}
                            {cardBox("Employee rate", fmtPercent(contract.pension_employee_rate))}
                            {cardBox("Employer rate", fmtPercent(contract.pension_employer_rate))}
                            {cardBox("Enrolment date", fmtDate(contract.pension_enrolment_date))}
                            {cardBox("Opt-in date", fmtDate(contract.pension_opt_in_date))}
                            {cardBox("Opt-out date", fmtDate(contract.pension_opt_out_date))}
                            {cardBox("Postponement date", fmtDate(contract.pension_postponement_date))}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-lg border border-neutral-300 bg-white p-4 text-sm text-neutral-700">
                            Pension is not enabled for this contract.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">
              Basic information
            </div>
            <div className="text-xs text-neutral-700">
              Core identity fields and HMRC basics.
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {cardBox("Employee number", safeStr(employee.employee_number))}
              {cardBox("Email", safeStr(employee.email))}
              {cardBox("NI number", safeStr(niDisplay))}
              {cardBox("Date of birth", fmtDate(employee.date_of_birth))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">
              Employment
            </div>
            <div className="text-xs text-neutral-700">
              Role, dates, and pay frequency.
            </div>
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
            <div className="text-xs text-neutral-700">
              Salary, hourly, and hours per week.
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {cardBox("Annual salary", fmtMoney(employee.annual_salary))}
              {cardBox("Hourly rate", fmtMoney(employee.hourly_rate))}
              {cardBox(
                "Hours per week",
                employee.hours_per_week !== null &&
                  employee.hours_per_week !== undefined
                  ? String(employee.hours_per_week)
                  : MISSING
              )}
            </div>

            <div className="mt-4 rounded-lg border border-neutral-300 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Auto-enrolment
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={pillClass(ae.className)}>{ae.label}</span>
                <span className="text-sm text-neutral-800">{ae.sub}</span>
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                This is a simple indicator. Final AE decisions should be validated
                during payroll processing.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Pension</div>
            <div className="text-xs text-neutral-700">
              Stored employee pension setup.
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {cardBox("Pension status", formatPensionStatus(employee.pension_status))}
              {cardBox("Worker category", formatWorkerCategory(employee.pension_worker_category))}
              {cardBox("Scheme name", safeStr(employee.pension_scheme_name))}
              {cardBox("Pension reference", safeStr(employee.pension_reference))}
              {cardBox(
                "Contribution method",
                formatPensionMethod(employee.pension_contribution_method)
              )}
              {cardBox(
                "Earnings basis",
                formatPensionBasis(employee.pension_earnings_basis)
              )}
              {cardBox("Employee rate", fmtPercent(employee.pension_employee_rate))}
              {cardBox("Employer rate", fmtPercent(employee.pension_employer_rate))}
              {cardBox("Enrolment date", fmtDate(employee.pension_enrolment_date))}
              {cardBox("Opt-in date", fmtDate(employee.pension_opt_in_date))}
              {cardBox("Opt-out date", fmtDate(employee.pension_opt_out_date))}
              {cardBox(
                "Postponement date",
                fmtDate(employee.pension_postponement_date)
              )}
            </div>

            {!hasPensionData ? (
              <div className="mt-4 rounded-lg border border-neutral-300 bg-white p-4 text-sm text-neutral-700">
                No pension details are currently stored on this employee record.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Tax and NI</div>
            <div className="text-xs text-neutral-700">
              HMRC tax code, NI category, and director status.
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {cardBox("Tax code", safeStr(employee.tax_code))}
              {cardBox("Tax basis", formatTaxBasis(taxBasisValue))}
              {cardBox(
                "NI category",
                employee.ni_category ? String(employee.ni_category).toUpperCase() : MISSING
              )}
              {cardBox(
                "Director",
                employee.is_director === true
                  ? "Yes"
                  : employee.is_director === false
                    ? "No"
                    : MISSING
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Address</div>
            <div className="text-xs text-neutral-700">
              Stored employee address (if provided).
            </div>
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