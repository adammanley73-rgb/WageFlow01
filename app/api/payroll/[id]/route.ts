// C:\Projects\wageflow01\app\api\payroll\[id]\route.ts

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    return v;
  }
  return null;
}

function toNumberSafe(v: any): number {
  const n =
    typeof v === "number"
      ? v
      : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function isUuid(v: any): boolean {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function normalizeAction(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

function isStaffRole(role: string) {
  return ["owner", "admin", "manager", "processor"].includes(
    String(role || "").toLowerCase()
  );
}

function isApproveRole(role: string) {
  return ["owner", "admin", "manager"].includes(String(role || "").toLowerCase());
}

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  const user = data?.user ?? null;
  if (error || !user) {
    return { ok: false as const, res: json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." }) };
  }

  return { ok: true as const, supabase, user };
}

async function getRoleForCompany(
  supabase: any,
  companyId: string,
  userId: string
): Promise<{ ok: true; role: string } | { ok: false; res: Response }> {
  const { data, error } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      res: json(500, {
        ok: false,
        code: "MEMBERSHIP_CHECK_FAILED",
        message: "Could not validate company membership.",
      }),
    };
  }

  if (!data) {
    return {
      ok: false,
      res: json(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "You do not have access to this company.",
      }),
    };
  }

  return { ok: true, role: String((data as any).role || "member") };
}

async function loadRun(supabase: any, runId: string) {
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }

  if (!data) {
    return { ok: false as const, status: 404, error: "Payroll run not found" };
  }

  return { ok: true as const, run: data as any };
}

async function loadAttachments(
  supabase: any,
  runId: string,
  companyId: string
) {
  const attempts: any[] = [];

  // Prefer binding to company_id if the column exists
  const a = await supabase
    .from("payroll_run_employees")
    .select("*")
    .eq("run_id", runId)
    .eq("company_id", companyId);

  if (!a.error) {
    return {
      ok: true as const,
      tableUsed: "payroll_run_employees",
      whereColumn: "run_id,company_id",
      rows: Array.isArray(a.data) ? a.data : [],
      attempts,
    };
  }

  attempts.push({
    table: "payroll_run_employees",
    col: "run_id,company_id",
    error: {
      code: a.error.code,
      message: a.error.message,
      details: a.error.details,
      hint: a.error.hint,
    },
  });

  // Fallback if company_id column does not exist
  const msg = String(a.error.message || "").toLowerCase();
  const missingCol =
    a.error.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));

  if (missingCol) {
    const b = await supabase
      .from("payroll_run_employees")
      .select("*")
      .eq("run_id", runId);

    if (!b.error) {
      return {
        ok: true as const,
        tableUsed: "payroll_run_employees",
        whereColumn: "run_id",
        rows: Array.isArray(b.data) ? b.data : [],
        attempts,
      };
    }

    attempts.push({
      table: "payroll_run_employees",
      col: "run_id",
      error: {
        code: b.error.code,
        message: b.error.message,
        details: b.error.details,
        hint: b.error.hint,
      },
    });
  }

  return { ok: false as const, tableUsed: null, whereColumn: null, rows: [], attempts };
}

function buildEmployeeRow(att: any, emp: any) {
  const employeeId = String(pickFirst(att?.employee_id, att?.employeeId, "") || "");

  const employeeName = String(
    pickFirst(
      emp?.full_name,
      emp?.fullName,
      emp?.name,
      [emp?.first_name, emp?.last_name].filter(Boolean).join(" ").trim(),
      [emp?.firstName, emp?.lastName].filter(Boolean).join(" ").trim(),
      "—"
    ) || "—"
  );

  const employeeNumber = String(
    pickFirst(
      emp?.employee_number,
      emp?.employeeNumber,
      emp?.payroll_number,
      emp?.payrollNumber,
      emp?.payroll_no,
      emp?.payrollNo,
      "—"
    ) || "—"
  );

  const email = String(pickFirst(emp?.email, emp?.work_email, emp?.workEmail, "—") || "—");

  const gross = toNumberSafe(pickFirst(att?.gross_pay, att?.grossPay, 0));
  const tax = toNumberSafe(pickFirst(att?.tax, 0));
  const employeeNi = toNumberSafe(
    pickFirst(att?.ni_employee, att?.employee_ni, att?.employeeNi, 0)
  );
  const pensionEmployee = toNumberSafe(pickFirst(att?.pension_employee, 0));
  const otherDeductions = toNumberSafe(pickFirst(att?.other_deductions, 0));
  const aoe = toNumberSafe(pickFirst(att?.attachment_of_earnings, 0));

  const deductions = Number((tax + employeeNi + pensionEmployee + otherDeductions + aoe).toFixed(2));
  const net = toNumberSafe(pickFirst(att?.net_pay, att?.netPay, gross - deductions));

  const safeId = String(pickFirst(att?.id, "") || "");
  const calcMode = String(pickFirst(att?.calc_mode, "uncomputed") || "uncomputed");

  return {
    id: safeId,
    employee_id: employeeId,
    employee_name: employeeName,
    employee_number: employeeNumber,
    email,
    gross: Number(gross.toFixed(2)),
    deductions,
    net: Number(net.toFixed(2)),
    calc_mode: calcMode,
  };
}

function deriveSeededMode(run: any, attachments: any[]): boolean {
  if (!Array.isArray(attachments) || attachments.length === 0) return true;

  const hasCalcMode = attachments.some((r: any) => r && typeof r === "object" && "calc_mode" in r);
  if (hasCalcMode) {
    return attachments.some(
      (r: any) => String(pickFirst(r?.calc_mode, "uncomputed")) !== "full"
    );
  }

  const runTax = toNumberSafe(pickFirst(run?.total_tax, 0));
  const runNi = toNumberSafe(pickFirst(run?.total_ni, 0));

  const allGrossOnly = attachments.every((r: any) => {
    const gross = toNumberSafe(pickFirst(r?.gross_pay, r?.grossPay, 0));
    const net = toNumberSafe(pickFirst(r?.net_pay, r?.netPay, gross));
    const tax = toNumberSafe(pickFirst(r?.tax, 0));
    const niEmp = toNumberSafe(pickFirst(r?.ni_employee, r?.employee_ni, 0));
    const niEr = toNumberSafe(pickFirst(r?.ni_employer, r?.employer_ni, 0));
    const sameNet = Math.abs(Number((net - gross).toFixed(2))) <= 0.01;
    return sameNet && tax === 0 && niEmp === 0 && niEr === 0;
  });

  return runTax === 0 && runNi === 0 && allGrossOnly;
}

function computeExceptions(attachments: any[], empById: Map<string, any>) {
  const items: any[] = [];
  let blockingCount = 0;
  let warningCount = 0;

  for (const att of attachments || []) {
    const employeeId = String(pickFirst(att?.employee_id, "") || "").trim();
    const gross = toNumberSafe(pickFirst(att?.gross_pay, att?.grossPay, 0));

    const emp = employeeId ? empById.get(employeeId) : null;

    const employeeName = String(
      pickFirst(
        emp?.full_name,
        emp?.fullName,
        emp?.name,
        [emp?.first_name, emp?.last_name].filter(Boolean).join(" ").trim(),
        [emp?.firstName, emp?.lastName].filter(Boolean).join(" ").trim(),
        "—"
      ) || "—"
    );

    const codes: string[] = [];

    if (gross <= 0) codes.push("GROSS_ZERO");

    const taxCode = pickFirst(emp?.tax_code, emp?.taxCode, emp?.taxcode, null);
    if (!taxCode) codes.push("MISSING_TAX_CODE");

    const niCat = pickFirst(emp?.ni_category, emp?.niCategory, emp?.ni_cat, emp?.niCat, null);
    if (!niCat) codes.push("MISSING_NI_CATEGORY");

    const blocking = codes.includes("MISSING_TAX_CODE") || codes.includes("MISSING_NI_CATEGORY");

    if (blocking) blockingCount++;
    else if (codes.length > 0) warningCount++;

    if (codes.length > 0) {
      items.push({
        employee_id: employeeId || null,
        employee_name: employeeName,
        codes,
        blocking,
      });
    }
  }

  return { items, blockingCount, warningCount, total: items.length };
}

async function getRunAndEmployees(
  supabase: any,
  runId: string,
  includeDebug: boolean
) {
  const debug: any = { runId, stage: {} };

  const runRes = await loadRun(supabase, runId);
  if (!runRes.ok) {
    debug.stage.runFetch = { ok: false, error: runRes.error };
    return { ok: false as const, status: runRes.status, error: runRes.error, debug: includeDebug ? debug : undefined };
  }

  const run = runRes.run;
  debug.stage.runFetch = { ok: true };

  const companyId = String(run?.company_id || "").trim();
  if (!companyId || !isUuid(companyId)) {
    return {
      ok: false as const,
      status: 500,
      error: "Payroll run is missing a valid company_id.",
      debug: includeDebug ? { ...debug, companyId } : undefined,
    };
  }

  const attachTry = await loadAttachments(supabase, runId, companyId);
  if (!attachTry.ok) {
    return {
      ok: false as const,
      status: 500,
      error: "Failed to load attached employees for payroll run.",
      debug: includeDebug ? { ...debug, attempts: attachTry.attempts } : undefined,
    };
  }

  const attachments = attachTry.rows || [];
  debug.stage.attachments = { ok: true, count: attachments.length };

  const employeeIds = Array.from(
    new Set(
      attachments
        .map((r: any) => String(pickFirst(r?.employee_id, "") || "").trim())
        .filter(Boolean)
    )
  );

  const { data: emps, error: empErr } = await supabase
    .from("employees")
    .select("*")
    .in("id", employeeIds)
    .eq("company_id", companyId);

  if (empErr) {
    return {
      ok: false as const,
      status: 500,
      error: "Failed to load employees for payroll run.",
      debug: includeDebug ? { ...debug, empErr: empErr.message } : undefined,
    };
  }

  const empRows = Array.isArray(emps) ? emps : [];
  const empById = new Map<string, any>();
  for (const e of empRows) {
    const id = String((e as any)?.id || "").trim();
    if (id) empById.set(id, e);
  }

  const employees = attachments.map((att: any) => {
    const employeeId = String(pickFirst(att?.employee_id, "") || "").trim();
    const emp = employeeId ? empById.get(employeeId) : null;
    return buildEmployeeRow(att, emp);
  });

  const totals = {
    gross: Number(toNumberSafe(pickFirst(run?.total_gross_pay, 0)).toFixed(2)),
    tax: Number(toNumberSafe(pickFirst(run?.total_tax, 0)).toFixed(2)),
    ni: Number(toNumberSafe(pickFirst(run?.total_ni, 0)).toFixed(2)),
    net: Number(toNumberSafe(pickFirst(run?.total_net_pay, 0)).toFixed(2)),
  };

  const seededMode = deriveSeededMode(run, attachments);
  const exceptions = computeExceptions(attachments, empById);

  return {
    ok: true as const,
    run: { ...(run as any), company_id: companyId },
    employees,
    totals,
    seededMode,
    exceptions,
    attachmentsMeta: { tableUsed: attachTry.tableUsed, whereColumn: attachTry.whereColumn },
    debug: includeDebug ? debug : undefined,
  };
}

async function fetchRunStatusAndFlag(supabase: any, runId: string, companyId: string) {
  const attempts: any[] = [];

  const a = await supabase
    .from("payroll_runs")
    .select("id,company_id,status,attached_all_due_employees")
    .eq("id", runId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!a.error && a.data) {
    return {
      ok: true,
      run: a.data,
      hasAttachedFlag: true,
      attachedFlag: (a.data as any)?.attached_all_due_employees,
      attempts,
    };
  }

  if (a.error) {
    attempts.push({
      cols: "id,company_id,status,attached_all_due_employees",
      error: { code: a.error.code, message: a.error.message, details: a.error.details, hint: a.error.hint },
    });
  }

  const msg = String(a.error?.message || "").toLowerCase();
  const missingCol =
    a.error?.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));

  if (missingCol) {
    const b = await supabase
      .from("payroll_runs")
      .select("id,company_id,status")
      .eq("id", runId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!b.error && b.data) {
      return { ok: true, run: b.data, hasAttachedFlag: false, attachedFlag: undefined, attempts };
    }

    if (b.error) {
      attempts.push({
        cols: "id,company_id,status",
        error: { code: b.error.code, message: b.error.message, details: b.error.details, hint: b.error.hint },
      });
    }
  }

  return { ok: false, run: null, hasAttachedFlag: false, attachedFlag: undefined, attempts };
}

async function restoreAttachedAllDueEmployeesIfNeeded(
  supabase: any,
  runId: string,
  companyId: string,
  beforeValue: any,
  afterValue: any,
  enabled: boolean
) {
  if (!enabled) return { ok: true, restored: false, reason: "flag not present" };

  const before = beforeValue === null || beforeValue === undefined ? null : Boolean(beforeValue);
  const after = afterValue === null || afterValue === undefined ? null : Boolean(afterValue);

  if (before === after) return { ok: true, restored: false, reason: "no change" };

  const { error } = await supabase
    .from("payroll_runs")
    .update({ attached_all_due_employees: before })
    .eq("id", runId)
    .eq("company_id", companyId);

  if (error) {
    return { ok: false, restored: false, error: { code: error.code, message: error.message, details: error.details, hint: error.hint } };
  }

  return { ok: true, restored: true, before, after };
}

async function refreshRunTotalsFromAttachments(supabase: any, runId: string, companyId: string) {
  const attachTry = await loadAttachments(supabase, runId, companyId);
  if (!attachTry.ok) {
    return { ok: false, status: 500, error: "Failed to read payroll_run_employees for totals refresh.", debug: { attempts: attachTry.attempts } };
  }

  const rr = Array.isArray(attachTry.rows) ? attachTry.rows : [];

  const grossSum = rr.reduce(
    (a: number, x: any) => a + toNumberSafe(pickFirst(x?.gross_pay, x?.grossPay, 0)),
    0
  );
  const netSum = rr.reduce(
    (a: number, x: any) => a + toNumberSafe(pickFirst(x?.net_pay, x?.netPay, 0)),
    0
  );
  const taxSum = rr.reduce((a: number, x: any) => a + toNumberSafe(pickFirst(x?.tax, 0)), 0);
  const niSum = rr.reduce(
    (a: number, x: any) => a + toNumberSafe(pickFirst(x?.ni_employee, x?.employee_ni, 0)),
    0
  );

  const { error: runUpErr } = await supabase
    .from("payroll_runs")
    .update({
      total_gross_pay: Number(grossSum.toFixed(2)),
      total_net_pay: Number(netSum.toFixed(2)),
      total_tax: Number(taxSum.toFixed(2)),
      total_ni: Number(niSum.toFixed(2)),
    })
    .eq("id", runId)
    .eq("company_id", companyId);

  if (runUpErr) {
    return { ok: false, status: 500, error: runUpErr.message };
  }

  return { ok: true, status: 200, tableUsed: "payroll_run_employees", whereColumn: attachTry.whereColumn };
}

async function setGrossOnlyCalcForRun(supabase: any, runId: string, companyId: string) {
  const attachTry = await loadAttachments(supabase, runId, companyId);
  if (!attachTry.ok) {
    return { ok: false, status: 500, error: "Failed to load payroll_run_employees for gross-only recalculation.", debug: { attempts: attachTry.attempts } };
  }

  const rr = Array.isArray(attachTry.rows) ? attachTry.rows : [];

  for (const r of rr) {
    const rowId = String(pickFirst(r?.id, "") || "").trim();
    if (!rowId) continue;

    const gross = toNumberSafe(pickFirst(r?.gross_pay, r?.grossPay, 0));
    const otherDeductions = toNumberSafe(pickFirst(r?.other_deductions, 0));
    const pensionEmployee = toNumberSafe(pickFirst(r?.pension_employee, 0));
    const aoe = toNumberSafe(pickFirst(r?.attachment_of_earnings, 0));

    let net = 0;
    if (gross > 0) {
      net = gross - otherDeductions - pensionEmployee - aoe;
      if (!Number.isFinite(net) || net < 0) net = 0;
    }

    const patch: any = {
      calc_mode: "gross_only",
      net_pay: Number(net.toFixed(2)),
      tax: 0,
      ni_employee: 0,
      ni_employer: 0,
    };

    if (r && typeof r === "object" && "employee_ni" in r) patch.employee_ni = 0;
    if (r && typeof r === "object" && "employer_ni" in r) patch.employer_ni = 0;

    const { error: upErr } = await supabase
      .from("payroll_run_employees")
      .update(patch)
      .eq("id", rowId)
      .eq("run_id", runId);

    if (upErr) {
      return {
        ok: false,
        status: 500,
        error: `Failed to update gross-only calc for row ${rowId}: ${upErr.message}`,
      };
    }
  }

  return { ok: true, status: 200 };
}

async function updateRunEmployeeRow(
  supabase: any,
  runId: string,
  rowId: string,
  gross: number,
  deductions: number,
  net: number
) {
  const patch = {
    gross_pay: gross,
    net_pay: net,
    other_deductions: deductions,
    manual_override: true,
  };

  const { error } = await supabase
    .from("payroll_run_employees")
    .update(patch)
    .eq("id", rowId)
    .eq("run_id", runId);

  if (!error) return { ok: true as const };

  return {
    ok: false as const,
    error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
  };
}

async function tryComputeFullViaRpc(supabase: any, runId: string) {
  const attempts: any[] = [];

  const candidates = [
    { fn: "payroll_run_compute_full", args: { p_run_id: runId } },
    { fn: "compute_payroll_run_full", args: { run_id: runId } },
    { fn: "payroll_run_compute", args: { run_id: runId, mode: "full" } },
    { fn: "compute_payroll_run", args: { run_id: runId, mode: "full" } },
    { fn: "payroll_compute_run_full", args: { run_id: runId } },
    { fn: "payroll_compute_run", args: { run_id: runId } },
    { fn: "run_compute_full", args: { run_id: runId } },
    { fn: "compute_run_full", args: { run_id: runId } },
    { fn: "wf_compute_payroll_run", args: { run_id: runId, compute_mode: "full" } },
  ];

  for (const c of candidates) {
    const { data, error } = await supabase.rpc(c.fn, c.args);
    if (!error) return { ok: true, via: { fn: c.fn, args: c.args }, data, attempts };

    attempts.push({
      fn: c.fn,
      args: c.args,
      error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
    });
  }

  return {
    ok: false,
    status: 501,
    error: "No Supabase RPC function was found to compute a payroll run in full.",
    attempts: attempts.slice(0, 12),
  };
}

export async function GET(req: Request, { params }: Ctx) {
  const resolvedParams = await params;
  const id = String(resolvedParams?.id || "").trim();

  if (!id) return json(400, { ok: false, error: "Missing payroll run id" });
  if (!isUuid(id)) return json(400, { ok: false, error: "Invalid payroll run id" });

  const gate = await requireUser();
  if (!gate.ok) return gate.res;

  const includeDebug = new URL(req.url).searchParams.get("debug") === "1";

  const supabase = gate.supabase;

  const result = await getRunAndEmployees(supabase, id, includeDebug);
  if (!result.ok) {
    return json(result.status || 500, {
      ok: false,
      debugSource: "payroll_run_route_rls_v1",
      error: result.error,
      ...(includeDebug ? { debug: result.debug } : {}),
    });
  }

  // membership check for role, used only to control debug detail and PATCH behaviour later
  const roleRes = await getRoleForCompany(supabase, String((result.run as any).company_id), gate.user.id);
  const role = roleRes.ok ? roleRes.role : "member";

  const allowDebug = includeDebug && ["owner", "admin"].includes(role.toLowerCase());

  return json(200, {
    ok: true,
    debugSource: "payroll_run_route_rls_v1",
    run: result.run,
    employees: result.employees,
    totals: result.totals,
    seededMode: result.seededMode,
    exceptions: result.exceptions,
    attachmentsMeta: result.attachmentsMeta,
    ...(allowDebug ? { debug: result.debug } : {}),
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const resolvedParams = await params;
  const id = String(resolvedParams?.id || "").trim();

  if (!id) return json(400, { ok: false, error: "Missing payroll run id" });
  if (!isUuid(id)) return json(400, { ok: false, error: "Invalid payroll run id" });

  const gate = await requireUser();
  if (!gate.ok) return gate.res;

  const supabase = gate.supabase;
  const userId = gate.user.id;

  const body = await req.json().catch(() => ({}));
  const action = normalizeAction(body?.action);

  const runRes = await loadRun(supabase, id);
  if (!runRes.ok) return json(runRes.status, { ok: false, debugSource: "payroll_run_route_rls_v1", error: runRes.error });

  const run = runRes.run;
  const companyId = String(run?.company_id || "").trim();
  if (!companyId || !isUuid(companyId)) {
    return json(500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: "Payroll run is missing a valid company_id." });
  }

  const roleRes = await getRoleForCompany(supabase, companyId, userId);
  if (!roleRes.ok) return roleRes.res;
  const role = roleRes.role;

  if (!isStaffRole(role)) {
    return json(403, { ok: false, code: "INSUFFICIENT_ROLE", message: "You do not have permission to modify payroll runs." });
  }

  const isComputeFull =
    action === "compute_full" ||
    action === "compute-full" ||
    action === "full_compute" ||
    action === "fullcompute" ||
    action === "compute";

  if (action === "recalculate") {
    if (String(run?.status || "").toLowerCase() !== "draft") {
      return json(409, { ok: false, debugSource: "payroll_run_route_rls_v1", error: "Recalculate is only allowed for draft runs." });
    }

    const pre = await fetchRunStatusAndFlag(supabase, id, companyId);
    if (!pre.ok || !pre.run) {
      return json(500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v1",
        error: "Failed to fetch payroll run status before recalculation.",
        debug: { attempts: pre.attempts || [] },
      });
    }

    const rec: any = await setGrossOnlyCalcForRun(supabase, id, companyId);
    if (!rec?.ok) {
      return json(rec?.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: rec?.error || "Recalculate failed", ...(rec?.debug ? { debug: rec.debug } : {}) });
    }

    const totalsRefresh: any = await refreshRunTotalsFromAttachments(supabase, id, companyId);
    if (!totalsRefresh?.ok) {
      return json(totalsRefresh?.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: totalsRefresh?.error || "Totals refresh failed" });
    }

    const postFlag = await fetchRunStatusAndFlag(supabase, id, companyId);
    const flagFix = await restoreAttachedAllDueEmployeesIfNeeded(
      supabase,
      id,
      companyId,
      pre.attachedFlag,
      postFlag?.attachedFlag,
      Boolean(pre.hasAttachedFlag)
    );

    const result = await getRunAndEmployees(supabase, id, false);
    if (!result.ok) {
      return json(result.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: result.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v1",
      action: "recalculate",
      totalsRefreshOk: true,
      attachmentsMeta: result.attachmentsMeta,
      sideEffects: pre.hasAttachedFlag
        ? {
            attached_all_due_employees: {
              before: pre.attachedFlag,
              after: postFlag?.attachedFlag,
              restored: Boolean(flagFix?.restored),
            },
          }
        : undefined,
      run: result.run,
      employees: result.employees,
      totals: result.totals,
      seededMode: result.seededMode,
      exceptions: result.exceptions,
    });
  }

  if (isComputeFull) {
    if (String(run?.status || "").toLowerCase() !== "draft") {
      return json(409, { ok: false, debugSource: "payroll_run_route_rls_v1", error: "Full compute is only allowed for draft runs.", runStatus: String(run?.status || "").toLowerCase() });
    }

    const pre = await getRunAndEmployees(supabase, id, true);
    if (!pre.ok) {
      return json(pre.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: pre.error, debug: pre.debug });
    }

    const blockingCount = Number(pre?.exceptions?.blockingCount ?? 0);
    if (blockingCount > 0) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v1",
        error: "Full compute blocked. Fix blocking exceptions first.",
        exceptions: pre.exceptions,
      });
    }

    const hasEmployees = Array.isArray(pre?.employees) && pre.employees.length > 0;
    if (!hasEmployees) {
      return json(409, { ok: false, debugSource: "payroll_run_route_rls_v1", error: "Full compute blocked. No attached employees were found for this run." });
    }

    const flagPre = await fetchRunStatusAndFlag(supabase, id, companyId);

    const rpc: any = await tryComputeFullViaRpc(supabase, id);
    if (!rpc?.ok) {
      return json(rpc?.status || 501, {
        ok: false,
        debugSource: "payroll_run_route_rls_v1",
        action: "compute_full",
        error: rpc?.error || "Full compute RPC failed",
        attempts: rpc?.attempts || [],
      });
    }

    const totalsRefresh: any = await refreshRunTotalsFromAttachments(supabase, id, companyId);

    const flagPost = await fetchRunStatusAndFlag(supabase, id, companyId);
    const flagFix = await restoreAttachedAllDueEmployeesIfNeeded(
      supabase,
      id,
      companyId,
      flagPre?.attachedFlag,
      flagPost?.attachedFlag,
      Boolean(flagPre?.hasAttachedFlag)
    );

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: post.error });
    }

    if (post.ok && Boolean(post.seededMode)) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v1",
        action: "compute_full",
        error:
          "Full compute attempted, but the run still looks seeded (not all employee rows are calc_mode='full'). Ensure your DB compute function writes tax, NI, net, and calc_mode='full' back to payroll_run_employees.",
        computeVia: rpc?.via,
        totalsRefreshOk: Boolean(totalsRefresh?.ok),
        seededMode: true,
        run: post.run,
        employees: post.employees,
        totals: post.totals,
        exceptions: post.exceptions,
      });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v1",
      action: "compute_full",
      computeVia: rpc?.via,
      totalsRefreshOk: Boolean(totalsRefresh?.ok),
      attachmentsMeta: post.attachmentsMeta,
      sideEffects: flagPre?.hasAttachedFlag
        ? {
            attached_all_due_employees: {
              before: flagPre?.attachedFlag,
              after: flagPost?.attachedFlag,
              restored: Boolean(flagFix?.restored),
            },
          }
        : undefined,
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  if (action === "approve") {
    if (!isApproveRole(role)) {
      return json(403, { ok: false, code: "INSUFFICIENT_ROLE", message: "You do not have permission to approve payroll runs." });
    }

    const pre = await getRunAndEmployees(supabase, id, true);
    if (!pre.ok) {
      return json(pre.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: pre.error, debug: pre.debug });
    }

    const seededMode = Boolean(pre?.seededMode);
    const blockingCount = Number(pre?.exceptions?.blockingCount ?? 0);

    if (seededMode) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v1",
        error: "Approval blocked. This run is not fully calculated. Run full compute first.",
        seededMode: true,
        exceptions: pre.exceptions,
      });
    }

    if (blockingCount > 0) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v1",
        error: "Approval blocked. Fix blocking exceptions first.",
        seededMode: false,
        exceptions: pre.exceptions,
      });
    }

    const { error: upErr } = await supabase
      .from("payroll_runs")
      .update({ status: "approved" })
      .eq("id", id)
      .eq("company_id", companyId);

    if (upErr) {
      return json(500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: upErr.message });
    }

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: post.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v1",
      action: "approve",
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return json(400, {
      ok: false,
      error: "Nothing to update. Expected { items: [...] } or { action: 'approve'|'recalculate'|'compute_full' }",
    });
  }

  const results: any[] = [];

  for (const it of items) {
    const rowId = String(it?.id || "").trim();
    if (!rowId) continue;

    const gross = Number(toNumberSafe(it?.gross).toFixed(2));
    const deductions = Number(toNumberSafe(it?.deductions).toFixed(2));
    const net = Number(toNumberSafe(it?.net).toFixed(2));

    const r = await updateRunEmployeeRow(supabase, id, rowId, gross, deductions, net);
    results.push({ id: rowId, ok: r.ok, ...(r.ok ? {} : { error: (r as any).error }) });
  }

  const totals: any = await refreshRunTotalsFromAttachments(supabase, id, companyId);
  if (!totals?.ok) {
    return json(totals?.status || 500, {
      ok: false,
      debugSource: "payroll_run_route_rls_v1",
      error: `Updated rows, but failed to refresh totals: ${totals?.error || "unknown error"}`,
      updateResults: results,
    });
  }

  const result = await getRunAndEmployees(supabase, id, false);
  if (!result.ok) {
    return json(result.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v1", error: result.error, updateResults: results });
  }

  return json(200, {
    ok: true,
    debugSource: "payroll_run_route_rls_v1",
    run: result.run,
    employees: result.employees,
    totals: result.totals,
    seededMode: result.seededMode,
    exceptions: result.exceptions,
    updateResults: results,
  });
}