/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\sickness\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  );
}

function getSupabaseKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

function readChunkedCookieValue(
  all: { name: string; value: string }[],
  baseName: string
): string | null {
  const exact = all.find((c) => c.name === baseName);
  if (exact) return exact.value;

  const parts = all
    .filter((c) => c.name.startsWith(baseName + "."))
    .map((c) => {
      const m = c.name.match(/\.(\d+)$/);
      const idx = m ? Number(m[1]) : 0;
      return { idx, value: c.value };
    })
    .sort((a, b) => a.idx - b.idx);

  if (parts.length === 0) return null;
  return parts.map((p) => p.value).join("");
}

async function extractAccessTokenFromCookies(): Promise<string | null> {
  try {
    const jar = await cookies();
    const all = jar.getAll();

    const bases = new Set<string>();

    for (const c of all) {
      const n = c.name;
      if (!n.includes("auth-token")) continue;
      if (!n.startsWith("sb-") && !n.includes("sb-")) continue;
      bases.add(n.replace(/\.\d+$/, ""));
    }

    for (const base of bases) {
      const raw = readChunkedCookieValue(all as any, base);
      if (!raw) continue;

      const decoded = (() => {
        try {
          return decodeURIComponent(raw);
        } catch {
          return raw;
        }
      })();

      try {
        const obj = JSON.parse(decoded);
        if (obj && typeof obj.access_token === "string") return obj.access_token;
      } catch {}

      try {
        const asJson = Buffer.from(decoded, "base64").toString("utf8");
        const obj = JSON.parse(asJson);
        if (obj && typeof obj.access_token === "string") return obj.access_token;
      } catch {}
    }

    return null;
  } catch {
    return null;
  }
}

async function createSupabaseRequestClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) {
    throw new Error("Supabase env is missing (URL or key)");
  }

  const accessToken = await extractAccessTokenFromCookies();

  const opts: any = {
    auth: { persistSession: false, autoRefreshToken: false },
  };

  if (accessToken) {
    opts.global = { headers: { Authorization: `Bearer ${accessToken}` } };
  }

  return createClient(url, key, opts);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const employeeId = body?.employee_id;
    const firstDay = body?.first_day;
    const lastDayExpected = body?.last_day_expected || null;
    const lastDayActual = body?.last_day_actual || null;
    const referenceNotes = body?.reference_notes || null;

    if (!employeeId || !firstDay || !lastDayExpected) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Employee, first day and expected last day are required.",
        },
        { status: 400 }
      );
    }

    if (lastDayExpected < firstDay) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Expected last day cannot be earlier than the first day.",
        },
        { status: 400 }
      );
    }

    if (lastDayActual && lastDayActual < firstDay) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Actual last day cannot be earlier than the first day.",
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const companyId =
      cookieStore.get("active_company_id")?.value ||
      cookieStore.get("company_id")?.value ||
      null;

    if (!companyId) {
      return NextResponse.json(
        { ok: false, code: "NO_COMPANY", message: "No active company selected." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRequestClient();

    const { data: rows, error: rowsError } = await supabase
      .from("absences")
      .select("id, first_day, last_day_expected, last_day_actual")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId);

    if (rowsError) {
      console.error("Sickness create overlap DB error:", rowsError);
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: "Could not check existing absences." },
        { status: 500 }
      );
    }

    const newStart = firstDay;
    const newEnd = lastDayActual || lastDayExpected || firstDay;

    const conflicts =
      rows
        ?.map((row: any) => {
          const start = row.first_day;
          const end = row.last_day_actual || row.last_day_expected || row.first_day;
          const overlaps = newStart <= end && newEnd >= start;
          if (!overlaps) return null;

          return { id: row.id, startDate: start, endDate: end };
        })
        .filter(Boolean) || [];

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "ABSENCE_DATE_OVERLAP",
          message: "These dates would overlap another existing absence.",
          conflicts,
        },
        { status: 409 }
      );
    }

    const insertPayload = {
      company_id: companyId,
      employee_id: employeeId,
      type: "sickness",
      first_day: firstDay,
      last_day_expected: lastDayExpected,
      last_day_actual: lastDayActual,
      reference_notes: referenceNotes,
    };

    const { error: insertError } = await supabase.from("absences").insert(insertPayload);

    if (insertError) {
      console.error("Insert sickness absence error:", insertError);
      return NextResponse.json(
        {
          ok: false,
          code: "DB_ERROR",
          message: "Could not create sickness absence. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected error creating sickness absence:", err);
    return NextResponse.json(
      {
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error while saving this sickness absence.",
      },
      { status: 500 }
    );
  }
}