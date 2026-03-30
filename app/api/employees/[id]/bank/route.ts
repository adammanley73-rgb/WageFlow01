// C:\Projects\wageflow01\app\api\employees\[id]\bank\route.ts

import { createClient } from "@supabase/supabase-js";

type LegacyBankRow = {
  employee_id: string;
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const key = serviceKey || anonKey;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function previewWriteBlocked() {
  const isPreview = process.env.VERCEL_ENV === "preview";
  const allow = process.env.ALLOW_PREVIEW_WRITES === "1";
  return isPreview && !allow;
}

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function trimToNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normaliseSortCodeDigits(value: unknown): string | null {
  const digits = digitsOnly(value).slice(0, 6);
  return digits ? digits : null;
}

function normaliseAccountNumber(value: unknown): string | null {
  const digits = digitsOnly(value).slice(0, 8);
  return digits ? digits : null;
}

function formatSortCodeForUi(value: unknown): string | null {
  const digits = digitsOnly(value).slice(0, 6);
  if (!digits) return null;
  if (digits.length !== 6) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function isMissingRelationError(error: any) {
  const code = String(error?.code || "").trim();
  const message = String(error?.message || "").toLowerCase();
  return code === "42P01" || message.includes("relation") || message.includes("does not exist");
}

async function resolveEmployee(supabase: any, rawId: string) {
  const byEmployeeId = await supabase
    .from("employees")
    .select("id, employee_id, company_id")
    .eq("employee_id", rawId)
    .maybeSingle();

  if (byEmployeeId.error) {
    return { data: null, error: byEmployeeId.error };
  }

  if (byEmployeeId.data) {
    return { data: byEmployeeId.data, error: null };
  }

  if (!isUuid(rawId)) {
    return { data: null, error: null };
  }

  const byId = await supabase
    .from("employees")
    .select("id, employee_id, company_id")
    .eq("id", rawId)
    .maybeSingle();

  if (byId.error) {
    return { data: null, error: byId.error };
  }

  return { data: byId.data ?? null, error: null };
}

function shapeBankForUi(row: any) {
  if (!row) return null;

  return {
    account_name: row.account_name ?? null,
    sort_code: formatSortCodeForUi(row.sort_code),
    account_number: row.account_number ?? null,
    roll_number: row.roll_number ?? null,
    building_society: Boolean(row.building_society ?? false),
    is_primary: row.is_primary ?? true,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

async function getFromNewTable(supabase: any, employeeUuid: string) {
  const res = await supabase
    .from("employee_bank_accounts")
    .select(
      "id, employee_id, company_id, account_name, sort_code, account_number, roll_number, building_society, is_primary, created_at, updated_at"
    )
    .eq("employee_id", employeeUuid)
    .eq("is_primary", true)
    .limit(1);

  if (res.error) {
    return {
      data: null,
      error: res.error,
      missingTable: isMissingRelationError(res.error),
    };
  }

  const row = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
  return { data: row, error: null, missingTable: false };
}

async function getFromLegacyTable(supabase: any, employeeUuid: string) {
  const res = await supabase
    .from("employee_bank")
    .select("*")
    .eq("employee_id", employeeUuid)
    .maybeSingle();

  return {
    data: res.data ?? null,
    error: res.error ?? null,
  };
}

async function saveToNewTable(
  supabase: any,
  employee: { id: string; employee_id: string | null; company_id: string | null },
  values: {
    account_name: string | null;
    sort_code: string | null;
    account_number: string | null;
  }
) {
  if (!employee.company_id) {
    return {
      data: null,
      error: new Error("employee company_id is missing"),
      missingTable: false,
    };
  }

  const existingRes = await supabase
    .from("employee_bank_accounts")
    .select("id")
    .eq("employee_id", employee.id)
    .eq("is_primary", true)
    .limit(1);

  if (existingRes.error) {
    return {
      data: null,
      error: existingRes.error,
      missingTable: isMissingRelationError(existingRes.error),
    };
  }

  const existing =
    Array.isArray(existingRes.data) && existingRes.data.length > 0
      ? existingRes.data[0]
      : null;

  const payload = {
    employee_id: employee.id,
    company_id: employee.company_id,
    account_name: values.account_name,
    sort_code: values.sort_code,
    account_number: values.account_number,
    roll_number: null,
    building_society: false,
    is_primary: true,
  };

  if (existing?.id) {
    const updateRes = await supabase
      .from("employee_bank_accounts")
      .update(payload)
      .eq("id", existing.id)
      .select(
        "id, employee_id, company_id, account_name, sort_code, account_number, roll_number, building_society, is_primary, created_at, updated_at"
      )
      .single();

    return {
      data: updateRes.data ?? null,
      error: updateRes.error ?? null,
      missingTable: isMissingRelationError(updateRes.error),
    };
  }

  const insertRes = await supabase
    .from("employee_bank_accounts")
    .insert(payload)
    .select(
      "id, employee_id, company_id, account_name, sort_code, account_number, roll_number, building_society, is_primary, created_at, updated_at"
    )
    .single();

  return {
    data: insertRes.data ?? null,
    error: insertRes.error ?? null,
    missingTable: isMissingRelationError(insertRes.error),
  };
}

async function saveToLegacyTable(
  supabase: any,
  employeeUuid: string,
  values: {
    account_name: string | null;
    sort_code: string | null;
    account_number: string | null;
  }
) {
  const payload: LegacyBankRow = {
    employee_id: employeeUuid,
    account_name: values.account_name,
    sort_code: formatSortCodeForUi(values.sort_code),
    account_number: values.account_number,
  };

  const res = await supabase
    .from("employee_bank")
    .upsert(payload, { onConflict: "employee_id" })
    .select("*")
    .eq("employee_id", employeeUuid)
    .single();

  return {
    data: res.data ?? null,
    error: res.error ?? null,
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const rawId = String(params?.id || "").trim();

  if (!rawId) {
    return json(400, { error: "missing employee id" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return json(500, {
      error: "bank route is not configured",
      detail: "Supabase environment variables are missing on the server.",
    });
  }

  const resolved = await resolveEmployee(supabase, rawId);

  if (resolved.error) {
    return json(500, {
      error: "failed to resolve employee",
      detail: resolved.error.message || String(resolved.error),
      code: resolved.error.code ?? null,
    });
  }

  if (!resolved.data) {
    return json(404, { error: "employee not found" });
  }

  const employee = resolved.data;

  const fromNew = await getFromNewTable(supabase, employee.id);

  if (fromNew.error && !fromNew.missingTable) {
    return json(500, {
      error: "failed to load bank details",
      detail: fromNew.error.message || String(fromNew.error),
      code: fromNew.error.code ?? null,
    });
  }

  if (fromNew.data) {
    return json(200, { data: shapeBankForUi(fromNew.data) });
  }

  const fromLegacy = await getFromLegacyTable(supabase, employee.id);

  if (fromLegacy.error) {
    return json(500, {
      error: "failed to load bank details",
      detail: fromLegacy.error.message || String(fromLegacy.error),
      code: fromLegacy.error.code ?? null,
    });
  }

  if (!fromLegacy.data) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return json(200, { data: shapeBankForUi(fromLegacy.data) });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const rawId = String(params?.id || "").trim();

  if (!rawId) {
    return json(400, { error: "missing employee id" });
  }

  if (previewWriteBlocked()) {
    return json(403, { error: "employees/bank disabled on preview" });
  }

  let body: Partial<LegacyBankRow> = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }

  const accountName = trimToNull(body.account_name);
  const sortCodeDigits = normaliseSortCodeDigits(body.sort_code);
  const accountNumberDigits = normaliseAccountNumber(body.account_number);

  if (!accountName) {
    return json(400, { error: "account name is required" });
  }

  if (!sortCodeDigits || sortCodeDigits.length !== 6) {
    return json(400, { error: "sort code must be exactly 6 digits" });
  }

  if (!accountNumberDigits || accountNumberDigits.length !== 8) {
    return json(400, { error: "account number must be exactly 8 digits" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return json(500, {
      error: "bank route is not configured",
      detail: "Supabase environment variables are missing on the server.",
    });
  }

  const resolved = await resolveEmployee(supabase, rawId);

  if (resolved.error) {
    return json(500, {
      error: "failed to resolve employee",
      detail: resolved.error.message || String(resolved.error),
      code: resolved.error.code ?? null,
    });
  }

  if (!resolved.data) {
    return json(404, { error: "employee not found" });
  }

  const employee = resolved.data;

  const values = {
    account_name: accountName,
    sort_code: sortCodeDigits,
    account_number: accountNumberDigits,
  };

  const saveNew = await saveToNewTable(supabase, employee, values);

  if (!saveNew.error && saveNew.data) {
    return json(200, {
      id: employee.employee_id || rawId,
      employee_uuid: employee.id,
      data: shapeBankForUi(saveNew.data),
    });
  }

  if (saveNew.error && !saveNew.missingTable) {
    return json(500, {
      error: "failed to save bank details",
      detail: saveNew.error.message || String(saveNew.error),
      code: saveNew.error.code ?? null,
      hint: saveNew.error.hint ?? null,
    });
  }

  const saveLegacy = await saveToLegacyTable(supabase, employee.id, values);

  if (saveLegacy.error) {
    return json(500, {
      error: "failed to save bank details",
      detail: saveLegacy.error.message || String(saveLegacy.error),
      code: saveLegacy.error.code ?? null,
      hint: saveLegacy.error.hint ?? null,
    });
  }

  return json(200, {
    id: employee.employee_id || rawId,
    employee_uuid: employee.id,
    data: shapeBankForUi(saveLegacy.data),
  });
}