// C:\Projects\wageflow01\app\api\absence\parental-bereavement\route.ts

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

function getAdminClientOrThrow() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Server config missing. SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.");
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function isOverlapError(err: any) {
  const code = err?.code ? String(err.code) : "";
  if (code === "23P01") return true;

  const msg = err?.message ? String(err.message).toLowerCase() : "";
  if (msg.includes("absences_no_overlap_per_employee")) return true;

  return false;
}

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function toUtcDate(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

function addDaysUtc(dt: Date, days: number) {
  return new Date(dt.getTime() + days * 24 * 60 * 60 * 1000);
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function POST(req: Request) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Invalid JSON body." });
  }

  const cookieStore = await cookies();
  const activeCompanyId =
    cookieStore.get("active_company_id")?.value ?? cookieStore.get("company_id")?.value ?? "";

  if (!activeCompanyId) {
    return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
  }

  const employeeId = String(body?.employeeId || "").trim();
  if (!employeeId) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Missing employeeId." });

  const eventDate = String(body?.eventDate || "").trim();
  if (!isIsoDate(eventDate)) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Invalid event date." });

  const ev = toUtcDate(eventDate);
  if (!ev) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Invalid event date." });

  const limit = addDaysUtc(ev, 56 * 7);

  const leaveOption = String(body?.leaveOption || "one_week");

  const blocks = Array.isArray(body?.blocks) ? body.blocks : [];
  if (leaveOption === "two_weeks_separate" && blocks.length !== 2) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Two blocks are required for two separate weeks." });
  }
  if (leaveOption !== "two_weeks_separate" && blocks.length !== 1) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "One block is required." });
  }

  const parsedBlocks: { startStr: string; endStr: string; start: Date; end: Date }[] = [];

  for (const b of blocks) {
    const startStr = String(b?.startDate || "").trim();
    const endStr = String(b?.endDate || "").trim();

    if (!isIsoDate(startStr) || !isIsoDate(endStr)) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Block dates must be valid." });
    }

    const start = toUtcDate(startStr);
    const end = toUtcDate(endStr);
    if (!start || !end) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Block dates must be valid." });

    if (end < start) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Block end date cannot be before start date." });
    if (start < ev) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Leave must start on or after the event date." });
    if (end > limit) return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Leave must finish within 56 weeks of the event date." });

    parsedBlocks.push({ startStr, endStr, start, end });
  }

  if (parsedBlocks.length === 2) {
    if (rangesOverlap(parsedBlocks[0].start, parsedBlocks[0].end, parsedBlocks[1].start, parsedBlocks[1].end)) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "The two weeks overlap. Separate the dates." });
    }
  }

  const rawNotes = body?.notes ? String(body.notes) : "";
  const combinedNotes = rawNotes ? `Event date: ${eventDate}. ${rawNotes}` : `Event date: ${eventDate}.`;

  const rowsToInsert = parsedBlocks.map((b) => ({
    company_id: activeCompanyId,
    employee_id: employeeId,
    type: "parental_bereavement",
    first_day: b.startStr,
    last_day_expected: b.endStr,
    last_day_actual: null,
    reference_notes: combinedNotes,
    status: "draft",
  }));

  let supabase;
  try {
    supabase = getAdminClientOrThrow();
  } catch (e: any) {
    return json(500, { ok: false, code: "SERVER_MISCONFIGURED", message: e?.message || "Server config missing." });
  }

  const { data, error } = await supabase.from("absences").insert(rowsToInsert).select("id");

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

  return json(200, { ok: true, ids: (data || []).map((r: any) => r.id) });
}