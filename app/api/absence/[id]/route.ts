// C:\Projects\wageflow01\app\api\absence\[id]\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type AbsenceRow = {
  id: string;
  company_id: string;
  employee_id: string;
  type: string;
  first_day: string;
  last_day_expected: string | null;
  last_day_actual: string | null;
  reference_notes: string | null;
  status: string | null;
};

type EmployeeRow = {
  id?: string;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
};

type EmployeeContractRow = {
  id: string;
  contract_number: string | null;
  job_title: string | null;
  status: string | null;
  start_date: string | null;
  leave_date: string | null;
  pay_after_leaving?: boolean | null;
};

type AbsenceOverlapRow = {
  id: string;
  first_day: string;
  last_day_expected: string | null;
  last_day_actual: string | null;
};

type SicknessPeriodRow = {
  id: string;
  absence_id: string;
  company_id: string | null;
  employee_id: string | null;
  start_date: string;
  end_date: string;
};

type PatchBody = {
  first_day?: unknown;
  firstDay?: unknown;
  last_day_expected?: unknown;
  lastDayExpected?: unknown;
  last_day_actual?: unknown;
  lastDayActual?: unknown;
  reference_notes?: unknown;
  referenceNotes?: unknown;
  selected_contract_ids?: unknown;
  selectedContractIds?: unknown;
  status?: unknown;
};

const ALLOWED_ABSENCE_STATUSES = new Set([
  "draft",
  "scheduled",
  "active",
  "completed",
  "cancelled",
]);

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

function normaliseStatusValue(value: unknown): string | null {
  const status = toTrimmedString(value).toLowerCase();
  if (!status) return null;
  return ALLOWED_ABSENCE_STATUSES.has(status) ? status : null;
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

async function loadSelectedContractIds(
  supabase: any,
  companyId: string,
  absenceId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("absence_contract_targets")
      .select("contract_id")
      .eq("company_id", companyId)
      .eq("absence_id", absenceId);

    if (error) return [];

    const rows = Array.isArray(data) ? data : [];
    return uniqueStrings(rows.map((row: any) => toTrimmedString(row?.contract_id)).filter(Boolean));
  } catch {
    return [];
  }
}

async function loadEmployeeContracts(
  supabase: any,
  companyId: string,
  employeeId: string,
  contractIds: string[]
): Promise<EmployeeContractRow[]> {
  if (!companyId || !employeeId || contractIds.length === 0) return [];

  const { data, error } = await supabase
    .from("employee_contracts")
    .select("id, contract_number, job_title, status, start_date, leave_date, pay_after_leaving")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .in("id", contractIds);

  if (error) return [];

  const rows = (Array.isArray(data) ? data : []) as EmployeeContractRow[];
  const byId = new Map<string, EmployeeContractRow>();

  for (const row of rows) {
    const id = toTrimmedString(row?.id);
    if (!id) continue;
    byId.set(id, row);
  }

  return contractIds
    .map((id) => byId.get(id))
    .filter((row): row is EmployeeContractRow => Boolean(row));
}

async function loadSicknessPeriod(
  supabase: any,
  companyId: string,
  absenceId: string
): Promise<SicknessPeriodRow | null> {
  const { data, error } = await supabase
    .from("sickness_periods")
    .select("id, absence_id, company_id, employee_id, start_date, end_date")
    .eq("company_id", companyId)
    .eq("absence_id", absenceId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SicknessPeriodRow;
}

async function syncSicknessPeriod(args: {
  supabase: any;
  companyId: string;
  absenceId: string;
  employeeId: string;
  startDate: string;
  endDate: string;
}): Promise<{ error: unknown | null }> {
  const { supabase, companyId, absenceId, employeeId, startDate, endDate } = args;

  const updatePayload = {
    company_id: companyId,
    employee_id: employeeId,
    start_date: startDate,
    end_date: endDate,
  };

  const { data: updatedRows, error: updateError } = await supabase
    .from("sickness_periods")
    .update(updatePayload)
    .eq("company_id", companyId)
    .eq("absence_id", absenceId)
    .select("id");

  if (updateError) {
    return { error: updateError };
  }

  if (Array.isArray(updatedRows) && updatedRows.length > 0) {
    return { error: null };
  }

  const { error: insertError } = await supabase
    .from("sickness_periods")
    .insert({
      absence_id: absenceId,
      company_id: companyId,
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
    });

  return { error: insertError ?? null };
}

async function syncContractTargets(args: {
  supabase: any;
  companyId: string;
  absenceId: string;
  employeeId: string;
  contractIds: string[];
}): Promise<{ error: unknown | null }> {
  const { supabase, companyId, absenceId, employeeId, contractIds } = args;

  const { error: deleteError } = await supabase
    .from("absence_contract_targets")
    .delete()
    .eq("company_id", companyId)
    .eq("absence_id", absenceId);

  if (deleteError) {
    return { error: deleteError };
  }

  if (contractIds.length === 0) {
    return { error: null };
  }

  const rows = contractIds.map((contractId) => ({
    company_id: companyId,
    absence_id: absenceId,
    employee_id: employeeId,
    contract_id: contractId,
  }));

  const { error: insertError } = await supabase
    .from("absence_contract_targets")
    .insert(rows);

  return { error: insertError ?? null };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const gate = await requireAuthAndMembership();
  if (!gate.ok) return gate.response;

  const { supabase, companyId } = gate;

  try {
    const resolvedParams = await params;
    const absenceId = toTrimmedString(resolvedParams?.id);

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const { data: absenceRaw, error } = await supabase
      .from("absences")
      .select("id, company_id, employee_id, type, first_day, last_day_expected, last_day_actual, reference_notes, status")
      .eq("company_id", companyId)
      .eq("id", absenceId)
      .maybeSingle();

    if (error) {
      return json(statusFromErr(error), {
        ok: false,
        code: "DB_ERROR",
        message: "Could not load this absence.",
      });
    }

    const absence = (absenceRaw as AbsenceRow | null) ?? null;

    if (!absence) {
      return json(404, { ok: false, code: "NOT_FOUND", message: "Absence not found." });
    }

    const { data: employeeRaw } = await supabase
      .from("employees")
      .select("id, first_name, last_name, employee_number")
      .eq("company_id", companyId)
      .eq("id", absence.employee_id)
      .maybeSingle();

    const employee = (employeeRaw as EmployeeRow | null) ?? null;

    let employeeLabel = "Employee";
    if (employee) {
      const first = toTrimmedString(employee.first_name);
      const last = toTrimmedString(employee.last_name);
      const name = [first, last].filter(Boolean).join(" ").trim() || "Employee";
      const number = toTrimmedString(employee.employee_number);
      employeeLabel = number ? `${name} (${number})` : name;
    }

    const selectedContractIds =
      absence.type === "sickness"
        ? await loadSelectedContractIds(supabase, companyId, absence.id)
        : [];

    const selectedContracts =
      selectedContractIds.length > 0
        ? await loadEmployeeContracts(supabase, companyId, absence.employee_id, selectedContractIds)
        : [];

    const sicknessPeriod =
      absence.type === "sickness"
        ? await loadSicknessPeriod(supabase, companyId, absence.id)
        : null;

    return json(200, {
      ok: true,
      absence: {
        id: absence.id,
        employeeId: absence.employee_id,
        employeeLabel,
        type: absence.type,
        firstDay: absence.first_day,
        lastDayExpected: absence.last_day_expected,
        lastDayActual: absence.last_day_actual,
        referenceNotes: absence.reference_notes,
        status: absence.status || null,
        selectedContractIds,
        selected_contract_ids: selectedContractIds,
        selectedContracts: selectedContracts.map((row) => ({
          id: toTrimmedString(row.id),
          contractNumber: toTrimmedString(row.contract_number) || "Unnamed contract",
          jobTitle: toTrimmedString(row.job_title),
          status: toTrimmedString(row.status).toLowerCase() || "active",
          startDate: toTrimmedString(row.start_date),
          leaveDate: toTrimmedString(row.leave_date),
          payAfterLeaving: row.pay_after_leaving === true,
        })),
        sicknessPeriod: sicknessPeriod
          ? {
              id: sicknessPeriod.id,
              startDate: sicknessPeriod.start_date,
              endDate: sicknessPeriod.end_date,
            }
          : null,
      },
      employee: {
        id: absence.employee_id,
        label: employeeLabel,
        firstName: employee ? toTrimmedString(employee.first_name) : "",
        lastName: employee ? toTrimmedString(employee.last_name) : "",
        employeeNumber: employee ? toTrimmedString(employee.employee_number) : "",
      },
    });
  } catch {
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Could not load this absence.",
    });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const gate = await requireAuthAndMembership();
  if (!gate.ok) return gate.response;

  const { supabase, companyId } = gate;

  try {
    const resolvedParams = await params;
    const absenceId = toTrimmedString(resolvedParams?.id);

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const body = (await request.json().catch(() => null)) as PatchBody | null;
    const bodyRecord = body as Record<string, unknown> | null;

    const firstDay = toTrimmedString(body?.first_day ?? body?.firstDay) || null;
    const lastDayExpected = toTrimmedString(body?.last_day_expected ?? body?.lastDayExpected) || null;
    const lastDayActual = toTrimmedString(body?.last_day_actual ?? body?.lastDayActual) || null;

    const referenceNotesRaw = body?.reference_notes ?? body?.referenceNotes;
    const referenceNotes =
      referenceNotesRaw == null
        ? null
        : typeof referenceNotesRaw === "string"
          ? referenceNotesRaw
          : String(referenceNotesRaw);

    const selectedContractsProvided = Boolean(
      bodyRecord &&
        (Object.prototype.hasOwnProperty.call(bodyRecord, "selected_contract_ids") ||
          Object.prototype.hasOwnProperty.call(bodyRecord, "selectedContractIds"))
    );

    const requestedContractIds = normaliseIdArray(
      body?.selected_contract_ids ?? body?.selectedContractIds ?? []
    );

    const statusProvided = Boolean(
      bodyRecord && Object.prototype.hasOwnProperty.call(bodyRecord, "status")
    );
    const requestedStatus = statusProvided ? normaliseStatusValue(body?.status) : null;

    if (statusProvided && !requestedStatus) {
      return json(400, {
        ok: false,
        code: "INVALID_STATUS",
        message: "Status must be one of: draft, scheduled, active, completed, cancelled.",
      });
    }

    if (!firstDay || !lastDayExpected) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "First day and expected last day are required.",
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

    const { data: currentRaw, error: currentError } = await supabase
      .from("absences")
      .select("id, employee_id, type, first_day, last_day_expected, last_day_actual, reference_notes, status")
      .eq("company_id", companyId)
      .eq("id", absenceId)
      .maybeSingle();

    if (currentError) {
      return json(statusFromErr(currentError), {
        ok: false,
        code: "DB_ERROR",
        message: "Could not load this absence.",
      });
    }

    const current = (currentRaw as AbsenceRow | null) ?? null;

    if (!current) {
      return json(404, { ok: false, code: "NOT_FOUND", message: "Absence not found." });
    }

    const { data: rowsRaw, error: rowsError } = await supabase
      .from("absences")
      .select("id, first_day, last_day_expected, last_day_actual")
      .eq("company_id", companyId)
      .eq("employee_id", current.employee_id)
      .neq("id", absenceId)
      .neq("status", "cancelled");

    if (rowsError) {
      return json(statusFromErr(rowsError), {
        ok: false,
        code: "DB_ERROR",
        message: "Could not check existing absences.",
      });
    }

    const rows = (Array.isArray(rowsRaw) ? rowsRaw : []) as AbsenceOverlapRow[];

    const newStart = firstDay;
    const newEnd = lastDayActual || lastDayExpected || firstDay;

    const conflicts = rows
      .map((row) => {
        const start = toTrimmedString(row.first_day);
        const end = toTrimmedString(row.last_day_actual || row.last_day_expected || row.first_day);
        if (!start || !end || !isIsoDateOnly(start) || !isIsoDateOnly(end)) return null;

        const overlaps = newStart <= end && newEnd >= start;
        if (!overlaps) return null;

        return { id: row.id, startDate: start, endDate: end };
      })
      .filter((x): x is { id: string; startDate: string; endDate: string } => Boolean(x));

    if (conflicts.length > 0) {
      return json(409, {
        ok: false,
        code: "ABSENCE_DATE_OVERLAP",
        message:
          "These dates overlap another existing absence for this employee. Change the dates or cancel the other absence.",
        conflicts,
      });
    }

    let previousContractIds: string[] = [];
    let hasEmployeeContracts = false;

    if (current.type === "sickness" && selectedContractsProvided) {
      previousContractIds = await loadSelectedContractIds(supabase, companyId, absenceId);

      const { data: validContractsRaw, error: validContractsError } = await supabase
        .from("employee_contracts")
        .select("id")
        .eq("company_id", companyId)
        .eq("employee_id", current.employee_id);

      if (validContractsError) {
        return json(statusFromErr(validContractsError), {
          ok: false,
          code: "DB_ERROR",
          message: "Could not validate selected contracts.",
        });
      }

      const validIds = new Set(
        (Array.isArray(validContractsRaw) ? validContractsRaw : [])
          .map((row: any) => toTrimmedString(row?.id))
          .filter(Boolean)
      );

      hasEmployeeContracts = validIds.size > 0;

      if (hasEmployeeContracts && requestedContractIds.length === 0) {
        return json(400, {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Select at least one contract affected by this sickness absence.",
        });
      }

      const invalidIds = requestedContractIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        return json(400, {
          ok: false,
          code: "INVALID_CONTRACT_SELECTION",
          message: "One or more selected contracts do not belong to this employee.",
          invalidContractIds: invalidIds,
          invalid_contract_ids: invalidIds,
        });
      }
    }

    const previousPeriod = current.type === "sickness"
      ? await loadSicknessPeriod(supabase, companyId, absenceId)
      : null;

    const updates = {
      first_day: firstDay,
      last_day_expected: lastDayExpected,
      last_day_actual: lastDayActual,
      reference_notes: referenceNotes,
      status: statusProvided ? requestedStatus : current.status,
    };

    const { error: updateError } = await supabase
      .from("absences")
      .update(updates)
      .eq("company_id", companyId)
      .eq("id", absenceId);

    if (updateError) {
      if (isOverlapError(updateError)) {
        return json(409, {
          ok: false,
          code: "ABSENCE_DATE_OVERLAP",
          message:
            "These dates overlap another existing absence for this employee. Change the dates or cancel the other absence.",
          conflicts: [],
        });
      }

      return json(statusFromErr(updateError), {
        ok: false,
        code: "DB_ERROR",
        message: "Could not update this absence. Please try again.",
      });
    }

    if (current.type === "sickness") {
      const periodSync = await syncSicknessPeriod({
        supabase,
        companyId,
        absenceId,
        employeeId: current.employee_id,
        startDate: firstDay,
        endDate: lastDayActual || lastDayExpected,
      });

      if (periodSync.error) {
        await supabase
          .from("absences")
          .update({
            first_day: current.first_day,
            last_day_expected: current.last_day_expected,
            last_day_actual: current.last_day_actual,
            reference_notes: current.reference_notes,
            status: current.status,
          })
          .eq("company_id", companyId)
          .eq("id", absenceId);

        return json(statusFromErr(periodSync.error), {
          ok: false,
          code: "SICKNESS_PERIOD_SYNC_FAILED",
          message: "Absence dates were not saved because the sickness period could not be updated.",
        });
      }

      if (selectedContractsProvided) {
        const targetSync = await syncContractTargets({
          supabase,
          companyId,
          absenceId,
          employeeId: current.employee_id,
          contractIds: requestedContractIds,
        });

        if (targetSync.error) {
          await supabase
            .from("absences")
            .update({
              first_day: current.first_day,
              last_day_expected: current.last_day_expected,
              last_day_actual: current.last_day_actual,
              reference_notes: current.reference_notes,
              status: current.status,
            })
            .eq("company_id", companyId)
            .eq("id", absenceId);

          if (previousPeriod) {
            await syncSicknessPeriod({
              supabase,
              companyId,
              absenceId,
              employeeId: current.employee_id,
              startDate: previousPeriod.start_date,
              endDate: previousPeriod.end_date,
            });
          } else {
            await supabase
              .from("sickness_periods")
              .delete()
              .eq("company_id", companyId)
              .eq("absence_id", absenceId);
          }

          await syncContractTargets({
            supabase,
            companyId,
            absenceId,
            employeeId: current.employee_id,
            contractIds: previousContractIds,
          });

          return json(statusFromErr(targetSync.error), {
            ok: false,
            code: "ABSENCE_TARGETS_SYNC_FAILED",
            message: "Absence was not saved because contract targets could not be updated.",
          });
        }
      }
    }

    const selectedContractIds =
      current.type === "sickness"
        ? await loadSelectedContractIds(supabase, companyId, absenceId)
        : [];

    return json(200, {
      ok: true,
      selectedContractIds,
      selected_contract_ids: selectedContractIds,
      status: updates.status,
    });
  } catch {
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error while updating this absence.",
    });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const gate = await requireAuthAndMembership();
  if (!gate.ok) return gate.response;

  const { supabase, companyId } = gate;

  try {
    const resolvedParams = await params;
    const absenceId = toTrimmedString(resolvedParams?.id);

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const { data: currentRaw, error: currentError } = await supabase
      .from("absences")
      .select("id, type")
      .eq("id", absenceId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (currentError) {
      return json(statusFromErr(currentError), {
        ok: false,
        code: "DB_ERROR",
        message: "Could not load this absence.",
      });
    }

    const current = (currentRaw as { id: string; type?: string | null } | null) ?? null;

    if (!current) {
      return json(404, {
        ok: false,
        code: "NOT_FOUND",
        message: "Absence not found for this company.",
        id: absenceId,
        companyId,
      });
    }

    if (current.type === "sickness") {
      const { error: deleteTargetError } = await supabase
        .from("absence_contract_targets")
        .delete()
        .eq("company_id", companyId)
        .eq("absence_id", absenceId);

      if (deleteTargetError) {
        return json(statusFromErr(deleteTargetError), {
          ok: false,
          code: "DB_ERROR",
          message: "Could not delete linked contract targets for this absence.",
        });
      }

      const { error: deletePeriodError } = await supabase
        .from("sickness_periods")
        .delete()
        .eq("company_id", companyId)
        .eq("absence_id", absenceId);

      if (deletePeriodError) {
        return json(statusFromErr(deletePeriodError), {
          ok: false,
          code: "DB_ERROR",
          message: "Could not delete linked sickness period for this absence.",
        });
      }
    }

    const { data: deletedRaw, error } = await supabase
      .from("absences")
      .delete()
      .eq("id", absenceId)
      .eq("company_id", companyId)
      .select("id");

    if (error) {
      return json(statusFromErr(error), {
        ok: false,
        code: "DB_ERROR",
        message: "Could not delete this absence.",
      });
    }

    const deleted = Array.isArray(deletedRaw) ? (deletedRaw as Array<{ id: string }>) : [];
    const deletedCount = deleted.length;

    if (deletedCount === 0) {
      return json(404, {
        ok: false,
        code: "NOT_FOUND",
        message: "Absence not found for this company.",
        id: absenceId,
        companyId,
      });
    }

    return json(200, {
      ok: true,
      deletedId: deleted[0].id,
      deletedCount,
    });
  } catch {
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error while deleting this absence.",
    });
  }
}