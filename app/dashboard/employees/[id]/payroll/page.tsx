/* @ts-nocheck */
/* C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\payroll\page.tsx */

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function createAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("employee payroll history: missing Supabase env");
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

function looksTruncatedId(s: string) {
  const v = String(s || "").trim();
  if (!v) return false;
  if (v.includes("…")) return true;
  if (v.length < 30) return true;
  // common “copied from UI” truncated patterns
  if (v.endsWith("-") && v.split("-").length < 5) return true;
  return false;
}

function safeStr(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}

function fmtDate(d: any) {
  const s = String(d || "").trim();
  if (!s) return "—";
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
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(num);
}

function pillClass(base: string) {
  return `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${base}`;
}

function statusPill(statusRaw: any) {
  const s = String(statusRaw ?? "draft").toLowerCase().trim();

  if (s === "completed") return pillClass("border-emerald-300 bg-emerald-100 text-emerald-800");
  if (s === "rti_submitted") return pillClass("border-sky-300 bg-sky-100 text-sky-800");
  if (s === "approved") return pillClass("border-indigo-300 bg-indigo-100 text-indigo-800");
  if (s === "processing") return pillClass("border-amber-300 bg-amber-100 text-amber-900");

  return pillClass("border-neutral-300 bg-neutral-100 text-neutral-800");
}

function extractPeriod(run: any) {
  const start =
    run?.period_start ??
    run?.start_date ??
    run?.period_from ??
    run?.from_date ??
    run?.from ??
    null;

  const end =
    run?.period_end ??
    run?.end_date ??
    run?.period_to ??
    run?.to_date ??
    run?.to ??
    null;

  if (!start && !end) return "—";
  if (start && end) return `${fmtDate(start)} to ${fmtDate(end)}`;
  return start ? `From ${fmtDate(start)}` : `To ${fmtDate(end)}`;
}

function isMissingRelation(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "");
  return (
    code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("not found")
  );
}

function isMissingColumn(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "");
  return code === "42703" || (msg.includes("column") && msg.includes("does not exist"));
}

async function queryEmployee(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  whereCol: string,
  whereVal: string,
  useCompanyFilter: boolean
) {
  let q = supabase.from("employees").select("*");

  if (useCompanyFilter) {
    q = q.eq("company_id", companyId);
  }

  const { data, error } = await q.eq(whereCol, whereVal).maybeSingle();

  return { employee: (data as any) ?? null, error: error ?? null };
}

async function loadEmployeeForCompany(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  routeId: string
): Promise<{ employee: any | null; error: any | null }> {
  const rid = String(routeId || "").trim();
  if (!rid) return { employee: null, error: null };

  const attempts: Array<{ col: string; val: string; companyFilter: boolean }> = [];

  // Prefer id lookup if route param is a UUID
  if (isUuid(rid)) {
    attempts.push({ col: "id", val: rid, companyFilter: true });
    attempts.push({ col: "employee_id", val: rid, companyFilter: true });
  } else {
    attempts.push({ col: "employee_id", val: rid, companyFilter: true });
  }

  // Fallback: try without company filter if demo schema lacks company_id
  if (isUuid(rid)) {
    attempts.push({ col: "id", val: rid, companyFilter: false });
    attempts.push({ col: "employee_id", val: rid, companyFilter: false });
  } else {
    attempts.push({ col: "employee_id", val: rid, companyFilter: false });
  }

  let lastErr: any | null = null;

  for (const a of attempts) {
    const { employee, error } = await queryEmployee(supabase, companyId, a.col, a.val, a.companyFilter);

    if (error) {
      lastErr = error;

      // If the WHERE column is missing, move to the next strategy
      if (isMissingColumn(error)) continue;

      // If company filter column is missing, try again without it
      if (a.companyFilter && String(error?.message || "").toLowerCase().includes("company_id") && isMissingColumn(error)) {
        continue;
      }

      // Other errors, continue but keep lastErr for display
      continue;
    }

    if (employee) {
      // If we had to drop the company filter, still try to enforce it when possible
      if (a.companyFilter === false && employee?.company_id && String(employee.company_id) !== String(companyId)) {
        lastErr = { message: "Employee found but does not belong to the active company." };
        continue;
      }

      return { employee, error: null };
    }
  }

  return { employee: null, error: lastErr };
}

async function loadRuns(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string
): Promise<{ runs: any[]; error: any | null }> {
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);

  return { runs: (data as any[]) ?? [], error: error ?? null };
}

async function findEmployeeTotalsInRun(
  supabase: ReturnType<typeof createAdminClient>,
  runId: string,
  candidateEmployeeIds: string[]
): Promise<{
  found: boolean;
  gross: number | null;
  deductions: number | null;
  net: number | null;
  source: string | null;
  error: any | null;
  tableMissing: boolean;
}> {
  const ids = (candidateEmployeeIds || []).filter(Boolean);
  if (!ids.length) {
    return {
      found: false,
      gross: null,
      deductions: null,
      net: null,
      source: null,
      error: null,
      tableMissing: false,
    };
  }

  // Strategy A: payroll_run_items
  {
    const { data, error } = await supabase
      .from("payroll_run_items")
      .select("*")
      .eq("run_id", runId)
      .in("employee_id", ids)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error)) {
        return {
          found: false,
          gross: null,
          deductions: null,
          net: null,
          source: null,
          error,
          tableMissing: true,
        };
      }
    } else if (data) {
      const gross = data.gross ?? data.total_gross ?? data.gross_pay ?? null;
      const deductions = data.deductions ?? data.total_deductions ?? data.deduction_total ?? null;
      const net = data.net ?? data.net_pay ?? data.total_net ?? null;

      return {
        found: true,
        gross: gross !== null ? Number(gross) : null,
        deductions: deductions !== null ? Number(deductions) : null,
        net: net !== null ? Number(net) : null,
        source: "payroll_run_items",
        error: null,
        tableMissing: false,
      };
    }
  }

  // Strategy B: payroll_run_employees
  {
    const { data, error } = await supabase
      .from("payroll_run_employees")
      .select("*")
      .eq("run_id", runId)
      .in("employee_id", ids)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error)) {
        return {
          found: false,
          gross: null,
          deductions: null,
          net: null,
          source: null,
          error,
          tableMissing: true,
        };
      }
      return {
        found: false,
        gross: null,
        deductions: null,
        net: null,
        source: null,
        error,
        tableMissing: false,
      };
    }

    if (data) {
      const gross = data.gross ?? data.total_gross ?? data.gross_pay ?? null;
      const deductions = data.deductions ?? data.total_deductions ?? data.deduction_total ?? null;
      const net = data.net ?? data.net_pay ?? data.total_net ?? null;

      return {
        found: true,
        gross: gross !== null ? Number(gross) : null,
        deductions: deductions !== null ? Number(deductions) : null,
        net: net !== null ? Number(net) : null,
        source: "payroll_run_employees",
        error: null,
        tableMissing: false,
      };
    }
  }

  return {
    found: false,
    gross: null,
    deductions: null,
    net: null,
    source: null,
    error: null,
    tableMissing: false,
  };
}

export default async function EmployeePayrollHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  const jar = cookies();

  const activeCompanyId =
    jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;

  if (!activeCompanyId || !isUuid(String(activeCompanyId))) {
    redirect("/dashboard/companies");
  }

  const routeId = String(params?.id || "").trim();
  if (!routeId) redirect("/dashboard/employees");

  const supabase = createAdminClient();

  const { employee, error: empErr } = await loadEmployeeForCompany(
    supabase,
    String(activeCompanyId),
    routeId
  );

  if (!employee) {
    const truncatedHint = looksTruncatedId(routeId);

    return (
      <PageTemplate title="Payroll history" currentSection="employees">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
            <div className="px-6 py-10 text-center bg-white">
              <div className="text-2xl font-semibold text-neutral-900">Employee Not Found</div>

              <div className="mt-2 text-sm text-neutral-700">
                The employee with ID "{routeId}" could not be found for the active company.
              </div>

              {truncatedHint ? (
                <div className="mt-3 text-sm text-neutral-700">
                  This link looks truncated. Open the employee from the Employees list, then use the Payroll history link from inside the app.
                </div>
              ) : null}

              {empErr ? (
                <div className="mt-3 text-xs text-red-700">
                  {String(empErr?.message || "Lookup error")}
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

  const empKey = String(employee.employee_id || employee.id || routeId);

  const fullName =
    `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() || "Unnamed employee";

  const candidateEmployeeIds: string[] = [];
  if (employee.id && isUuid(employee.id)) candidateEmployeeIds.push(employee.id);
  if (employee.employee_id && isUuid(employee.employee_id)) candidateEmployeeIds.push(employee.employee_id);
  if (routeId && isUuid(routeId) && !candidateEmployeeIds.includes(routeId)) candidateEmployeeIds.push(routeId);

  const payslipEmployeeId =
    (employee.id && isUuid(employee.id) ? employee.id : null) ||
    (employee.employee_id ? employee.employee_id : routeId);

  const { runs, error: runsErr } = await loadRuns(supabase, String(activeCompanyId));

  let tableMissing = false;
  let tableErr: any | null = null;

  const rows: Array<{
    run_id: string;
    run_name: string | null;
    status: string | null;
    created_at: string | null;
    period: string;
    gross: number | null;
    deductions: number | null;
    net: number | null;
    source: string | null;
  }> = [];

  if (runsErr) {
    tableMissing = isMissingRelation(runsErr);
    tableErr = runsErr;
  } else if (runs?.length) {
    for (const run of runs) {
      const runId = String(run?.id || "").trim();
      if (!runId) continue;

      const res = await findEmployeeTotalsInRun(supabase, runId, candidateEmployeeIds);

      if (res.tableMissing) {
        tableMissing = true;
        tableErr = res.error;
        break;
      }

      if (res.error) {
        tableErr = res.error;
      }

      if (res.found) {
        rows.push({
          run_id: runId,
          run_name: run?.run_name ?? run?.name ?? null,
          status: run?.status ?? null,
          created_at: run?.created_at ?? null,
          period: extractPeriod(run),
          gross: res.gross,
          deductions: res.deductions,
          net: res.net,
          source: res.source,
        });
      }
    }
  }

  const showNotWired = Boolean(runsErr) || tableMissing;
  const noHistory = !showNotWired && rows.length === 0;

  return (
    <PageTemplate title="Payroll history" currentSection="employees">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-lg sm:text-xl text-[#0f3c85] truncate">
                <span className="font-bold">{fullName}</span>
                {employee.employee_number ? (
                  <span className="text-neutral-700"> · Emp {employee.employee_number}</span>
                ) : null}
              </div>
              <div className="mt-2 text-sm text-neutral-700">
                Shows payroll runs where this employee has a calculated row.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/employees/${empKey}`}
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
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Runs</div>
            <div className="text-xs text-neutral-700">
              Run name, period, status, gross, deductions, net, and a payslip link.
            </div>
          </div>

          {showNotWired ? (
            <div className="p-6 bg-white">
              <div className="text-base font-semibold text-neutral-900">Payroll history is not wired yet</div>
              <div className="mt-2 text-sm text-neutral-700">
                This route is now correct and styled properly. If you see this message, your payroll tables or columns do not
                match the expected names (payroll_runs plus either payroll_run_items or payroll_run_employees).
              </div>
              {tableErr ? (
                <div className="mt-3 text-xs text-red-700">
                  {String(tableErr?.message || tableErr)}
                </div>
              ) : null}
              <div className="mt-6">
                <Link
                  href={`/dashboard/employees/${empKey}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68]"
                >
                  Back to employee
                </Link>
              </div>
            </div>
          ) : noHistory ? (
            <div className="p-6 bg-white">
              <div className="text-base font-semibold text-neutral-900">No runs yet</div>
              <div className="mt-2 text-sm text-neutral-700">
                This employee has not appeared in any payroll run items yet. Once you run payroll with them attached, it will show here.
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/payroll"
                  className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68]"
                >
                  Go to Payroll
                </Link>
                <Link
                  href={`/dashboard/employees/${empKey}`}
                  className="inline-flex items-center justify-center rounded-full border border-neutral-400 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-100"
                >
                  Back to employee
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 border-b-2 border-neutral-300">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-neutral-900">Run</th>
                    <th className="text-left px-4 py-3 font-semibold text-neutral-900">Period</th>
                    <th className="text-left px-4 py-3 font-semibold text-neutral-900">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-neutral-900">Gross</th>
                    <th className="text-right px-4 py-3 font-semibold text-neutral-900">Deductions</th>
                    <th className="text-right px-4 py-3 font-semibold text-neutral-900">Net</th>
                    <th className="text-right px-4 py-3 font-semibold text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.run_id} className="border-b-2 border-neutral-300">
                      <td className="px-4 py-3 text-neutral-900">
                        <div className="font-semibold">{safeStr(row.run_name)}</div>
                        <div className="text-xs text-neutral-600">Created {fmtDate(row.created_at)}</div>
                        {row.source ? (
                          <div className="text-[11px] text-neutral-500">Source: {row.source}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">{safeStr(row.period)}</td>
                      <td className="px-4 py-3">
                        <span className={statusPill(row.status)}>{safeStr(row.status || "draft")}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-900">{fmtMoney(row.gross)}</td>
                      <td className="px-4 py-3 text-right text-neutral-900">{fmtMoney(row.deductions)}</td>
                      <td className="px-4 py-3 text-right text-neutral-900">{fmtMoney(row.net)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2 justify-end">
                          <Link
                            href={`/dashboard/payroll/${row.run_id}`}
                            className="inline-flex items-center justify-center rounded-full border border-neutral-400 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
                          >
                            View run
                          </Link>
                          <Link
                            href={`/dashboard/payroll/${row.run_id}/payslip/${payslipEmployeeId}`}
                            className="inline-flex items-center justify-center rounded-full bg-neutral-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                          >
                            Payslip
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-4 py-3 text-xs text-neutral-600 bg-white">
                Note: if your totals live in a different table, this will show “No runs yet” until we map the correct table and columns.
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}
