// C:\Projects\wageflow01\app\api\absence\unpaid\route.ts
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

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function isOverlapError(err: any) {
  const code = err?.code ? String(err.code) : "";
  if (code === "23P01") return true;

  const msg = err?.message ? String(err.message).toLowerCase() : "";
  if (msg.includes("absences_no_overlap_per_employee")) return true;

  return false;
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, code: "INVALID_JSON", message: "Invalid JSON body." });
  }

  const cookieStore = await cookies();
  const activeCompanyId =
    String(body?.companyId ?? body?.company_id ?? "").trim() ||
    cookieStore.get("active_company_id")?.value ||
    cookieStore.get("company_id")?.value ||
    "";

  if (!activeCompanyId) {
    return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
  }

  const employeeId = String(body?.employeeId ?? body?.employee_id ?? "").trim();
  if (!employeeId) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Missing employeeId." });

  const startDate = String(body?.startDate ?? body?.first_day ?? "").trim();
  const endDate = String(body?.endDate ?? body?.last_day_expected ?? "").trim();

  if (!isIsoDate(startDate)) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Start date is required." });
  if (!isIsoDate(endDate)) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "End date is required." });
  if (startDate > endDate) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "End date cannot be before start date." });

  const totalDaysRaw = String(body?.totalDays ?? body?.total_days ?? body?.days ?? "").trim();
  const totalDaysNum = Number(totalDaysRaw);
  if (!totalDaysRaw || !Number.isFinite(totalDaysNum) || totalDaysNum <= 0) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Total days must be a positive number." });
  }

  const notesRaw = body?.notes ? String(body.notes) : "";
  const referenceNotes = notesRaw ? `Unpaid leave days: ${totalDaysRaw}. ${notesRaw}` : `Unpaid leave days: ${totalDaysRaw}.`;

  // Validate employee belongs to active company (RLS-scoped)
  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (empErr) {
    return json(statusFromErr(empErr), { ok: false, code: "EMPLOYEE_LOAD_FAILED", message: "Could not load employee." });
  }

  if (!emp?.id || !emp?.company_id) {
    return json(404, { ok: false, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found." });
  }

  if (String(emp.company_id) !== String(activeCompanyId)) {
    return json(403, { ok: false, code: "EMPLOYEE_NOT_IN_COMPANY", message: "Employee does not belong to the active company." });
  }

  const { data, error } = await supabase
    .from("absences")
    .insert([
      {
        company_id: activeCompanyId,
        employee_id: employeeId,
        type: "unpaid_leave",
        status: "draft",
        first_day: startDate,
        last_day_expected: endDate,
        last_day_actual: null,
        reference_notes: referenceNotes,
      },
    ])
    .select("id")
    .maybeSingle();

  if (error) {
    if (isOverlapError(error)) {
      return json(409, {
        ok: false,
        code: "ABSENCE_DATE_OVERLAP",
        message:
          "These dates overlap another existing absence for this employee. Change the dates or cancel the other absence.",
      });
    }

    return json(statusFromErr(error), { ok: false, code: "DB_ERROR", message: error.message || "Insert failed." });
  }

  return json(200, { ok: true, id: data?.id || null });
}
