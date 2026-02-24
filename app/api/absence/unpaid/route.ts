// C:\Users\adamm\Projects\wageflow01\app\api\absence\unpaid\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getAdminClientOrThrow() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Server config missing. SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.");
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

export async function POST(req: Request) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, message: "Invalid JSON body." });
  }

  const cookieStore = await cookies();
  const activeCompanyId =
    cookieStore.get("active_company_id")?.value ??
    cookieStore.get("company_id")?.value ??
    "";

  if (!activeCompanyId) {
    return json(400, { ok: false, message: "No active company selected." });
  }

  const employeeId = String(body?.employeeId || "").trim();
  if (!employeeId) return json(400, { ok: false, message: "Missing employeeId." });

  const startDate = String(body?.startDate || "").trim();
  const endDate = String(body?.endDate || "").trim();

  if (!isIsoDate(startDate)) return json(400, { ok: false, message: "Start date is required." });
  if (!isIsoDate(endDate)) return json(400, { ok: false, message: "End date is required." });
  if (startDate > endDate) return json(400, { ok: false, message: "End date cannot be before start date." });

  const totalDaysRaw = String(body?.totalDays || "").trim();
  const totalDaysNum = Number(totalDaysRaw);
  if (!totalDaysRaw || !Number.isFinite(totalDaysNum) || totalDaysNum <= 0) {
    return json(400, { ok: false, message: "Total days must be a positive number." });
  }

  const notesRaw = body?.notes ? String(body.notes) : "";
  const referenceNotes = notesRaw
    ? `Unpaid leave days: ${totalDaysRaw}. ${notesRaw}`
    : `Unpaid leave days: ${totalDaysRaw}.`;

  let supabase;
  try {
    supabase = getAdminClientOrThrow();
  } catch (e: any) {
    return json(500, { ok: false, message: e?.message || "Server config missing." });
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
    return json(500, { ok: false, message: error.message || "Insert failed." });
  }

  return json(200, { ok: true, id: data?.id || null });
}