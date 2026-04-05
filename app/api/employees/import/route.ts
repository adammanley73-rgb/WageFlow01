// C:\Projects\wageflow01\app\api\employees\import\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ImportRow = {
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  start_date?: string;
  hire_date?: string;
  date_of_birth?: string;
  employment_type?: string;
  annual_salary?: string | number;
  hourly_rate?: string | number;
  hours_per_week?: string | number;
  ni_number?: string;
  pay_frequency?: string;
  p45_provided?: string | boolean;
  starter_declaration?: string;
  student_loan_plan?: string;
  postgraduate_loan?: string | boolean;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

type ImportBody = {
  rows?: ImportRow[];
};

type StudentLoanPlanDb = "plan1" | "plan2" | "plan4" | "plan5" | null;
type StarterDeclaration = "A" | "B" | "C" | null;
type TaxCodeBasis = "cumulative" | "week1_month1";

type NormalizedImportRow = {
  employee_number: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  start_date: string | null;
  hire_date: string | null;
  date_of_birth: string | null;
  employment_type: string;
  annual_salary: number | null;
  hourly_rate: number | null;
  hours_per_week: number | null;
  ni_number: string | null;
  pay_frequency: string | null;
  p45_provided: boolean | null;
  starter_declaration: StarterDeclaration;
  student_loan_plan: StudentLoanPlanDb;
  postgraduate_loan: boolean | null;
  address: {
    line_1: string | null;
    line_2: string | null;
    city: string | null;
    county: string | null;
    postcode: string | null;
    country: string | null;
  };
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
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

function isAllowedPayFrequency(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return true;
  return ["weekly", "fortnightly", "four_weekly", "monthly"].includes(s);
}

function isIsoDateOnly(s: any): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? "").trim());
}

function parseBoolean(v: any): boolean | null {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return null;
}

function normalizeDeclaration(v: any): StarterDeclaration {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "A" || s === "B" || s === "C") return s;
  return null;
}

function normalizeLoanPlan(v: any): StudentLoanPlanDb {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s || s === "none") return null;
  if (s === "plan1" || s === "plan_1" || s === "1") return "plan1";
  if (s === "plan2" || s === "plan_2" || s === "2") return "plan2";
  if (s === "plan4" || s === "plan_4" || s === "4") return "plan4";
  if (s === "plan5" || s === "plan_5" || s === "5") return "plan5";
  return null;
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

function buildStarterDrivenEmployeeUpdate(args: {
  p45Provided: boolean;
  declaration: StarterDeclaration;
  studentLoanPlan: StudentLoanPlanDb;
  postgraduateLoan: boolean;
}): {
  tax_code: string;
  tax_code_basis: TaxCodeBasis;
  student_loan_plan: StudentLoanPlanDb;
  postgraduate_loan: boolean;
} | null {
  if (args.p45Provided !== false) {
    return null;
  }

  if (args.declaration === "C") {
    return {
      tax_code: "BR",
      tax_code_basis: "week1_month1",
      student_loan_plan: args.studentLoanPlan,
      postgraduate_loan: args.postgraduateLoan,
    };
  }

  if (args.declaration === "B") {
    return {
      tax_code: "1257L",
      tax_code_basis: "week1_month1",
      student_loan_plan: args.studentLoanPlan,
      postgraduate_loan: args.postgraduateLoan,
    };
  }

  return {
    tax_code: "1257L",
    tax_code_basis: "cumulative",
    student_loan_plan: args.studentLoanPlan,
    postgraduate_loan: args.postgraduateLoan,
  };
}

function validateRow(row: ImportRow, rowNumber: number) {
  const errors: string[] = [];

  const first_name = strOrNull(row.first_name);
  const last_name = strOrNull(row.last_name);
  const email = strOrNull(row.email)?.toLowerCase() ?? null;
  const start_date = strOrNull(row.start_date);
  const hire_date = strOrNull(row.hire_date) ?? start_date ?? todayISO();
  const date_of_birth = strOrNull(row.date_of_birth);
  const pay_frequency = strOrNull(row.pay_frequency);
  const ni_number = canonNi(row.ni_number);
  const p45Provided = parseBoolean(row.p45_provided);
  const starterDeclaration = normalizeDeclaration(row.starter_declaration);
  const studentLoanPlan = normalizeLoanPlan(row.student_loan_plan);
  const postgraduateLoan = parseBoolean(row.postgraduate_loan);

  if (!first_name) errors.push("first_name is required.");
  if (!last_name) errors.push("last_name is required.");
  if (!email) errors.push("email is required.");
  if (!start_date) errors.push("start_date is required.");
  if (start_date && !isIsoDateOnly(start_date)) errors.push("start_date must be YYYY-MM-DD.");
  if (hire_date && !isIsoDateOnly(hire_date)) errors.push("hire_date must be YYYY-MM-DD.");
  if (date_of_birth && !isIsoDateOnly(date_of_birth)) errors.push("date_of_birth must be YYYY-MM-DD.");
  if (pay_frequency && !isAllowedPayFrequency(pay_frequency)) {
    errors.push("pay_frequency must be weekly, fortnightly, four_weekly, or monthly.");
  }
  if (ni_number && !isValidNi(ni_number)) {
    errors.push("ni_number must be a valid NI number, for example AB123456C.");
  }
  if (p45Provided === null) {
    errors.push("p45_provided must be true or false.");
  }

  const annual_salary = numOrNull(row.annual_salary);
  const hourly_rate = numOrNull(row.hourly_rate);
  const hours_per_week = numOrNull(row.hours_per_week);

  if (row.annual_salary !== undefined && String(row.annual_salary).trim() !== "" && annual_salary === null) {
    errors.push("annual_salary must be numeric when provided.");
  }
  if (row.hourly_rate !== undefined && String(row.hourly_rate).trim() !== "" && hourly_rate === null) {
    errors.push("hourly_rate must be numeric when provided.");
  }
  if (row.hours_per_week !== undefined && String(row.hours_per_week).trim() !== "" && hours_per_week === null) {
    errors.push("hours_per_week must be numeric when provided.");
  }

  if (p45Provided === false) {
    if (starterDeclaration === null) {
      errors.push("starter_declaration is required when p45_provided is false.");
    }
    if (String(row.student_loan_plan ?? "").trim() === "") {
      errors.push("student_loan_plan is required when p45_provided is false.");
    } else if (studentLoanPlan === null && String(row.student_loan_plan ?? "").trim().toLowerCase() !== "none") {
      errors.push("student_loan_plan must be none, plan1, plan2, plan4, or plan5.");
    }
    if (postgraduateLoan === null) {
      errors.push("postgraduate_loan is required when p45_provided is false.");
    }
  }

  const normalized: NormalizedImportRow = {
    employee_number: strOrNull(row.employee_number),
    first_name,
    last_name,
    email,
    phone: strOrNull(row.phone),
    job_title: strOrNull(row.job_title),
    start_date,
    hire_date,
    date_of_birth,
    employment_type: strOrNull(row.employment_type) ?? "full_time",
    annual_salary,
    hourly_rate,
    hours_per_week,
    ni_number,
    pay_frequency,
    p45_provided: p45Provided,
    starter_declaration: p45Provided === true ? null : starterDeclaration,
    student_loan_plan: p45Provided === true ? null : studentLoanPlan,
    postgraduate_loan: p45Provided === true ? null : (postgraduateLoan ?? null),
    address: {
      line_1: strOrNull(row.address_line_1),
      line_2: strOrNull(row.address_line_2),
      city: strOrNull(row.city),
      county: strOrNull(row.county),
      postcode: strOrNull(row.postcode),
      country: strOrNull(row.country),
    },
  };

  return {
    rowNumber,
    errors,
    normalized,
  };
}

async function findExistingConflictsForRow(
  supabase: any,
  companyId: string,
  row: NormalizedImportRow
) {
  const conflicts: string[] = [];

  if (row.ni_number) {
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name, employee_number, ni_number")
      .eq("company_id", companyId)
      .eq("ni_number", row.ni_number)
      .maybeSingle();

    if (data) {
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
      conflicts.push(
        `NI number ${row.ni_number} already exists for ${name || "an existing employee"}${data.employee_number ? ` (${data.employee_number})` : ""}.`
      );
    }
  }

  if (row.email) {
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name, employee_number, email")
      .eq("company_id", companyId)
      .eq("email", row.email)
      .maybeSingle();

    if (data) {
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
      conflicts.push(
        `Email ${row.email} already exists for ${name || "an existing employee"}${data.employee_number ? ` (${data.employee_number})` : ""}.`
      );
    }
  }

  if (row.employee_number) {
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name, employee_number")
      .eq("company_id", companyId)
      .eq("employee_number", row.employee_number)
      .maybeSingle();

    if (data) {
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
      conflicts.push(
        `Employee number ${row.employee_number} already exists for ${name || "an existing employee"}.`
      );
    }
  }

  return conflicts;
}

export async function POST(req: Request) {
  try {
    const companyId = await getActiveCompanyId();

    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", error: "No active company selected" });
    }

    const gate = await requireUserAndMembership(companyId);
    if (!gate.ok) return gate.res;

    if (!isStaffRole(gate.role)) {
      return json(403, {
        ok: false,
        code: "INSUFFICIENT_ROLE",
        error: "You do not have permission to import employees.",
      });
    }

    const body = (await req.json().catch(() => ({}))) as ImportBody;
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return json(400, {
        ok: false,
        code: "NO_ROWS",
        error: "No rows were provided for import.",
      });
    }

    const validation = rows.map((row, idx) => validateRow(row, idx + 2));
    const invalidRows = validation.filter((v) => v.errors.length > 0);

    if (invalidRows.length > 0) {
      return json(400, {
        ok: false,
        code: "VALIDATION_FAILED",
        error: "One or more rows failed validation.",
        validation: invalidRows,
      });
    }

    const intraFileErrors: { rowNumber: number; errors: string[] }[] = [];
    const seenNi = new Map<string, number>();
    const seenEmail = new Map<string, number>();
    const seenEmployeeNumber = new Map<string, number>();

    for (const item of validation) {
      const row = item.normalized;
      const errors: string[] = [];

      if (row.ni_number) {
        if (seenNi.has(row.ni_number)) {
          errors.push(`NI number ${row.ni_number} is duplicated in this CSV (also used on row ${seenNi.get(row.ni_number)}).`);
        } else {
          seenNi.set(row.ni_number, item.rowNumber);
        }
      }

      if (row.email) {
        if (seenEmail.has(row.email)) {
          errors.push(`Email ${row.email} is duplicated in this CSV (also used on row ${seenEmail.get(row.email)}).`);
        } else {
          seenEmail.set(row.email, item.rowNumber);
        }
      }

      if (row.employee_number) {
        if (seenEmployeeNumber.has(row.employee_number)) {
          errors.push(
            `Employee number ${row.employee_number} is duplicated in this CSV (also used on row ${seenEmployeeNumber.get(row.employee_number)}).`
          );
        } else {
          seenEmployeeNumber.set(row.employee_number, item.rowNumber);
        }
      }

      if (errors.length > 0) {
        intraFileErrors.push({ rowNumber: item.rowNumber, errors });
      }
    }

    if (intraFileErrors.length > 0) {
      return json(400, {
        ok: false,
        code: "DUPLICATES_IN_CSV",
        error: "The CSV contains duplicate NI numbers, emails, or employee numbers.",
        validation: intraFileErrors,
      });
    }

    for (const item of validation) {
      const conflicts = await findExistingConflictsForRow(gate.supabase, companyId, item.normalized);
      if (conflicts.length > 0) {
        return json(400, {
          ok: false,
          code: "ROW_ALREADY_EXISTS",
          error: `Row ${item.rowNumber} conflicts with an existing employee record.`,
          validation: [{ rowNumber: item.rowNumber, errors: conflicts }],
        });
      }
    }

    const results: any[] = [];

    for (const item of validation) {
      const row = item.normalized;

      const employee_id = randomUUID();

      const insertRow: Record<string, any> = {
        company_id: companyId,
        employee_id,
        employee_number: row.employee_number,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        job_title: row.job_title,
        hire_date: row.hire_date,
        start_date: row.start_date,
        date_of_birth: row.date_of_birth,
        employment_type: row.employment_type,
        annual_salary: row.annual_salary,
        hourly_rate: row.hourly_rate,
        hours_per_week: row.hours_per_week,
        ni_number: row.ni_number,
        national_insurance_number: row.ni_number,
        pay_frequency: row.pay_frequency,
        address: row.address,
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

      Object.keys(insertRow).forEach((k) => {
        if (insertRow[k] === undefined) delete insertRow[k];
      });

      const { data: employeeData, error: employeeError } = await gate.supabase
        .from("employees")
        .insert(insertRow)
        .select("employee_id, id, first_name, last_name, email")
        .single();

      if (employeeError) {
        return json(500, {
          ok: false,
          code: "EMPLOYEE_INSERT_FAILED",
          error: employeeError.message,
          rowNumber: item.rowNumber,
        });
      }

      const employeeUuid = String((employeeData as any)?.id || "").trim();
      if (!employeeUuid) {
        return json(500, {
          ok: false,
          code: "MISSING_EMPLOYEE_UUID",
          error: "Employee created but no employee UUID returned.",
          rowNumber: item.rowNumber,
        });
      }

      const starterRow = {
        employee_id: employeeUuid,
        company_id: companyId,
        p45_provided: row.p45_provided,
        starter_declaration: row.starter_declaration,
        student_loan_plan: row.student_loan_plan,
        postgraduate_loan: row.postgraduate_loan,
      };

      const { error: starterError } = await gate.supabase
        .from("employee_starters")
        .upsert(starterRow, { onConflict: "employee_id" });

      if (starterError) {
        return json(500, {
          ok: false,
          code: "STARTER_SAVE_FAILED",
          error: starterError.message,
          rowNumber: item.rowNumber,
        });
      }

      const starterDrivenUpdate = buildStarterDrivenEmployeeUpdate({
        p45Provided: Boolean(row.p45_provided),
        declaration: row.starter_declaration,
        studentLoanPlan: row.student_loan_plan,
        postgraduateLoan: Boolean(row.postgraduate_loan),
      });

      if (starterDrivenUpdate) {
        const { error: employeeSyncError } = await gate.supabase
          .from("employees")
          .update({
            tax_code: starterDrivenUpdate.tax_code,
            tax_code_basis: starterDrivenUpdate.tax_code_basis,
            student_loan_plan: starterDrivenUpdate.student_loan_plan,
            postgraduate_loan: starterDrivenUpdate.postgraduate_loan,
          })
          .eq("id", employeeUuid);

        if (employeeSyncError) {
          return json(500, {
            ok: false,
            code: "EMPLOYEE_SYNC_FAILED",
            error: employeeSyncError.message,
            rowNumber: item.rowNumber,
          });
        }
      }

      results.push({
        rowNumber: item.rowNumber,
        employee_id: (employeeData as any)?.employee_id ?? null,
        id: (employeeData as any)?.id ?? null,
        first_name: (employeeData as any)?.first_name ?? row.first_name,
        last_name: (employeeData as any)?.last_name ?? row.last_name,
        email: (employeeData as any)?.email ?? row.email,
      });
    }

    return json(201, {
      ok: true,
      importedCount: results.length,
      results,
    });
  } catch (err: any) {
    return json(500, {
      ok: false,
      code: "UNHANDLED",
      error: err?.message ?? "Unexpected server error",
    });
  }
}
