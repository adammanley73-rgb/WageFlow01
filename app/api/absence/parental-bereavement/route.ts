// C:\Projects\wageflow01\app\api\absence\parental-bereavement\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type BlockIn = {
  startDate?: unknown;
  start_date?: unknown;
  endDate?: unknown;
  end_date?: unknown;
};

type BodyIn = {
  companyId?: unknown;
  company_id?: unknown;
  employeeId?: unknown;
  employee_id?: unknown;
  eventDate?: unknown;
  event_date?: unknown;
  leaveOption?: unknown;
  leave_option?: unknown;
  blocks?: unknown;
  notes?: unknown;
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

function toUtcDate(dateOnlyIso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnlyIso || "").trim());
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
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." });
  }

  let body: BodyIn | null = null;
  try {
    body = (await req.json().catch(() => null)) as BodyIn | null;
  } catch {
    body = null;
  }
  if (!body) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Invalid JSON body." });
  }

  const cookieStore = await cookies();
  const activeCompanyId =
    toTrimmedString(body.companyId ?? body.company_id ?? "") ||
    cookieStore.get("active_company_id")?.value ||
    cookieStore.get("company_id")?.value ||
    "";

  if (!activeCompanyId) {
    return json(400, { ok: false, code: "NO_COMPANY", message: "No active company selected." });
  }

  const employeeId = toTrimmedString(body.employeeId ?? body.employee_id ?? "");
  if (!employeeId) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Missing employeeId." });
  }

  // Validate employee belongs to active company (RLS-scoped)
  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("id", employeeId)
    .maybeSingle<{ id: string; company_id: string | null }>();

  if (empErr) {
    return json(statusFromErr(empErr), { ok: false, code: "EMPLOYEE_LOAD_FAILED", message: "Could not load employee." });
  }

  if (!emp?.id || !emp?.company_id) {
    return json(404, { ok: false, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found." });
  }

  if (String(emp.company_id) !== String(activeCompanyId)) {
    return json(403, { ok: false, code: "EMPLOYEE_NOT_IN_COMPANY", message: "Employee does not belong to the active company." });
  }

  const eventDate = toTrimmedString(body.eventDate ?? body.event_date ?? "");
  if (!isIsoDateOnly(eventDate)) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Invalid event date. Use YYYY-MM-DD." });
  }

  const ev = toUtcDate(eventDate);
  if (!ev) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Invalid event date." });
  }

  // 56 weeks = 56 * 7 days
  const limit = addDaysUtc(ev, 56 * 7);

  const leaveOption = toTrimmedString(body.leaveOption ?? body.leave_option ?? "one_week") || "one_week";

  const blocksRaw = body.blocks;
  const blocks = Array.isArray(blocksRaw) ? (blocksRaw as BlockIn[]) : [];

  if (leaveOption === "two_weeks_separate" && blocks.length !== 2) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Two blocks are required for two separate weeks." });
  }
  if (leaveOption !== "two_weeks_separate" && blocks.length !== 1) {
    return json(400, { ok: false, code: "VALIDATION_ERROR", message: "One block is required." });
  }

  const parsedBlocks: { startStr: string; endStr: string; start: Date; end: Date }[] = [];

  for (const b of blocks) {
    const startStr = toTrimmedString(b?.startDate ?? b?.start_date ?? "");
    const endStr = toTrimmedString(b?.endDate ?? b?.end_date ?? "");

    if (!isIsoDateOnly(startStr) || !isIsoDateOnly(endStr)) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Block dates must be valid YYYY-MM-DD." });
    }

    const start = toUtcDate(startStr);
    const end = toUtcDate(endStr);
    if (!start || !end) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Block dates must be valid." });
    }

    if (end < start) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Block end date cannot be before start date." });
    }
    if (start < ev) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Leave must start on or after the event date." });
    }
    if (end > limit) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "Leave must finish within 56 weeks of the event date." });
    }

    parsedBlocks.push({ startStr, endStr, start, end });
  }

  if (parsedBlocks.length === 2) {
    if (rangesOverlap(parsedBlocks[0].start, parsedBlocks[0].end, parsedBlocks[1].start, parsedBlocks[1].end)) {
      return json(400, { ok: false, code: "VALIDATION_ERROR", message: "The two weeks overlap. Separate the dates." });
    }
  }

  const notes = body.notes == null ? "" : typeof body.notes === "string" ? body.notes.trim() : String(body.notes).trim();
  const combinedNotes = notes ? `Event date: ${eventDate}. ${notes}` : `Event date: ${eventDate}.`;

  const rowsToInsert = parsedBlocks.map((b) => ({
    company_id: activeCompanyId,
    employee_id: employeeId,
    type: "parental_bereavement",
    first_day: b.startStr,
    last_day_expected: b.endStr,
    last_day_actual: null as string | null,
    reference_notes: combinedNotes,
    status: "draft",
  }));

  const { data, error } = await supabase.from("absences").insert(rowsToInsert).select("id");

  if (error) {
    if (isOverlapError(error)) {
      return json(409, {
        ok: false,
        code: "ABSENCE_DATE_OVERLAP",
        message: "These dates overlap another existing absence for this employee. Change the dates or cancel the other absence.",
      });
    }

    return json(statusFromErr(error), { ok: false, code: "DB_ERROR", message: (error as any)?.message || "Insert failed." });
  }

  const ids = Array.isArray(data) ? data.map((r: any) => r?.id).filter(Boolean) : [];

  return json(200, { ok: true, ids });
}