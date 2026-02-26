// C:\Projects\wageflow01\app\api\absence\sickness\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function statusFromErr(err: any, fallback = 500): number {
  const s = Number(err?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

function isOverlapError(err: any) {
  const code = err?.code ? String(err.code) : "";
  if (code === "23P01") return true;

  const msg = err?.message ? String(err.message).toLowerCase() : "";
  if (msg.includes("absences_no_overlap_per_employee")) return true;

  return false;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  try {
    const body = await request.json();

    const employeeId = String(body?.employee_id ?? body?.employeeId ?? "").trim();
    const firstDay = String(body?.first_day ?? body?.firstDay ?? "").trim();
    const lastDayExpected = String(body?.last_day_expected ?? body?.lastDayExpected ?? "").trim();
    const lastDayActualRaw = body?.last_day_actual ?? body?.lastDayActual ?? null;
    const lastDayActual = lastDayActualRaw ? String(lastDayActualRaw).trim() : null;
    const referenceNotes = body?.reference_notes ?? body?.notes ?? null;

    if (!employeeId || !firstDay || !lastDayExpected) {
      return json(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Employee, first day and expected last day are required.",
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
    const companyId =
      String(body?.company_id ?? body?.companyId ?? "").trim() ||
      jar.get("active_company_id")?.value ||
      jar.get("company_id")?.value ||
      "";

    if (!companyId) {
      return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
    }

    const { data: employeeRow, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) {
      return json(statusFromErr(employeeError), {
        ok: false,
        code: "EMPLOYEE_LOAD_FAILED",
        message: "Failed to load employee.",
        details: employeeError.message,
      });
    }

    if (!employeeRow?.id || !employeeRow?.company_id) {
      return json(404, {
        ok: false,
        code: "EMPLOYEE_NOT_FOUND",
        message: "Employee not found.",
      });
    }

    if (String(employeeRow.company_id) !== String(companyId)) {
      return json(403, {
        ok: false,
        code: "EMPLOYEE_NOT_IN_COMPANY",
        message: "Employee does not belong to the active company.",
      });
    }

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
      .single();

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
        details: insertError.message ?? String(insertError),
      });
    }

    return json(200, { ok: true, absenceId: inserted?.id ?? null });
  } catch (err: any) {
    return json(500, {
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error while saving this sickness absence.",
      details: err?.message ?? String(err),
    });
  }
}
