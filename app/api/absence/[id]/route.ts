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
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
};

type AbsenceOverlapRow = {
  id: string;
  first_day: string;
  last_day_expected: string | null;
  last_day_actual: string | null;
};

type PatchBody = {
  first_day?: unknown;
  last_day_expected?: unknown;
  last_day_actual?: unknown;
  reference_notes?: unknown;
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
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

async function getCompanyIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();

  const a = toTrimmedString(cookieStore.get("active_company_id")?.value);
  if (a) return a;

  const legacy = toTrimmedString(cookieStore.get("company_id")?.value);
  if (legacy) return legacy;

  return null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  try {
    const resolvedParams = await params;
    const absenceId = toTrimmedString(resolvedParams?.id);

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const companyId = await getCompanyIdFromCookies();
    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
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
      .select("first_name, last_name, employee_number")
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
      },
    });
  } catch {
    return json(500, { ok: false, code: "UNEXPECTED_ERROR", message: "Could not load this absence." });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  try {
    const resolvedParams = await params;
    const absenceId = toTrimmedString(resolvedParams?.id);

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const companyId = await getCompanyIdFromCookies();
    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
    }

    const body = (await request.json().catch(() => null)) as PatchBody | null;

    const firstDay = toTrimmedString(body?.first_day) || null;
    const lastDayExpected = toTrimmedString(body?.last_day_expected) || null;
    const lastDayActual = toTrimmedString(body?.last_day_actual) || null;

    const referenceNotesRaw = body?.reference_notes;
    const referenceNotes =
      referenceNotesRaw == null ? null : typeof referenceNotesRaw === "string" ? referenceNotesRaw : String(referenceNotesRaw);

    if (!firstDay || !lastDayExpected) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "First day and expected last day are required.",
      });
    }

    if (!isIsoDateOnly(firstDay) || !isIsoDateOnly(lastDayExpected) || (lastDayActual && !isIsoDateOnly(lastDayActual))) {
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
      .select("id, employee_id")
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

    const current = (currentRaw as { id: string; employee_id: string } | null) ?? null;

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

    const conflicts =
      rows
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

    const updates = {
      first_day: firstDay,
      last_day_expected: lastDayExpected,
      last_day_actual: lastDayActual,
      reference_notes: referenceNotes,
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

    return json(200, { ok: true });
  } catch {
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error while updating this absence.",
    });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  try {
    const resolvedParams = await params;
    const absenceId = toTrimmedString(resolvedParams?.id);

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const companyId = await getCompanyIdFromCookies();
    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
    }

    const { data: deletedRaw, error } = await supabase
      .from("absences")
      .delete()
      .eq("id", absenceId)
      .eq("company_id", companyId)
      .select("id");

    if (error) {
      return json(statusFromErr(error), { ok: false, code: "DB_ERROR", message: "Could not delete this absence." });
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

    return json(200, { ok: true, deletedId: deleted[0].id, deletedCount });
  } catch {
    return json(500, { ok: false, code: "UNEXPECTED_ERROR", message: "Unexpected error while deleting this absence." });
  }
}