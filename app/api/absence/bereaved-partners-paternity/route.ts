// C:\Projects\wageflow01\app\api\absence\bereaved-partners-paternity\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function getAdminClientOrThrow() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Server config missing. SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY not set."
    );
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
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

/**
 * POST /api/absence/bereaved-partners-paternity
 *
 * Recordkeeping-only v1 for the April 2026 right.
 * This leave is unpaid by default, so no pay schedule is created here.
 *
 * Expected body:
 * {
 *   employeeId: string,
 *   startDate: string, // YYYY-MM-DD
 *   endDate: string,   // YYYY-MM-DD
 *   notes?: string
 * }
 */
export async function POST(req: Request) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, code: "INVALID_JSON", message: "Invalid JSON body." });
  }

  const cookieStore = await cookies();
  const activeCompanyId =
    cookieStore.get("active_company_id")?.value ?? cookieStore.get("company_id")?.value ?? "";

  if (!activeCompanyId) {
    return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
  }

  const employeeId = String(body?.employeeId || "").trim();
  if (!employeeId) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Missing employeeId." });

  const startDate = String(body?.startDate || "").trim();
  const endDate = String(body?.endDate || "").trim();

  if (!isIsoDate(startDate)) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Start date is required." });
  if (!isIsoDate(endDate)) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "End date is required." });
  if (startDate > endDate) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "End date cannot be before start date." });

  const notesRaw = body?.notes ? String(body.notes) : "";
  const referenceNotes = notesRaw ? notesRaw : null;

  let supabase;
  try {
    supabase = getAdminClientOrThrow();
  } catch (e: any) {
    return json(500, { ok: false, code: "SERVER_CONFIG_MISSING", message: e?.message || "Server config missing." });
  }

  const { data, error } = await supabase
    .from("absences")
    .insert([
      {
        company_id: activeCompanyId,
        employee_id: employeeId,
        type: "bereaved_partners_paternity",
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

    return json(500, { ok: false, code: "DB_ERROR", message: error.message || "Insert failed." });
  }

  return json(200, { ok: true, id: data?.id || null });
}