// C:\Projects\wageflow01\app\api\absence\sickness\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SicknessBody = {
  employee_id?: unknown;
  employeeId?: unknown;
  first_day?: unknown;
  firstDay?: unknown;
  last_day_expected?: unknown;
  lastDayExpected?: unknown;
  last_day_actual?: unknown;
  lastDayActual?: unknown;
  reference_notes?: unknown;
  referenceNotes?: unknown;
  notes?: unknown;
  selected_contract_ids?: unknown;
  selectedContractIds?: unknown;
};

type EmployeeRow = {
  id: string;
  company_id: string | null;
};

type ContractRow = {
  id: string;
  employee_id: string | null;
  company_id: string | null;
  status: string | null;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function statusFromErr(err: unknown, fallback = 500): number {
  const anyErr = err as { status?: unknown } | null;
  const s = Number(anyErr?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

function isOverlapError(err: unknown) {
  const anyErr = err as { code?: unknown; message?: unknown } | null;

  const code = anyErr?.code ? String(anyErr.code) : "";
  if (code === "23P01") return true;

  const msg = anyErr?.message ? String(anyErr.message).toLowerCase() : "";
  if (msg.includes("absences_no_overlap_per_employee")) return true;

  return false;
}

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const trimmed = toTrimmedString(value);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}

function normaliseIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.map((item) => toTrimmedString(item)).filter(Boolean));
}

async function getCompanyIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();

  const active = toTrimmedString(cookieStore.get("active_company_id")?.value);
  if (active) return active;

  const legacy = toTrimmedString(cookieStore.get("company_id")?.value);
  if (legacy) return legacy;

  return null;
}

async function requireAuthAndMembership() {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return {
      ok: false as const,
      supabase,
      user: null,
      companyId: null,
      response: json(401, {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sign in required.",
      }),
    };
  }

  const companyId = await getCompanyIdFromCookies();
  if (!companyId) {
    return {
      ok: false as const,
      supabase,
      user: auth.user,
      companyId: null,
      response: json(400, {
        ok: false,
        code: "NO_COMPANY",
        message: "No active company selected.",
      }),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (membershipError) {
    return {
      ok: false as const,
      supabase,
      user: auth.user,
      companyId,
      response: json(statusFromErr(membershipError), {
        ok: false,
        code: "MEMBERSHIP_CHECK_FAILED",
        message: "Could not verify company access.",
      }),
    };
  }

  if (!membership) {
    return {
      ok: false as const,
      supabase,
      user: auth.user,
      companyId,
      response: json(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "You do not have access to the active company.",
      }),
    };
  }

  return {
    ok: true as const,
    supabase,
    user: auth.user,
    companyId,
    membership,
    response: null,
  };
}

export async function POST(request: Request) {
  const gate = await requireAuthAndMembership();
  if (!gate.ok) return gate.response;

  const { supabase, companyId } = gate;

  try {
    const body = (await request.json().catch(() => null)) as SicknessBody | null;

    const employeeId = toTrimmedString(body?.employee_id ?? body?.employeeId ?? "");
    const firstDay = toTrimmedString(body?.first_day ?? body?.firstDay ?? "");
    const lastDayExpected = toTrimmedString(body?.last_day_expected ?? body?.lastDayExpected ?? "");
    const lastDayActualValue = body?.last_day_actual ?? body?.lastDayActual ?? null;
    const lastDayActual = toTrimmedString(lastDayActualValue) || null;

    const referenceNotesRaw =
      body?.reference_notes ?? body?.referenceNotes ?? body?.notes ?? null;

    const selectedContractIds = normaliseIdArray(
      body?.selected_contract_ids ?? body?.selectedContractIds ?? []
    );

    if (!employeeId || !firstDay || !lastDayExpected) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Employee, first day and expected last day are required.",
      });
    }

    if (
      !isIsoDateOnly(firstDay) ||
      !isIsoDateOnly(lastDayExpected) ||
      (lastDayActual && !isIsoDateOnly(lastDayActual))
    ) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Dates must be in YYYY-MM-DD format.",
      });
    }

    if (lastDayExpected < firstDay) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Expected last day cannot be earlier than the first day.",
      });
    }

    if (lastDayActual && lastDayActual < firstDay) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Actual last day cannot be earlier than the first day.",
      });
    }

    const { data: employeeRow, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("company_id", companyId)
      .eq("id", employeeId)
      .maybeSingle<EmployeeRow>();

    if (employeeError) {
      return json(statusFromErr(employeeError), {
        ok: false,
        code: "EMPLOYEE_LOAD_FAILED",
        message: "Failed to load employee.",
        details: (employeeError as any)?.message ?? String(employeeError),
      });
    }

    if (!employeeRow?.id || !employeeRow?.company_id) {
      return json(404, {
        ok: false,
        code: "EMPLOYEE_NOT_FOUND",
        message: "Employee not found for the active company.",
      });
    }

    if (String(employeeRow.company_id) !== String(companyId)) {
      return json(403, {
        ok: false,
        code: "EMPLOYEE_NOT_IN_COMPANY",
        message: "Employee does not belong to the active company.",
      });
    }

    const { data: contractRowsRaw, error: contractsError } = await supabase
      .from("employee_contracts")
      .select("id, employee_id, company_id, status")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId);

    if (contractsError) {
      return json(statusFromErr(contractsError), {
        ok: false,
        code: "CONTRACTS_LOAD_FAILED",
        message: "Failed to load employee contracts.",
        details: (contractsError as any)?.message ?? String(contractsError),
      });
    }

    const contractRows = (Array.isArray(contractRowsRaw) ? contractRowsRaw : []) as ContractRow[];
    const validContracts = contractRows.filter((row) => {
      const id = toTrimmedString(row?.id);
      const rowEmployeeId = toTrimmedString(row?.employee_id);
      const rowCompanyId = toTrimmedString(row?.company_id);
      return Boolean(id && rowEmployeeId === employeeId && rowCompanyId === companyId);
    });

    const validContractIds = new Set(validContracts.map((row) => toTrimmedString(row.id)));
    const hasAnyContracts = validContracts.length > 0;

    if (hasAnyContracts && selectedContractIds.length === 0) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Select at least one contract affected by this sickness absence.",
      });
    }

    const invalidSelectedIds = selectedContractIds.filter((id) => !validContractIds.has(id));
    if (invalidSelectedIds.length > 0) {
      return json(400, {
        ok: false,
        code: "INVALID_CONTRACT_SELECTION",
        message: "One or more selected contracts are invalid for this employee.",
        invalid_contract_ids: invalidSelectedIds,
        invalidContractIds: invalidSelectedIds,
      });
    }

    const referenceNotes =
      referenceNotesRaw == null
        ? null
        : typeof referenceNotesRaw === "string"
          ? referenceNotesRaw
          : String(referenceNotesRaw);

    const insertPayload = {
      company_id: companyId,
      employee_id: employeeId,
      type: "sickness",
      status: "draft",
      first_day: firstDay,
      last_day_expected: lastDayExpected,
      last_day_actual: lastDayActual,
      reference_notes: referenceNotes,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("absences")
      .insert(insertPayload)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (insertError) {
      if (isOverlapError(insertError)) {
        return json(409, {
          ok: false,
          code: "ABSENCE_DATE_OVERLAP",
          message:
            "These dates overlap another existing absence for this employee. Change the dates or cancel the other absence.",
        });
      }

      return json(statusFromErr(insertError), {
        ok: false,
        code: "DB_ERROR",
        message: "Could not create sickness absence. Please try again.",
        details: (insertError as any)?.message ?? String(insertError),
      });
    }

    const absenceId = toTrimmedString(inserted?.id);
    if (!absenceId) {
      return json(500, {
        ok: false,
        code: "ABSENCE_CREATE_FAILED",
        message: "Sickness absence was created without an ID.",
      });
    }

    const sicknessPayload = {
      absence_id: absenceId,
      company_id: companyId,
      employee_id: employeeId,
      start_date: firstDay,
      end_date: lastDayActual || lastDayExpected,
    };

    const { error: sicknessError } = await supabase
      .from("sickness_periods")
      .insert(sicknessPayload);

    if (sicknessError) {
      await supabase
        .from("absences")
        .delete()
        .eq("id", absenceId)
        .eq("company_id", companyId);

      return json(statusFromErr(sicknessError), {
        ok: false,
        code: "SICKNESS_PERIOD_SAVE_FAILED",
        message: "Sickness absence was not saved because the sickness period could not be stored.",
        details: (sicknessError as any)?.message ?? String(sicknessError),
      });
    }

    if (selectedContractIds.length > 0) {
      const targetRows = selectedContractIds.map((contractId) => ({
        company_id: companyId,
        absence_id: absenceId,
        employee_id: employeeId,
        contract_id: contractId,
      }));

      const { error: targetInsertError } = await supabase
        .from("absence_contract_targets")
        .insert(targetRows);

      if (targetInsertError) {
        await supabase
          .from("sickness_periods")
          .delete()
          .eq("absence_id", absenceId);

        await supabase
          .from("absences")
          .delete()
          .eq("id", absenceId)
          .eq("company_id", companyId);

        return json(statusFromErr(targetInsertError), {
          ok: false,
          code: "ABSENCE_TARGETS_SAVE_FAILED",
          message: "Sickness absence was not saved because contract targets could not be stored.",
          details: (targetInsertError as any)?.message ?? String(targetInsertError),
        });
      }
    }

    return json(200, {
      ok: true,
      absenceId,
      selected_contract_ids: selectedContractIds,
      selectedContractIds,
      status: "draft",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error while saving this sickness absence.",
      details: msg,
    });
  }
}