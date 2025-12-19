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
      const { data, error } = await supabase.from(table).select("*").eq(col, runId);

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
      const isMissingTable = error?.code === "42P01" || msg.includes("does not exist");
      const isMissingColumn =
        error?.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));

      if (isMissingTable) break;
      if (isMissingColumn) continue;

      // Any other error: move on.
      continue;
    }
  }

  return { ok: false, tableUsed: null, whereColumn: null, rows: [], attempts };
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
  const employeeNi = toNumberSafe(pickFirst(att?.employee_ni, att?.ni_employee, 0));
  const pensionEmployee = toNumberSafe(pickFirst(att?.pension_employee, 0));
  const otherDeductions = toNumberSafe(pickFirst(att?.other_deductions, 0));
  const aoe = toNumberSafe(pickFirst(att?.attachment_of_earnings, 0));

  const deductions = Number((tax + employeeNi + pensionEmployee + otherDeductions + aoe).toFixed(2));
  const net = toNumberSafe(pickFirst(att?.net_pay, att?.netPay, gross - deductions));

  const safeId = String(pickFirst(att?.id, "") || "");

  return {
    id: safeId,
    employee_id: employeeId,
    employee_name: employeeName,
    employee_number: employeeNumber,
    email,
    gross: Number(gross.toFixed(2)),
    deductions,
    net: Number(net.toFixed(2)),
  };
}

async function getRunAndEmployees(supabase: any, runId: string, includeDebug: boolean) {
  const debug: any = { runId, stage: {} };

  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError) {
    debug.stage.runFetch = { ok: false, code: runError.code, message: runError.message };
    return { ok: false, status: 404, error: "Payroll run not found", debug: includeDebug ? debug : undefined };
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

  const employeeIds = Array.from(
    new Set(
      attachments
        .map((a: any) => String(pickFirst(a?.employee_id, "") || "").trim())
        .filter(Boolean)
    )
  );

  debug.stage.employeeIds = { count: employeeIds.length };

  let employeesRaw: any[] = [];
  if (employeeIds.length > 0) {
    // Preferred: attachments.employee_id -> employees.id
    const { data: empData, error: empError } = await supabase
      .from("employees")
      .select("*")
      .in("id", employeeIds);

    if (!empError) {
      employeesRaw = Array.isArray(empData) ? empData : [];
      debug.stage.employeesFetch = { ok: true, via: "employees.id", count: employeesRaw.length };
    } else {
      // Fallback: attachments.employee_id -> employees.employee_id (older schema)
      const { data: empData2, error: empError2 } = await supabase
        .from("employees")
        .select("*")
        .in("employee_id", employeeIds);

      if (!empError2) {
        employeesRaw = Array.isArray(empData2) ? empData2 : [];
        debug.stage.employeesFetch = { ok: true, via: "employees.employee_id", count: employeesRaw.length };
      } else {
        employeesRaw = [];
        debug.stage.employeesFetch = {
          ok: false,
          message: empError2.message,
          code: empError2.code,
        };
      }
    }
  } else {
    debug.stage.employeesFetch = { ok: true, via: "none", count: 0 };
  }

  const empByKey = new Map<string, any>();
  for (const e of employeesRaw) {
    const k1 = String(pickFirst(e?.id, "") || "").trim();
    const k2 = String(pickFirst(e?.employee_id, "") || "").trim();
    if (k1) empByKey.set(k1, e);
    if (k2) empByKey.set(k2, e);
  }

  const employees = attachments.map((att: any) => {
    const key = String(pickFirst(att?.employee_id, "") || "").trim();
    const emp = key ? empByKey.get(key) : null;
    return buildEmployeeRow(att, emp);
  });

  return { ok: true, status: 200, run, totals, employees, debug: includeDebug ? debug : undefined };
}

async function updateRunEmployeeRow(
  supabase: any,
  table: string,
  rowId: string,
  gross: number,
  deductions: number,
  net: number
) {
  // Your real columns are gross_pay, net_pay, and other_deductions.
  // We mark manual_override so it’s obvious this was edited.
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

export async function GET(req: Request, { params }: Ctx) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing payroll run id" }, { status: 400 });
    }

    const includeDebug = new URL(req.url).searchParams.get("debug") === "1";

    const supabase = getAdminClient();
    const result = await getRunAndEmployees(supabase, id, includeDebug);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          debugSource: "payroll_run_route_admin_v3",
          error: result.error,
          ...(includeDebug ? { debug: result.debug } : {}),
        },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      debugSource: "payroll_run_route_admin_v3",
      run: result.run,
      employees: result.employees,
      totals: result.totals,
      ...(includeDebug ? { debug: result.debug } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        debugSource: "payroll_run_route_admin_v3",
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
      return NextResponse.json({ ok: false, error: "Missing payroll run id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim().toLowerCase();

    const supabase = getAdminClient();

    if (action === "approve") {
      const { error: upErr } = await supabase.from("payroll_runs").update({ status: "approved" }).eq("id", id);

      if (upErr) {
        return NextResponse.json(
          { ok: false, debugSource: "payroll_run_route_admin_v3", error: upErr.message },
          { status: 500 }
        );
      }

      const result = await getRunAndEmployees(supabase, id, false);

      return NextResponse.json({
        ok: true,
        debugSource: "payroll_run_route_admin_v3",
        run: result.run,
        employees: result.employees,
        totals: result.totals,
      });
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nothing to update. Expected { items: [...] } or { action: 'approve' }" },
        { status: 400 }
      );
    }

    // Find the working attachments table for this run.
    const attachTry = await tryAttachments(supabase, id);
    if (!attachTry.ok || !attachTry.tableUsed) {
      return NextResponse.json(
        {
          ok: false,
          debugSource: "payroll_run_route_admin_v3",
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

    // Refresh totals by summing the authoritative row columns.
    const { data: rows } = await supabase
      .from("payroll_run_employees")
      .select("gross_pay, net_pay, tax, employee_ni, ni_employee")
      .eq("run_id", id);

    const rr = Array.isArray(rows) ? rows : [];
    const grossSum = rr.reduce((a: number, r: any) => a + toNumberSafe(r?.gross_pay), 0);
    const netSum = rr.reduce((a: number, r: any) => a + toNumberSafe(r?.net_pay), 0);
    const taxSum = rr.reduce((a: number, r: any) => a + toNumberSafe(r?.tax), 0);
    const niSum = rr.reduce(
      (a: number, r: any) => a + toNumberSafe(pickFirst(r?.employee_ni, r?.ni_employee, 0)),
      0
    );

    await supabase
      .from("payroll_runs")
      .update({
        total_gross_pay: Number(grossSum.toFixed(2)),
        total_net_pay: Number(netSum.toFixed(2)),
        total_tax: Number(taxSum.toFixed(2)),
        total_ni: Number(niSum.toFixed(2)),
      })
      .eq("id", id);

    const result = await getRunAndEmployees(supabase, id, false);

    return NextResponse.json({
      ok: true,
      debugSource: "payroll_run_route_admin_v3",
      run: result.run,
      employees: result.employees,
      totals: result.totals,
      updateResults: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        debugSource: "payroll_run_route_admin_v3",
        error: err?.message ?? "Unexpected error",
      },
      { status: 500 }
    );
  }
}
