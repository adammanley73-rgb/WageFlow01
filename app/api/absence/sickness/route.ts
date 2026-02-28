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
  notes?: unknown;
  company_id?: unknown;
  companyId?: unknown;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
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

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  try {
    const body = (await request.json().catch(() => null)) as SicknessBody | null;

    const employeeId = toTrimmedString(body?.employee_id ?? body?.employeeId ?? "");
    const firstDay = toTrimmedString(body?.first_day ?? body?.firstDay ?? "");
    const lastDayExpected = toTrimmedString(body?.last_day_expected ?? body?.lastDayExpected ?? "");
    const lastDayActualRaw = body?.last_day_actual ?? body?.lastDayActual ?? null;
    const lastDayActual = lastDayActualRaw == null ? null : toTrimmedString(lastDayActualRaw);
    const referenceNotesRaw = body?.reference_notes ?? body?.notes ?? null;

    if (!employeeId || !firstDay || !lastDayExpected) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Employee, first day and expected last day are required.",
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

    const jar = await cookies();
    const bodyCompany = toTrimmedString(body?.company_id ?? body?.companyId ?? "");
    const cookieCompany =
      toTrimmedString(jar.get("active_company_id")?.value) || toTrimmedString(jar.get("company_id")?.value) || "";

    const companyId = bodyCompany || cookieCompany;

    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
    }

    const { data: employeeRow, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("id", employeeId)
      .maybeSingle<{ id: string; company_id: string | null }>();

    if (employeeError) {
      return json(statusFromErr(employeeError), {
        ok: false,
        code: "EMPLOYEE_LOAD_FAILED",
        message: "Failed to load employee.",
        details: (employeeError as any)?.message ?? String(employeeError),
      });
    }

    if (!employeeRow?.id || !employeeRow?.company_id) {
      return json(404, { ok: false, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found." });
    }

    if (String(employeeRow.company_id) !== String(companyId)) {
      return json(403, { ok: false, code: "EMPLOYEE_NOT_IN_COMPANY", message: "Employee does not belong to the active company." });
    }

    const referenceNotes =
      referenceNotesRaw == null ? null : typeof referenceNotesRaw === "string" ? referenceNotesRaw : String(referenceNotesRaw);

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

    return json(200, { ok: true, absenceId: inserted?.id ?? null });
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