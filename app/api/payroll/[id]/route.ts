/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\payroll\[id]\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

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

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin env missing: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function tryAttachments(supabase: any, runId: string) {
  const attempts: any[] = [];
  const tables = ["payroll_run_employees", "pay_run_employees"];
  const cols = ["run_id", "payroll_run_id", "runId", "pay_run_id"];

  for (const table of tables) {
    for (const col of cols) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(col, runId);

      if (!error) {
        return {
          ok: true,
          tableUsed: table,
          whereColumn: col,
          rows: Array.isArray(data) ? data : [],
          attempts,
        };
      }

      attempts.push({
        table,
        col,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      });

      const msg = String(error?.message || "").toLowerCase();
      const isMissingTable =
        error?.code === "42P01" || msg.includes("does not exist");
      const isMissingColumn =
        error?.code === "42703" ||
        (msg.includes("column") && msg.includes("does not exist"));

      if (isMissingTable) break;
      if (isMissingColumn) continue;

      continue;
    }
  }

  return { ok: false, tableUsed: null, whereColumn: null, rows: [], attempts };
}

function buildEmployeeRow(att: any, emp: any) {
  const employeeId = String(
    pickFirst(att?.employee_id, att?.employeeId, "") || ""
  );

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

  const email = String(
    pickFirst(emp?.email, emp?.work_email, emp?.workEmail, "—") || "—"
  );

  const gross = toNumberSafe(pickFirst(att?.gross_pay, att?.grossPay, 0));
  const tax = toNumberSafe(pickFirst(att?.tax, 0));

  const employeeNi = toNumberSafe(
    pickFirst(att?.ni_employee, att?.employee_ni, att?.employeeNi, 0)
  );

  const pensionEmployee = toNumberSafe(pickFirst(att?.pension_employee, 0));
  const otherDeductions = toNumberSafe(pickFirst(att?.other_deductions, 0));
  const aoe = toNumberSafe(pickFirst(att?.attachment_of_earnings, 0));

  const deductions = Number(
    (tax + employeeNi + pensionEmployee + otherDeductions + aoe).toFixed(2)
  );

  const net = toNumberSafe(
    pickFirst(att?.net_pay, att?.netPay, gross - deductions)
  );

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

  const hasCalcMode = attachments.some(
    (r: any) => r && typeof r === "object" && "calc_mode" in r
  );
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

    const niCat = pickFirst(emp?.ni_category, emp?.niCategory, emp?.ni_cat, null);
    if (!niCat) codes.push("MISSING_NI_CATEGORY");

    if (codes.length === 0) continue;

    const blocking =
      codes.includes("MISSING_TAX_CODE") || codes.includes("MISSING_NI_CATEGORY");
    if (blocking) blockingCount += 1;
    else warningCount += 1;

    items.push({
      employee_id: employeeId,
      employee_name: employeeName,
      gross: Number(gross.toFixed(2)),
      severity: blocking ? "block" : "warn",
      codes,
    });
  }

  return { items, blockingCount, warningCount, total: items.length };
}

async function getRunAndEmployees(
  supabase: any,
  runId: string,
  includeDebug: boolean
) {
  const debug: any = { runId, stage: {} };

  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError) {
    debug.stage.runFetch = {
      ok: false,
      code: runError.code,
      message: runError.message,
    };
    return {
      ok: false,
      status: 404,
      error: "Payroll run not found",
      debug: includeDebug ? debug : undefined,
    };
  }

  debug.stage.runFetch = { ok: true };

  const totals = {
    gross: Number(toNumberSafe(pickFirst(run?.total_gross_pay, 0)).toFixed(2)),
    tax: Number(toNumberSafe(pickFirst(run?.total_tax, 0)).toFixed(2)),
    ni: Number(toNumberSafe(pickFirst(run?.total_ni, 0)).toFixed(2)),
    net: Number(toNumberSafe(pickFirst(run?.total_net_pay, 0)).toFixed(2)),
  };

  const attachTry = await tryAttachments(supabase, runId);
  const attachments = attachTry.rows || [];

  debug.stage.attachments = {
    ok: attachTry.ok,
    tableUsed: attachTry.tableUsed,
    whereColumn: attachTry.whereColumn,
    count: attachments.length,
  };

  if (includeDebug) {
    debug.stage.attachAttempts = (attachTry.attempts || []).slice(0, 20);
  }

  const rawEmployeeIds = attachments
    .map((a: any) => String(pickFirst(a?.employee_id, "") || "").trim())
    .filter(Boolean);

  const employeeIds = Array.from(new Set(rawEmployeeIds));
  debug.stage.employeeIds = { count: employeeIds.length };

  const invalidEmployeeIds = employeeIds.filter((x) => !isUuid(x));
  if (invalidEmployeeIds.length > 0) {
    debug.stage.employeeIdsInvalid = {
      count: invalidEmployeeIds.length,
      examples: invalidEmployeeIds.slice(0, 10),
    };

    return {
      ok: false,
      status: 500,
      error:
        "Legacy employee identifiers detected in payroll attachments. payroll_run_employees.employee_id must be a UUID referencing employees.id. Fix the data/schema. Do not fall back to employees.employee_id.",
      debug: includeDebug ? debug : undefined,
    };
  }

  let employeesRaw: any[] = [];
  if (employeeIds.length > 0) {
    const { data: empData, error: empError } = await supabase
      .from("employees")
      .select("*")
      .in("id", employeeIds);

    if (empError) {
      employeesRaw = [];
      debug.stage.employeesFetch = {
        ok: false,
        via: "employees.id",
        code: empError.code,
        message: empError.message,
      };
    } else {
      employeesRaw = Array.isArray(empData) ? empData : [];
      debug.stage.employeesFetch = {
        ok: true,
        via: "employees.id",
        count: employeesRaw.length,
      };
    }
  } else {
    debug.stage.employeesFetch = { ok: true, via: "none", count: 0 };
  }

  const empById = new Map<string, any>();
  for (const e of employeesRaw) {
    const k = String(pickFirst(e?.id, "") || "").trim();
    if (k) empById.set(k, e);
  }

  const employees = attachments.map((att: any) => {
    const key = String(pickFirst(att?.employee_id, "") || "").trim();
    const emp = key ? empById.get(key) : null;
    return buildEmployeeRow(att, emp);
  });

  const seededMode = deriveSeededMode(run, attachments);
  debug.stage.seededMode = { detected: seededMode };

  const exceptions = computeExceptions(attachments, empById);

  return {
    ok: true,
    status: 200,
    run,
    totals,
    employees,
    seededMode,
    exceptions,
    attachmentsMeta: {
      tableUsed: attachTry.tableUsed,
      whereColumn: attachTry.whereColumn,
    },
    debug: includeDebug ? debug : undefined,
  };
}

async function updateRunEmployeeRow(
  supabase: any,
  table: string,
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

  const { error } = await supabase.from(table).update(patch).eq("id", rowId);
  if (!error) return { ok: true };

  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    },
  };
}

async function fetchRunStatusAndFlag(supabase: any, runId: string) {
  const attempts: any[] = [];

  const trySelect = async (cols: string) => {
    const { data, error } = await supabase
      .from("payroll_runs")
      .select(cols)
      .eq("id", runId)
      .single();
    return { data, error, cols };
  };

  const a = await trySelect("id,status,attached_all_due_employees");
  if (!a.error) {
    return {
      ok: true,
      run: a.data,
      hasAttachedFlag: true,
      attachedFlag: a.data?.attached_all_due_employees,
      attempts,
    };
  }

  attempts.push({
    cols: a.cols,
    error: {
      code: a.error?.code,
      message: a.error?.message,
      details: a.error?.details,
      hint: a.error?.hint,
    },
  });

  const msg = String(a.error?.message || "").toLowerCase();
  const missingCol =
    a.error?.code === "42703" ||
    (msg.includes("column") && msg.includes("does not exist"));

  if (missingCol) {
    const b = await trySelect("id,status");
    if (!b.error) {
      return {
        ok: true,
        run: b.data,
        hasAttachedFlag: false,
        attachedFlag: undefined,
        attempts,
      };
    }

    attempts.push({
      cols: b.cols,
      error: {
        code: b.error?.code,
        message: b.error?.message,
        details: b.error?.details,
        hint: b.error?.hint,
      },
    });
  }

  return {
    ok: false,
    run: null,
    hasAttachedFlag: false,
    attachedFlag: undefined,
    attempts,
  };
}

async function restoreAttachedAllDueEmployeesIfNeeded(
  supabase: any,
  runId: string,
  beforeValue: any,
  afterValue: any,
  enabled: boolean
) {
  if (!enabled) {
    return { ok: true, restored: false, reason: "flag not present" };
  }

  const before = beforeValue === null || beforeValue === undefined ? null : Boolean(beforeValue);
  const after = afterValue === null || afterValue === undefined ? null : Boolean(afterValue);

  if (before === after) {
    return { ok: true, restored: false, reason: "no change" };
  }

  const { error } = await supabase
    .from("payroll_runs")
    .update({ attached_all_due_employees: before })
    .eq("id", runId);

  if (error) {
    return {
      ok: false,
      restored: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    };
  }

  return { ok: true, restored: true, before, after };
}

async function refreshRunTotalsFromAttachments(supabase: any, runId: string) {
  const attachTry = await tryAttachments(supabase, runId);
  if (!attachTry.ok || !attachTry.tableUsed || !attachTry.whereColumn) {
    return {
      ok: false,
      status: 500,
      error: "Could not find a payroll run employees table to refresh totals",
      debug: { attachTry },
    };
  }

  const table = attachTry.tableUsed;
  const whereCol = attachTry.whereColumn;

  const { data: rows, error: rowsErr } = await supabase
    .from(table)
    .select("*")
    .eq(whereCol, runId);

  if (rowsErr) {
    return {
      ok: false,
      status: 500,
      error: rowsErr.message,
      debug: { table, whereCol },
    };
  }

  const rr = Array.isArray(rows) ? rows : [];

  const grossSum = rr.reduce(
    (a: number, x: any) => a + toNumberSafe(pickFirst(x?.gross_pay, x?.grossPay, 0)),
    0
  );
  const netSum = rr.reduce(
    (a: number, x: any) => a + toNumberSafe(pickFirst(x?.net_pay, x?.netPay, 0)),
    0
  );
  const taxSum = rr.reduce((a: number, x: any) => a + toNumberSafe(pickFirst(x?.tax, 0)), 0);

  const niSum = rr.reduce((a: number, x: any) => {
    return a + toNumberSafe(pickFirst(x?.ni_employee, x?.employee_ni, 0));
  }, 0);

  const { error: runUpErr } = await supabase
    .from("payroll_runs")
    .update({
      total_gross_pay: Number(grossSum.toFixed(2)),
      total_net_pay: Number(netSum.toFixed(2)),
      total_tax: Number(taxSum.toFixed(2)),
      total_ni: Number(niSum.toFixed(2)),
    })
    .eq("id", runId);

  if (runUpErr) {
    return {
      ok: false,
      status: 500,
      error: runUpErr.message,
      debug: { table, whereCol },
    };
  }

  return { ok: true, status: 200, tableUsed: table, whereColumn: whereCol };
}

async function setGrossOnlyCalcForRun(supabase: any, runId: string) {
  const attachTry = await tryAttachments(supabase, runId);
  if (!attachTry.ok || !attachTry.tableUsed || !attachTry.whereColumn) {
    return {
      ok: false,
      status: 500,
      error: "Could not find a payroll run employees table to recalculate",
      debug: { attachTry },
    };
  }

  const table = attachTry.tableUsed;
  const whereCol = attachTry.whereColumn;

  const { data: rows, error: rowsErr } = await supabase
    .from(table)
    .select("*")
    .eq(whereCol, runId);

  if (rowsErr) {
    return {
      ok: false,
      status: 500,
      error: rowsErr.message,
      debug: { table, whereCol },
    };
  }

  const rr = Array.isArray(rows) ? rows : [];

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
    };

    if (r && typeof r === "object" && "tax" in r) patch.tax = 0;

    if (r && typeof r === "object" && "ni_employee" in r) patch.ni_employee = 0;
    if (r && typeof r === "object" && "employee_ni" in r) patch.employee_ni = 0;

    if (r && typeof r === "object" && "ni_employer" in r) patch.ni_employer = 0;
    if (r && typeof r === "object" && "employer_ni" in r) patch.employer_ni = 0;

    const { error: upErr } = await supabase.from(table).update(patch).eq("id", rowId);
    if (upErr) {
      return {
        ok: false,
        status: 500,
        error: `Failed to update gross-only calc for row ${rowId}: ${upErr.message}`,
        debug: { table, whereCol, rowId, patch },
      };
    }
  }

  const totals = await refreshRunTotalsFromAttachments(supabase, runId);
  if (!totals.ok) return totals;

  return { ok: true, status: 200, tableUsed: table, whereColumn: whereCol };
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

    if (!error) {
      return { ok: true, via: { fn: c.fn, args: c.args }, data, attempts };
    }

    attempts.push({
      fn: c.fn,
      args: c.args,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    });
  }

  return {
    ok: false,
    status: 501,
    error:
      "No Supabase RPC function was found to compute a payroll run in full. Create a DB function and call it from here.",
    attempts: attempts.slice(0, 12),
  };
}

export async function GET(req: Request, { params }: Ctx) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing payroll run id" },
        { status: 400 }
      );
    }

    const includeDebug = new URL(req.url).searchParams.get("debug") === "1";

    const supabase = getAdminClient();
    const result = await getRunAndEmployees(supabase, id, includeDebug);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          debugSource: "payroll_run_route_admin_v6_full_compute_action",
          error: result.error,
          ...(includeDebug ? { debug: result.debug } : {}),
        },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      debugSource: "payroll_run_route_admin_v6_full_compute_action",
      run: result.run,
      employees: result.employees,
      totals: result.totals,
      seededMode: result.seededMode,
      exceptions: result.exceptions,
      ...(includeDebug ? { debug: result.debug } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        debugSource: "payroll_run_route_admin_v6_full_compute_action",
        error: err?.message ?? "Unexpected error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing payroll run id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = normalizeAction(body?.action);

    const supabase = getAdminClient();

    const isComputeFull =
      action === "compute_full" ||
      action === "compute-full" ||
      action === "full_compute" ||
      action === "fullcompute" ||
      action === "compute";

    if (action === "recalculate") {
      const pre = await fetchRunStatusAndFlag(supabase, id);

      if (!pre.ok || !pre.run) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: "Failed to fetch payroll run status before recalculation.",
            debug: { attempts: pre.attempts || [] },
          },
          { status: 500 }
        );
      }

      if (String(pre.run?.status || "").toLowerCase() !== "draft") {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: "Recalculate is only allowed for draft runs.",
          },
          { status: 409 }
        );
      }

      const rec: any = await setGrossOnlyCalcForRun(supabase, id);
      if (!rec?.ok) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: rec?.error || "Recalculate failed",
            ...(rec?.debug ? { debug: rec.debug } : {}),
          },
          { status: rec?.status || 500 }
        );
      }

      const post = await fetchRunStatusAndFlag(supabase, id);

      const flagFix = await restoreAttachedAllDueEmployeesIfNeeded(
        supabase,
        id,
        pre.attachedFlag,
        post?.attachedFlag,
        Boolean(pre.hasAttachedFlag)
      );

      const result = await getRunAndEmployees(supabase, id, false);

      return NextResponse.json({
        ok: true,
        debugSource: "payroll_run_route_admin_v6_full_compute_action",
        action: "recalculate",
        attachments: {
          tableUsed: rec?.tableUsed ?? null,
          whereColumn: rec?.whereColumn ?? null,
        },
        sideEffects: pre.hasAttachedFlag
          ? {
              attached_all_due_employees: {
                before: pre.attachedFlag,
                after: post?.attachedFlag,
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
      const pre = await getRunAndEmployees(supabase, id, true);

      if (!pre.ok) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: pre.error,
            debug: pre.debug,
          },
          { status: pre.status || 500 }
        );
      }

      const status = String(pre?.run?.status || "").toLowerCase();
      if (status !== "draft") {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: "Full compute is only allowed for draft runs.",
            runStatus: status,
          },
          { status: 409 }
        );
      }

      const blockingCount = Number(pre?.exceptions?.blockingCount ?? 0);
      if (blockingCount > 0) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: "Full compute blocked. Fix blocking exceptions first.",
            exceptions: pre.exceptions,
          },
          { status: 409 }
        );
      }

      const attachMeta = pre?.attachmentsMeta || null;
      const hasEmployees = Array.isArray(pre?.employees) && pre.employees.length > 0;
      if (!hasEmployees) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: "Full compute blocked. No attached employees were found for this run.",
            attachmentsMeta: attachMeta,
          },
          { status: 409 }
        );
      }

      const flagPre = await fetchRunStatusAndFlag(supabase, id);

      const rpc: any = await tryComputeFullViaRpc(supabase, id);
      if (!rpc?.ok) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            action: "compute_full",
            error: rpc?.error || "Full compute RPC failed",
            attempts: rpc?.attempts || [],
          },
          { status: rpc?.status || 501 }
        );
      }

      const totalsRefresh: any = await refreshRunTotalsFromAttachments(supabase, id);

      const flagPost = await fetchRunStatusAndFlag(supabase, id);
      const flagFix = await restoreAttachedAllDueEmployeesIfNeeded(
        supabase,
        id,
        flagPre?.attachedFlag,
        flagPost?.attachedFlag,
        Boolean(flagPre?.hasAttachedFlag)
      );

      const post = await getRunAndEmployees(supabase, id, false);

      if (post.ok && Boolean(post.seededMode)) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            action: "compute_full",
            error:
              "Full compute attempted, but the run still looks seeded (not all employee rows are calc_mode='full'). Ensure your DB compute function writes tax, NI, net, and calc_mode='full' back to the attachments table.",
            computeVia: rpc?.via,
            totalsRefreshOk: Boolean(totalsRefresh?.ok),
            seededMode: true,
            run: post.run,
            employees: post.employees,
            totals: post.totals,
            exceptions: post.exceptions,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        ok: true,
        debugSource: "payroll_run_route_admin_v6_full_compute_action",
        action: "compute_full",
        computeVia: rpc?.via,
        totalsRefreshOk: Boolean(totalsRefresh?.ok),
        attachmentsMeta: attachMeta,
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
      const pre = await getRunAndEmployees(supabase, id, true);

      if (!pre.ok) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: pre.error,
            debug: pre.debug,
          },
          { status: pre.status || 500 }
        );
      }

      const seededMode = Boolean(pre?.seededMode);
      const blockingCount = Number(pre?.exceptions?.blockingCount ?? 0);

      if (seededMode) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error:
              "Approval blocked. This run is not fully calculated (calc_mode is not 'full' for all employees). Run full compute first.",
            seededMode: true,
            exceptions: pre.exceptions,
            debug: pre.debug,
          },
          { status: 409 }
        );
      }

      if (blockingCount > 0) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: "Approval blocked. Fix blocking exceptions first.",
            seededMode: false,
            exceptions: pre.exceptions,
          },
          { status: 409 }
        );
      }

      const { error: upErr } = await supabase
        .from("payroll_runs")
        .update({ status: "approved" })
        .eq("id", id);

      if (upErr) {
        return NextResponse.json(
          {
            ok: false,
            debugSource: "payroll_run_route_admin_v6_full_compute_action",
            error: upErr.message,
          },
          { status: 500 }
        );
      }

      const post = await getRunAndEmployees(supabase, id, false);

      return NextResponse.json({
        ok: true,
        debugSource: "payroll_run_route_admin_v6_full_compute_action",
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
      return NextResponse.json(
        {
          ok: false,
          error:
            "Nothing to update. Expected { items: [...] } or { action: 'approve'|'recalculate'|'compute_full' }",
        },
        { status: 400 }
      );
    }

    const attachTry = await tryAttachments(supabase, id);
    if (!attachTry.ok || !attachTry.tableUsed || !attachTry.whereColumn) {
      return NextResponse.json(
        {
          ok: false,
          debugSource: "payroll_run_route_admin_v6_full_compute_action",
          error: "Could not find a payroll run employees table to update",
        },
        { status: 500 }
      );
    }

    const table = attachTry.tableUsed;

    const results: any[] = [];

    for (const it of items) {
      const rowId = String(it?.id || "").trim();
      if (!rowId) continue;

      const gross = Number(toNumberSafe(it?.gross).toFixed(2));
      const deductions = Number(toNumberSafe(it?.deductions).toFixed(2));
      const net = Number(toNumberSafe(it?.net).toFixed(2));

      const r = await updateRunEmployeeRow(supabase, table, rowId, gross, deductions, net);
      results.push({ id: rowId, ok: r.ok, ...(r.ok ? {} : { error: r.error }) });
    }

    const totals: any = await refreshRunTotalsFromAttachments(supabase, id);
    if (!totals?.ok) {
      return NextResponse.json(
        {
          ok: false,
          debugSource: "payroll_run_route_admin_v6_full_compute_action",
          error: `Updated rows, but failed to refresh totals: ${totals?.error || "unknown error"}`,
          updateResults: results,
        },
        { status: totals?.status || 500 }
      );
    }

    const result = await getRunAndEmployees(supabase, id, false);

    return NextResponse.json({
      ok: true,
      debugSource: "payroll_run_route_admin_v6_full_compute_action",
      run: result.run,
      employees: result.employees,
      totals: result.totals,
      seededMode: result.seededMode,
      exceptions: result.exceptions,
      updateResults: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        debugSource: "payroll_run_route_admin_v6_full_compute_action",
        error: err?.message ?? "Unexpected error",
      },
      { status: 500 }
    );
  }
}
