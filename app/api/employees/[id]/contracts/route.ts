import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ContractPayFrequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";
type ContractPayBasis = "salary" | "hourly";
type ContractStatus = "active" | "inactive" | "leaver";
type PensionStatus =
  | "not_assessed"
  | "postponed"
  | "eligible"
  | "enrolled"
  | "opted_in"
  | "opted_out"
  | "ceased"
  | "not_eligible";
type PensionContributionMethod =
  | "relief_at_source"
  | "net_pay"
  | "salary_sacrifice";
type PensionEarningsBasis =
  | "qualifying_earnings"
  | "pensionable_pay"
  | "basic_pay";

type EmployeeLookupRow = {
  id?: string | null;
  employee_id?: string | null;
  employee_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type ExistingContractRow = {
  id?: string | null;
  contract_number?: string | null;
  job_title?: string | null;
  department?: string | null;
  status?: string | null;
  start_date?: string | null;
  leave_date?: string | null;
  pay_frequency?: string | null;
  pay_basis?: string | null;
  annual_salary?: number | null;
  hourly_rate?: number | null;
  hours_per_week?: number | null;
  pay_after_leaving?: boolean | null;
};

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

function isIsoDateOnly(v: any): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim());
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

function sameNullableNumber(a: any, b: any): boolean {
  const na = numOrNull(a);
  const nb = numOrNull(b);
  return na === nb;
}

function isStaffRole(role: string) {
  return ["owner", "admin", "manager", "processor"].includes(
    String(role || "").toLowerCase()
  );
}

function looksLikeMissingColumn(err: any, column: string) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("column") && msg.includes(column.toLowerCase());
}

function normalizePayFrequency(v: any): ContractPayFrequency | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "weekly") return "weekly";
  if (s === "fortnightly") return "fortnightly";
  if (s === "four_weekly" || s === "4-weekly" || s === "4 weekly") return "four_weekly";
  if (s === "monthly") return "monthly";
  return null;
}

function normalizePayBasis(v: any): ContractPayBasis | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "salary" || s === "salaried") return "salary";
  if (s === "hourly" || s === "hour") return "hourly";
  return null;
}

function normalizeContractStatus(v: any): ContractStatus | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "active") return "active";
  if (s === "inactive") return "inactive";
  if (s === "leaver") return "leaver";
  return null;
}

function normalizePensionStatus(v: any): PensionStatus | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (
    s === "not_assessed" ||
    s === "postponed" ||
    s === "eligible" ||
    s === "enrolled" ||
    s === "opted_in" ||
    s === "opted_out" ||
    s === "ceased" ||
    s === "not_eligible"
  ) {
    return s;
  }
  return null;
}

function normalizePensionContributionMethod(
  v: any
): PensionContributionMethod | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (
    s === "relief_at_source" ||
    s === "net_pay" ||
    s === "salary_sacrifice"
  ) {
    return s;
  }
  return null;
}

function normalizePensionEarningsBasis(v: any): PensionEarningsBasis | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (
    s === "qualifying_earnings" ||
    s === "pensionable_pay" ||
    s === "basic_pay"
  ) {
    return s;
  }
  return null;
}

function sanitizeIdentifierForContractNumber(
  v: string | null | undefined
): string | null {
  const s = strOrNull(v);
  if (!s) return null;
  const cleaned = s.replace(/[^A-Za-z0-9-]/g, "");
  return cleaned || null;
}

async function requireUserAndMembership(companyId: string) {
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return {
      ok: false as const,
      res: json(401, {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sign in required.",
      }),
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
      res: json(500, {
        ok: false,
        code: "MEMBERSHIP_CHECK_FAILED",
        message: "Could not validate company membership.",
      }),
    };
  }

  if (!membership) {
    return {
      ok: false as const,
      res: json(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "You do not have access to the active company.",
      }),
    };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    role: String((membership as any).role || "member"),
  };
}

async function fetchEmployeeByRouteId(
  supabase: any,
  companyId: string,
  routeId: string
): Promise<{ employee: EmployeeLookupRow | null; error: any | null }> {
  const selectCols =
    "id, employee_id, employee_number, first_name, last_name, email";

  async function fetchBy(
    col: "id" | "employee_id" | "employee_number",
    value: string
  ) {
    return await supabase
      .from("employees")
      .select(selectCols)
      .eq("company_id", companyId)
      .eq(col, value)
      .maybeSingle<EmployeeLookupRow>();
  }

  let employee: EmployeeLookupRow | null = null;
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

  return { employee, error };
}

async function getNextContractNumber(
  supabase: any,
  companyId: string,
  employeeUuid: string,
  employeeNumber: string | null
): Promise<string> {
  const { data, error } = await supabase
    .from("employee_contracts")
    .select("contract_number")
    .eq("company_id", companyId)
    .eq("employee_id", employeeUuid);

  if (error) {
    throw new Error(
      error.message || "Failed to calculate the next contract number."
    );
  }

  const base =
    sanitizeIdentifierForContractNumber(employeeNumber) ??
    `EMP-${employeeUuid.slice(0, 8)}`;

  const contracts = Array.isArray(data) ? data : [];

  let highestSuffix = 0;

  for (const contract of contracts) {
    const raw = strOrNull((contract as any)?.contract_number);
    if (!raw) continue;

    const match = raw.match(/-(\d+)$/);
    if (!match) continue;

    const suffix = Number(match[1]);
    if (Number.isFinite(suffix) && suffix > highestSuffix) {
      highestSuffix = suffix;
    }
  }

  const nextSuffix = String(highestSuffix + 1).padStart(2, "0");
  return `${base}-${nextSuffix}`;
}

async function findDuplicateContract(
  supabase: any,
  companyId: string,
  employeeUuid: string,
  input: {
    job_title: string | null;
    department: string | null;
    status: ContractStatus;
    start_date: string;
    leave_date: string | null;
    pay_frequency: ContractPayFrequency;
    pay_basis: ContractPayBasis;
    annual_salary: number | null;
    hourly_rate: number | null;
    hours_per_week: number | null;
    pay_after_leaving: boolean;
  }
): Promise<ExistingContractRow | null> {
  const { data, error } = await supabase
    .from("employee_contracts")
    .select(
      [
        "id",
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
      ].join(",")
    )
    .eq("company_id", companyId)
    .eq("employee_id", employeeUuid);

  if (error) {
    throw new Error(error.message || "Failed to check for duplicate contracts.");
  }

  const rows = Array.isArray(data) ? (data as ExistingContractRow[]) : [];

  return (
    rows.find((row) => {
      return (
        strOrNull(row.job_title) === input.job_title &&
        strOrNull(row.department) === input.department &&
        strOrNull(row.status) === input.status &&
        strOrNull(row.start_date) === input.start_date &&
        strOrNull(row.leave_date) === input.leave_date &&
        strOrNull(row.pay_frequency) === input.pay_frequency &&
        strOrNull(row.pay_basis) === input.pay_basis &&
        sameNullableNumber(row.annual_salary, input.annual_salary) &&
        sameNullableNumber(row.hourly_rate, input.hourly_rate) &&
        sameNullableNumber(row.hours_per_week, input.hours_per_week) &&
        Boolean(row.pay_after_leaving) === input.pay_after_leaving
      );
    }) ?? null
  );
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const companyId = await getActiveCompanyId();

    if (!companyId) {
      return json(400, {
        ok: false,
        code: "NO_COMPANY",
        error: "No active company selected",
      });
    }

    const gate = await requireUserAndMembership(companyId);
    if (!gate.ok) return gate.res;

    if (!isStaffRole(gate.role)) {
      return json(403, {
        ok: false,
        code: "INSUFFICIENT_ROLE",
        error: "You do not have permission to create employee contracts.",
      });
    }

    const resolvedParams = await params;
    const routeId = String(resolvedParams?.id ?? "").trim();

    if (!routeId) {
      return json(400, {
        ok: false,
        code: "MISSING_EMPLOYEE_ID",
        error: "Employee id is required.",
      });
    }

    const { employee, error: employeeLookupError } = await fetchEmployeeByRouteId(
      gate.supabase,
      companyId,
      routeId
    );

    if (employeeLookupError) {
      return json(500, {
        ok: false,
        code: "EMPLOYEE_LOOKUP_FAILED",
        error: employeeLookupError.message ?? "Could not load employee.",
      });
    }

    if (!employee?.id) {
      return json(404, {
        ok: false,
        code: "EMPLOYEE_NOT_FOUND",
        error: "Employee not found for the active company.",
      });
    }

    const body = await req.json().catch(() => ({} as any));

    const contract_number = strOrNull(body?.contract_number);
    const job_title = strOrNull(body?.job_title);
    const department = strOrNull(body?.department);
    const status = normalizeContractStatus(body?.status) ?? "active";
    const start_date = strOrNull(body?.start_date);
    const leave_date = strOrNull(body?.leave_date);
    const pay_frequency = normalizePayFrequency(body?.pay_frequency);
    const pay_basis = normalizePayBasis(body?.pay_basis);
    const annual_salary = numOrNull(body?.annual_salary);
    const hourly_rate = numOrNull(body?.hourly_rate);
    const hours_per_week = numOrNull(body?.hours_per_week);
    const pay_after_leaving = Boolean(body?.pay_after_leaving ?? false);

    const pension_enabled = Boolean(body?.pension_enabled ?? false);
    const pension_status = normalizePensionStatus(body?.pension_status);
    const pension_scheme_name = strOrNull(body?.pension_scheme_name);
    const pension_reference = strOrNull(body?.pension_reference);
    const pension_contribution_method = normalizePensionContributionMethod(
      body?.pension_contribution_method
    );
    const pension_earnings_basis = normalizePensionEarningsBasis(
      body?.pension_earnings_basis
    );
    const pension_employee_rate = numOrNull(body?.pension_employee_rate);
    const pension_employer_rate = numOrNull(body?.pension_employer_rate);
    const pension_worker_category = strOrNull(body?.pension_worker_category);
    const pension_enrolment_date = strOrNull(body?.pension_enrolment_date);
    const pension_opt_in_date = strOrNull(body?.pension_opt_in_date);
    const pension_opt_out_date = strOrNull(body?.pension_opt_out_date);
    const pension_postponement_date = strOrNull(body?.pension_postponement_date);

    if (!job_title) {
      return json(400, {
        ok: false,
        code: "MISSING_JOB_TITLE",
        error: "job_title is required.",
      });
    }

    if (!start_date) {
      return json(400, {
        ok: false,
        code: "MISSING_START_DATE",
        error: "start_date is required.",
      });
    }

    if (!isIsoDateOnly(start_date)) {
      return json(400, {
        ok: false,
        code: "BAD_START_DATE",
        error: "start_date must be YYYY-MM-DD.",
      });
    }

    if (leave_date && !isIsoDateOnly(leave_date)) {
      return json(400, {
        ok: false,
        code: "BAD_LEAVE_DATE",
        error: "leave_date must be YYYY-MM-DD when provided.",
      });
    }

    if (leave_date && leave_date < start_date) {
      return json(400, {
        ok: false,
        code: "BAD_LEAVE_DATE_ORDER",
        error: "leave_date cannot be earlier than start_date.",
      });
    }

    if (!pay_frequency) {
      return json(400, {
        ok: false,
        code: "BAD_PAY_FREQUENCY",
        error: "pay_frequency must be weekly, fortnightly, four_weekly, or monthly.",
      });
    }

    if (!pay_basis) {
      return json(400, {
        ok: false,
        code: "BAD_PAY_BASIS",
        error: "pay_basis must be salary or hourly.",
      });
    }

    if (hours_per_week === null || hours_per_week <= 0) {
      return json(400, {
        ok: false,
        code: "BAD_HOURS",
        error: "hours_per_week must be greater than 0.",
      });
    }

    if (pay_basis === "salary" && (annual_salary === null || annual_salary <= 0)) {
      return json(400, {
        ok: false,
        code: "BAD_ANNUAL_SALARY",
        error: "annual_salary must be greater than 0 for a salary contract.",
      });
    }

    if (pay_basis === "hourly" && (hourly_rate === null || hourly_rate <= 0)) {
      return json(400, {
        ok: false,
        code: "BAD_HOURLY_RATE",
        error: "hourly_rate must be greater than 0 for an hourly contract.",
      });
    }

    if (pension_enrolment_date && !isIsoDateOnly(pension_enrolment_date)) {
      return json(400, {
        ok: false,
        code: "BAD_PENSION_ENROLMENT_DATE",
        error: "pension_enrolment_date must be YYYY-MM-DD when provided.",
      });
    }

    if (pension_opt_in_date && !isIsoDateOnly(pension_opt_in_date)) {
      return json(400, {
        ok: false,
        code: "BAD_PENSION_OPT_IN_DATE",
        error: "pension_opt_in_date must be YYYY-MM-DD when provided.",
      });
    }

    if (pension_opt_out_date && !isIsoDateOnly(pension_opt_out_date)) {
      return json(400, {
        ok: false,
        code: "BAD_PENSION_OPT_OUT_DATE",
        error: "pension_opt_out_date must be YYYY-MM-DD when provided.",
      });
    }

    if (pension_postponement_date && !isIsoDateOnly(pension_postponement_date)) {
      return json(400, {
        ok: false,
        code: "BAD_PENSION_POSTPONEMENT_DATE",
        error: "pension_postponement_date must be YYYY-MM-DD when provided.",
      });
    }

    if (pension_enabled) {
      if (!pension_status) {
        return json(400, {
          ok: false,
          code: "BAD_PENSION_STATUS",
          error:
            "pension_status must be not_assessed, postponed, eligible, enrolled, opted_in, opted_out, ceased, or not_eligible when pension is enabled.",
        });
      }

      if (!pension_scheme_name) {
        return json(400, {
          ok: false,
          code: "MISSING_PENSION_SCHEME_NAME",
          error: "pension_scheme_name is required when pension is enabled.",
        });
      }

      if (!pension_contribution_method) {
        return json(400, {
          ok: false,
          code: "BAD_PENSION_METHOD",
          error:
            "pension_contribution_method must be relief_at_source, net_pay, or salary_sacrifice when pension is enabled.",
        });
      }

      if (!pension_earnings_basis) {
        return json(400, {
          ok: false,
          code: "BAD_PENSION_EARNINGS_BASIS",
          error:
            "pension_earnings_basis must be qualifying_earnings, pensionable_pay, or basic_pay when pension is enabled.",
        });
      }

      if (
        pension_employee_rate === null ||
        pension_employee_rate < 0 ||
        pension_employee_rate > 100
      ) {
        return json(400, {
          ok: false,
          code: "BAD_PENSION_EMPLOYEE_RATE",
          error:
            "pension_employee_rate must be between 0 and 100 when pension is enabled.",
        });
      }

      if (
        pension_employer_rate === null ||
        pension_employer_rate < 0 ||
        pension_employer_rate > 100
      ) {
        return json(400, {
          ok: false,
          code: "BAD_PENSION_EMPLOYER_RATE",
          error:
            "pension_employer_rate must be between 0 and 100 when pension is enabled.",
        });
      }
    }

    const duplicate = await findDuplicateContract(gate.supabase, companyId, String(employee.id), {
      job_title,
      department,
      status,
      start_date,
      leave_date,
      pay_frequency,
      pay_basis,
      annual_salary,
      hourly_rate,
      hours_per_week,
      pay_after_leaving,
    });

    if (duplicate) {
      return json(409, {
        ok: false,
        code: "DUPLICATE_CONTRACT",
        error: `A matching contract already exists${
          duplicate.contract_number ? ` (${duplicate.contract_number})` : ""
        }.`,
      });
    }

    let finalContractNumber: string;

    if (contract_number) {
      const cleaned = sanitizeIdentifierForContractNumber(contract_number);

      if (!cleaned || cleaned !== contract_number) {
        return json(400, {
          ok: false,
          code: "BAD_CONTRACT_NUMBER",
          error: "contract_number may only contain letters, numbers, and hyphens.",
        });
      }

      const { data: existingByNumber, error: existingByNumberError } =
        await gate.supabase
          .from("employee_contracts")
          .select("id")
          .eq("company_id", companyId)
          .eq("contract_number", cleaned)
          .maybeSingle();

      if (existingByNumberError) {
        return json(500, {
          ok: false,
          code: "CONTRACT_NUMBER_CHECK_FAILED",
          error:
            existingByNumberError.message ?? "Could not validate contract number.",
        });
      }

      if (existingByNumber?.id) {
        return json(409, {
          ok: false,
          code: "CONTRACT_NUMBER_EXISTS",
          error: "That contract number already exists.",
        });
      }

      finalContractNumber = cleaned;
    } else {
      finalContractNumber = await getNextContractNumber(
        gate.supabase,
        companyId,
        String(employee.id),
        strOrNull(employee.employee_number)
      );
    }

    const insertRow = {
      company_id: companyId,
      employee_id: String(employee.id),
      contract_number: finalContractNumber,
      job_title,
      department,
      status,
      start_date,
      leave_date,
      pay_frequency,
      pay_basis,
      annual_salary,
      hourly_rate,
      hours_per_week,
      pay_after_leaving,

      pension_enabled,
      pension_status: pension_enabled ? pension_status : "not_assessed",
      pension_scheme_name: pension_enabled ? pension_scheme_name : null,
      pension_reference: pension_enabled ? pension_reference : null,
      pension_contribution_method: pension_enabled
        ? pension_contribution_method
        : null,
      pension_earnings_basis: pension_enabled ? pension_earnings_basis : null,
      pension_employee_rate: pension_enabled ? pension_employee_rate : null,
      pension_employer_rate: pension_enabled ? pension_employer_rate : null,
      pension_worker_category: pension_enabled ? pension_worker_category : null,
      pension_enrolment_date: pension_enabled ? pension_enrolment_date : null,
      pension_opt_in_date: pension_enabled ? pension_opt_in_date : null,
      pension_opt_out_date: pension_enabled ? pension_opt_out_date : null,
      pension_postponement_date: pension_enabled
        ? pension_postponement_date
        : null,
    };

    const { data: contractData, error: contractError } = await gate.supabase
      .from("employee_contracts")
      .insert(insertRow)
      .select(
        [
          "id",
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
      .single();

    if (contractError) {
      return json(500, {
        ok: false,
        code: "CONTRACT_INSERT_FAILED",
        error: contractError.message ?? "Failed to create contract.",
      });
    }

    return json(201, {
      ok: true,
      employee: {
        id: String(employee.id),
        employee_id: strOrNull(employee.employee_id),
        employee_number: strOrNull(employee.employee_number),
        first_name: strOrNull(employee.first_name),
        last_name: strOrNull(employee.last_name),
        email: strOrNull(employee.email),
      },
      contract: contractData ?? null,
    });
  } catch (err: any) {
    return json(500, {
      ok: false,
      code: "UNHANDLED",
      error: err?.message ?? "Unexpected server error",
    });
  }
}