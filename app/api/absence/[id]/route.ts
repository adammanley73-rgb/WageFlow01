// C:\Projects\wageflow01\app\api\absence\[id]\route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isOverlapError(err: any) {
  const code = err?.code ? String(err.code) : "";
  if (code === "23P01") return true;

  const msg = err?.message ? String(err.message).toLowerCase() : "";
  if (msg.includes("absences_no_overlap_per_employee")) return true;

  return false;
}

function getSupabaseAdminClientOrThrow() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are not set on the server."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

async function getCompanyIdFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get("active_company_id")?.value || cookieStore.get("company_id")?.value || null;
}

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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const absenceId = typeof id === "string" ? id.trim() : "";

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const companyId = await getCompanyIdFromCookies();
    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
    }

    const supabase = getSupabaseAdminClientOrThrow();

    const { data: absence, error } = await supabase
      .from("absences")
      .select("id, company_id, employee_id, type, first_day, last_day_expected, last_day_actual, reference_notes, status")
      .eq("company_id", companyId)
      .eq("id", absenceId)
      .single<AbsenceRow>();

    if (error || !absence) {
      console.error("Load absence error:", error);
      return json(404, { ok: false, code: "NOT_FOUND", message: "Absence not found." });
    }

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("first_name, last_name, employee_number")
      .eq("company_id", companyId)
      .eq("id", absence.employee_id)
      .single<EmployeeRow>();

    if (empError) {
      console.warn("Could not load employee for absence:", empError);
    }

    let employeeLabel = "Employee";
    if (employee) {
      const name = [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim() || "Employee";
      const number = employee.employee_number || "";
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
  } catch (err) {
    console.error("Unexpected error loading absence:", err);
    return json(500, { ok: false, code: "UNEXPECTED_ERROR", message: "Could not load this absence." });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const absenceId = typeof id === "string" ? id.trim() : "";

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const companyId = await getCompanyIdFromCookies();
    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
    }

    const body = await request.json();

    const firstDay: string | null = body?.first_day ?? null;
    const lastDayExpected: string | null = body?.last_day_expected ?? null;
    const lastDayActual: string | null = body?.last_day_actual ?? null;
    const referenceNotes: string | null = body?.reference_notes ?? null;

    if (!firstDay || !lastDayExpected) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "First day and expected last day are required.",
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

    const supabase = getSupabaseAdminClientOrThrow();

    const { data: current, error: currentError } = await supabase
      .from("absences")
      .select("id, employee_id")
      .eq("company_id", companyId)
      .eq("id", absenceId)
      .single<{ id: string; employee_id: string }>();

    if (currentError || !current) {
      console.error("Load current absence for update error:", currentError);
      return json(404, { ok: false, code: "NOT_FOUND", message: "Absence not found." });
    }

    const { data: rows, error: rowsError } = await supabase
      .from("absences")
      .select("id, first_day, last_day_expected, last_day_actual")
      .eq("company_id", companyId)
      .eq("employee_id", current.employee_id)
      .neq("id", absenceId)
      .neq("status", "cancelled")
      .returns<AbsenceOverlapRow[]>();

    if (rowsError) {
      console.error("Update overlap DB error:", rowsError);
      return json(500, { ok: false, code: "DB_ERROR", message: "Could not check existing absences." });
    }

    const newStart = firstDay;
    const newEnd = lastDayActual || lastDayExpected || firstDay;

    const conflicts =
      (rows || [])
        .map((row) => {
          const start = row.first_day;
          const end = row.last_day_actual || row.last_day_expected || row.first_day;
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

      console.error("Update absence error:", updateError);
      return json(500, { ok: false, code: "DB_ERROR", message: "Could not update this absence. Please try again." });
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error("Unexpected error updating absence:", err);
    return json(500, { ok: false, code: "UNEXPECTED_ERROR", message: "Unexpected error while updating this absence." });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const absenceId = typeof id === "string" ? id.trim() : "";

    if (!absenceId) {
      return json(400, { ok: false, code: "MISSING_ID", message: "Absence id is required." });
    }

    const companyId = await getCompanyIdFromCookies();
    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
    }

    const supabase = getSupabaseAdminClientOrThrow();

    const { data, error } = await supabase.from("absences").delete().eq("id", absenceId).eq("company_id", companyId).select("id");

    if (error) {
      console.error("Delete absence error:", error);
      return json(500, { ok: false, code: "DB_ERROR", message: "Could not delete this absence." });
    }

    const deletedCount = Array.isArray(data) ? data.length : 0;

    if (deletedCount === 0) {
      return json(404, {
        ok: false,
        code: "NOT_FOUND",
        message: "Absence not found for this company.",
        id: absenceId,
        companyId,
      });
    }

    return json(200, { ok: true, deletedId: (data as Array<{ id: string }>)[0].id, deletedCount });
  } catch (err) {
    console.error("Unexpected error deleting absence:", err);
    return json(500, { ok: false, code: "UNEXPECTED_ERROR", message: "Unexpected error while deleting this absence." });
  }
}