import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type RecoveryAction =
  | "record_repayment"
  | "write_off"
  | "mark_disputed"
  | "resolve_dispute"
  | "manual_adjustment";

type AdjustmentDirection = "increase" | "decrease";

type RecoveryBalanceRow = {
  id: string;
  company_id: string;
  employee_id: string;
  source_payroll_run_id: string | null;
  source_payroll_run_employee_id: string | null;
  reason_code: string;
  description: string | null;
  original_calculated_net_pay: number | string;
  original_payable_net_pay: number | string;
  original_recovery_amount: number | string;
  amount_recovered: number | string;
  amount_outstanding: number | string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type RecoveryBody = {
  action?: unknown;
  balanceId?: unknown;
  amount?: unknown;
  description?: unknown;
  direction?: unknown;
  adjustmentDirection?: unknown;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function previewWriteBlocked() {
  const isPreview = process.env.VERCEL_ENV === "preview";
  const allow = process.env.ALLOW_PREVIEW_WRITES === "1";
  return isPreview && !allow;
}

function isUuid(v: unknown): boolean {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function round2(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function positiveMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = round2(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeAction(value: unknown): RecoveryAction | null {
  const s = String(value ?? "").trim().toLowerCase();

  if (s === "record_repayment") return "record_repayment";
  if (s === "write_off") return "write_off";
  if (s === "mark_disputed") return "mark_disputed";
  if (s === "resolve_dispute") return "resolve_dispute";
  if (s === "manual_adjustment") return "manual_adjustment";

  return null;
}

function normalizeDirection(value: unknown): AdjustmentDirection | null {
  const s = String(value ?? "").trim().toLowerCase();

  if (s === "increase") return "increase";
  if (s === "decrease") return "decrease";

  return null;
}

function normalizeDescription(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function statusFromAmounts(amountRecovered: number, amountOutstanding: number): string {
  const recovered = round2(amountRecovered);
  const outstanding = round2(amountOutstanding);

  if (outstanding <= 0) return "recovered";
  if (recovered > 0) return "part_recovered";
  return "open";
}

function dbErrPayload(err: unknown) {
  const e = err as { message?: unknown; hint?: unknown; code?: unknown; details?: unknown } | null;
  return {
    details: String(e?.message ?? err),
    hint: e?.hint ?? null,
    code: e?.code ?? null,
    dbDetails: e?.details ?? null,
  };
}

async function getEmployeeKeys(
  supabase: Awaited<ReturnType<typeof createClient>>,
  routeEmployeeId: string
): Promise<{ uuid: string; company_id: string } | null> {
  const byEmployeeId = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("employee_id", routeEmployeeId)
    .maybeSingle();

  if (byEmployeeId.data) {
    return {
      uuid: String((byEmployeeId.data as any).id),
      company_id: String((byEmployeeId.data as any).company_id),
    };
  }

  if (isUuid(routeEmployeeId)) {
    const byId = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("id", routeEmployeeId)
      .maybeSingle();

    if (byId.data) {
      return {
        uuid: String((byId.data as any).id),
        company_id: String((byId.data as any).company_id),
      };
    }
  }

  return null;
}

async function readRequestBody(req: Request): Promise<RecoveryBody> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as RecoveryBody) : {};
  } catch {
    return {};
  }
}

export async function GET(_req: Request, ctx: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, error: "UNAUTHENTICATED" });
  }

  const params = await ctx.params;
  const routeEmployeeId = String(params?.id ?? "").trim();

  if (!routeEmployeeId) {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "Missing employee id." });
  }

  const employeeKeys = await getEmployeeKeys(supabase, routeEmployeeId);

  if (!employeeKeys) {
    return json(404, { ok: false, error: "NOT_FOUND", message: "Employee not found." });
  }

  const { data: balances, error: balancesErr } = await supabase
    .from("payroll_recovery_balances")
    .select("*")
    .eq("company_id", employeeKeys.company_id)
    .eq("employee_id", employeeKeys.uuid)
    .order("created_at", { ascending: false });

  if (balancesErr) {
    return json(500, {
      ok: false,
      error: "BALANCES_QUERY_FAILED",
      message: "Could not load employee recovery balances.",
      ...dbErrPayload(balancesErr),
    });
  }

  const balanceRows = Array.isArray(balances) ? balances : [];
  const balanceIds = balanceRows
    .map((row: any) => String(row?.id ?? "").trim())
    .filter(Boolean);

  let transactions: any[] = [];

  if (balanceIds.length > 0) {
    const { data: txRows, error: txErr } = await supabase
      .from("payroll_recovery_transactions")
      .select("*")
      .in("recovery_balance_id", balanceIds)
      .order("created_at", { ascending: false });

    if (txErr) {
      return json(500, {
        ok: false,
        error: "TRANSACTIONS_QUERY_FAILED",
        message: "Could not load employee recovery transactions.",
        ...dbErrPayload(txErr),
      });
    }

    transactions = Array.isArray(txRows) ? txRows : [];
  }

  const openOutstanding = balanceRows.reduce((sum: number, row: any) => {
    const status = String(row?.status ?? "").toLowerCase();
    if (status === "recovered" || status === "written_off") return sum;
    return round2(sum + round2(row?.amount_outstanding));
  }, 0);

  return json(200, {
    ok: true,
    employeeId: employeeKeys.uuid,
    companyId: employeeKeys.company_id,
    summary: {
      balanceCount: balanceRows.length,
      openOutstanding,
    },
    balances: balanceRows,
    transactions,
  });
}

export async function POST(req: Request, ctx: RouteContext) {
  const supabase = await createClient();

  if (previewWriteBlocked()) {
    return json(403, {
      ok: false,
      error: "PREVIEW_WRITES_DISABLED",
      message: "Writes are disabled in preview deployments.",
    });
  }

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, error: "UNAUTHENTICATED" });
  }

  const params = await ctx.params;
  const routeEmployeeId = String(params?.id ?? "").trim();

  if (!routeEmployeeId) {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "Missing employee id." });
  }

  const employeeKeys = await getEmployeeKeys(supabase, routeEmployeeId);

  if (!employeeKeys) {
    return json(404, { ok: false, error: "NOT_FOUND", message: "Employee not found." });
  }

  const body = await readRequestBody(req);
  const action = normalizeAction(body.action);
  const balanceId = String(body.balanceId ?? "").trim();

  if (!action) {
    return json(400, {
      ok: false,
      error: "BAD_REQUEST",
      message: "A valid action is required.",
    });
  }

  if (!isUuid(balanceId)) {
    return json(400, {
      ok: false,
      error: "BAD_REQUEST",
      message: "A valid recovery balance id is required.",
    });
  }

  const { data: balanceData, error: balanceErr } = await supabase
    .from("payroll_recovery_balances")
    .select("*")
    .eq("id", balanceId)
    .eq("company_id", employeeKeys.company_id)
    .eq("employee_id", employeeKeys.uuid)
    .maybeSingle();

  if (balanceErr) {
    return json(500, {
      ok: false,
      error: "BALANCE_QUERY_FAILED",
      message: "Could not load the recovery balance.",
      ...dbErrPayload(balanceErr),
    });
  }

  if (!balanceData) {
    return json(404, {
      ok: false,
      error: "NOT_FOUND",
      message: "Recovery balance not found for this employee.",
    });
  }

  const balance = balanceData as RecoveryBalanceRow;
  const currentRecovered = round2(balance.amount_recovered);
  const currentOutstanding = round2(balance.amount_outstanding);
  const currentStatus = String(balance.status || "open").trim().toLowerCase();
  const description = normalizeDescription(body.description);

  let transactionType:
    | "manual_repayment"
    | "write_off"
    | "dispute_opened"
    | "dispute_resolved"
    | "manual_adjustment" = "manual_adjustment";

  let transactionAmount = 0;
  let nextRecovered = currentRecovered;
  let nextOutstanding = currentOutstanding;
  let nextStatus = currentStatus || "open";
  let transactionDescription = description;
  let adjustmentDirection: AdjustmentDirection | null = null;

  if (action === "record_repayment") {
    const amount = positiveMoney(body.amount);

    if (amount === null) {
      return json(400, {
        ok: false,
        error: "BAD_REQUEST",
        message: "Enter a repayment amount greater than 0.",
      });
    }

    if (amount > currentOutstanding) {
      return json(400, {
        ok: false,
        error: "AMOUNT_TOO_HIGH",
        message: "Repayment cannot be greater than the outstanding amount.",
      });
    }

    transactionType = "manual_repayment";
    transactionAmount = amount;
    nextRecovered = round2(currentRecovered + amount);
    nextOutstanding = round2(currentOutstanding - amount);
    nextStatus = statusFromAmounts(nextRecovered, nextOutstanding);
    transactionDescription = description || "Manual repayment recorded.";
  } else if (action === "write_off") {
    const amount =
      body.amount === null || body.amount === undefined || body.amount === ""
        ? currentOutstanding
        : positiveMoney(body.amount);

    if (amount === null) {
      return json(400, {
        ok: false,
        error: "BAD_REQUEST",
        message: "Enter a write-off amount greater than 0.",
      });
    }

    if (amount > currentOutstanding) {
      return json(400, {
        ok: false,
        error: "AMOUNT_TOO_HIGH",
        message: "Write-off cannot be greater than the outstanding amount.",
      });
    }

    if (!description) {
      return json(400, {
        ok: false,
        error: "REASON_REQUIRED",
        message: "Enter a reason for writing off the balance.",
      });
    }

    transactionType = "write_off";
    transactionAmount = amount;
    nextOutstanding = round2(currentOutstanding - amount);
    nextStatus = nextOutstanding <= 0 ? "written_off" : statusFromAmounts(nextRecovered, nextOutstanding);
    transactionDescription = description;
  } else if (action === "mark_disputed") {
    if (!description) {
      return json(400, {
        ok: false,
        error: "REASON_REQUIRED",
        message: "Enter a reason for marking the balance as disputed.",
      });
    }

    transactionType = "dispute_opened";
    transactionAmount = 0;
    nextStatus = "disputed";
    transactionDescription = description;
  } else if (action === "resolve_dispute") {
    transactionType = "dispute_resolved";
    transactionAmount = 0;
    nextStatus = statusFromAmounts(currentRecovered, currentOutstanding);
    transactionDescription = description || "Dispute resolved.";
  } else {
    const amount = positiveMoney(body.amount);
    adjustmentDirection = normalizeDirection(body.direction ?? body.adjustmentDirection);

    if (amount === null) {
      return json(400, {
        ok: false,
        error: "BAD_REQUEST",
        message: "Enter an adjustment amount greater than 0.",
      });
    }

    if (!adjustmentDirection) {
      return json(400, {
        ok: false,
        error: "BAD_REQUEST",
        message: 'Adjustment direction must be "increase" or "decrease".',
      });
    }

    if (!description) {
      return json(400, {
        ok: false,
        error: "REASON_REQUIRED",
        message: "Enter a reason for the manual adjustment.",
      });
    }

    if (adjustmentDirection === "decrease" && amount > currentOutstanding) {
      return json(400, {
        ok: false,
        error: "AMOUNT_TOO_HIGH",
        message: "Decrease adjustment cannot be greater than the outstanding amount.",
      });
    }

    transactionType = "manual_adjustment";
    transactionAmount = amount;
    nextOutstanding =
      adjustmentDirection === "increase"
        ? round2(currentOutstanding + amount)
        : round2(currentOutstanding - amount);
    nextStatus = statusFromAmounts(nextRecovered, nextOutstanding);
    transactionDescription = description;
  }

  const { data: updatedBalance, error: updateErr } = await supabase
    .from("payroll_recovery_balances")
    .update({
      amount_recovered: nextRecovered,
      amount_outstanding: nextOutstanding,
      status: nextStatus,
      updated_by: auth.user.id,
    })
    .eq("id", balance.id)
    .eq("company_id", employeeKeys.company_id)
    .eq("employee_id", employeeKeys.uuid)
    .select("*")
    .single();

  if (updateErr) {
    return json(500, {
      ok: false,
      error: "BALANCE_UPDATE_FAILED",
      message: "Could not update the recovery balance.",
      ...dbErrPayload(updateErr),
    });
  }

  const { data: transaction, error: txErr } = await supabase
    .from("payroll_recovery_transactions")
    .insert({
      company_id: employeeKeys.company_id,
      employee_id: employeeKeys.uuid,
      recovery_balance_id: balance.id,
      payroll_run_id: balance.source_payroll_run_id,
      payroll_run_employee_id: balance.source_payroll_run_employee_id,
      transaction_type: transactionType,
      amount: transactionAmount,
      balance_after: nextOutstanding,
      description: transactionDescription,
      created_by: auth.user.id,
      metadata: {
        action,
        adjustment_direction: adjustmentDirection,
        previous_status: currentStatus,
        next_status: nextStatus,
        previous_amount_recovered: currentRecovered,
        next_amount_recovered: nextRecovered,
        previous_amount_outstanding: currentOutstanding,
        next_amount_outstanding: nextOutstanding,
      },
    })
    .select("*")
    .single();

  if (txErr) {
    return json(500, {
      ok: false,
      error: "TRANSACTION_INSERT_FAILED",
      message: "The recovery balance was updated, but the transaction history entry could not be created.",
      ...dbErrPayload(txErr),
    });
  }

  return json(200, {
    ok: true,
    action,
    balance: updatedBalance,
    transaction,
  });
}