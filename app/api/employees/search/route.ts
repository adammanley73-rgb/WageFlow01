// C:\Users\adamm\Projects\wageflow01\app\api\employees\search\route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("employees/search route: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

async function searchEmployeesCore(query: string, companyId?: string | null) {
  const supabase = createAdminClient();
  const q = (query ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json(
      {
        ok: true,
        employees: [],
      },
      { status: 200 }
    );
  }

  let builder = supabase
    .from("employees")
    .select("id, company_id, first_name, last_name, employee_number")
    .or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,employee_number.ilike.%${q}%`
    )
    .limit(20);

  if (companyId && typeof companyId === "string") {
    builder = builder.eq("company_id", companyId);
  }

  const { data, error } = await builder;

  if (error) {
    console.error("employees/search error", error);
    return NextResponse.json(
      {
        ok: false,
        error: "SEARCH_FAILED",
        message: "Failed to search employees.",
        db: error,
      },
      { status: 500 }
    );
  }

  const employees = (data ?? []).map((row: any) => {
    const first = row.first_name ?? "";
    const last = row.last_name ?? "";
    const name = [first, last].filter(Boolean).join(" ").trim();

    return {
      id: row.id,
      companyId: row.company_id,
      name,
      employeeNumber: row.employee_number ?? "",
    };
  });

  return NextResponse.json(
    {
      ok: true,
      employees,
    },
    { status: 200 }
  );
}

// GET /api/employees/search?q=...&companyId=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const companyId = url.searchParams.get("companyId");

    return await searchEmployeesCore(q, companyId);
  } catch (err: any) {
    console.error("employees/search GET unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while searching employees (GET).",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

// POST /api/employees/search
// Body can be: { query } or { q } or { term } or { search }, optional companyId/company_id
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};

    const rawQuery =
      body.query ?? body.q ?? body.term ?? body.search ?? body.name ?? "";
    const rawCompanyId = body.companyId ?? body.company_id ?? null;

    const q = typeof rawQuery === "string" ? rawQuery : "";
    const companyId =
      typeof rawCompanyId === "string" ? rawCompanyId : undefined;

    return await searchEmployeesCore(q, companyId);
  } catch (err: any) {
    console.error("employees/search POST unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while searching employees (POST).",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
