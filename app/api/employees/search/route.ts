// C:\Projects\wageflow01\app\api\employees\search\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EmployeeSearchRow = {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
};

type SearchEmployeeResult = {
  id: string;
  companyId: string | null;
  name: string;
  employeeNumber: string;
};

type SearchBody = {
  query?: unknown;
  q?: unknown;
  term?: unknown;
  search?: unknown;
  name?: unknown;
  companyId?: unknown;
  company_id?: unknown;
};

function sanitizeIlikeTerm(input: unknown): string {
  const s = String(input ?? "").trim();
  if (!s) return "";
  return s.replace(/[^a-zA-Z0-9 \-'.]/g, "").trim();
}

function statusFromErr(err: unknown, fallback = 500): number {
  const anyErr = err as { status?: unknown } | null;
  const s = Number(anyErr?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

async function searchEmployeesCore(query: string, companyId?: string | null) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const q = sanitizeIlikeTerm(query);

  if (q.length < 2) {
    return NextResponse.json({ ok: true, employees: [] }, { status: 200 });
  }

  const pattern = `%${q}%`;

  let builder = supabase
    .from("employees")
    .select("id, company_id, first_name, last_name, employee_number")
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},employee_number.ilike.${pattern}`)
    .limit(20);

  const companyIdStr = String(companyId ?? "").trim();
  if (companyIdStr) {
    builder = builder.eq("company_id", companyIdStr);
  }

  const { data, error } = await builder.returns<EmployeeSearchRow[]>();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "SEARCH_FAILED",
        message: "Failed to search employees.",
        details: (error as any)?.message ?? String(error),
      },
      { status: statusFromErr(error) }
    );
  }

  const rows: EmployeeSearchRow[] = Array.isArray(data) ? data : [];

  const employees: SearchEmployeeResult[] = rows.map((row) => {
    const first = String(row.first_name ?? "").trim();
    const last = String(row.last_name ?? "").trim();
    const name = [first, last].filter(Boolean).join(" ").trim();

    return {
      id: String(row.id),
      companyId: row.company_id ?? null,
      name: name || String(row.employee_number ?? "").trim() || String(row.id),
      employeeNumber: String(row.employee_number ?? "").trim(),
    };
  });

  return NextResponse.json({ ok: true, employees }, { status: 200 });
}

// GET /api/employees/search?q=...&companyId=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const companyId = url.searchParams.get("companyId");
    return await searchEmployeesCore(q, companyId);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while searching employees (GET).",
        details: msg,
      },
      { status: 500 }
    );
  }
}

// POST /api/employees/search
// Body can be: { query } or { q } or { term } or { search } or { name }, optional companyId/company_id
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as SearchBody | null;

    const rawQuery = body?.query ?? body?.q ?? body?.term ?? body?.search ?? body?.name ?? "";
    const rawCompanyId = body?.companyId ?? body?.company_id ?? null;

    const q = typeof rawQuery === "string" ? rawQuery : String(rawQuery ?? "");
    const companyId = typeof rawCompanyId === "string" ? rawCompanyId : rawCompanyId == null ? null : String(rawCompanyId);

    return await searchEmployeesCore(q, companyId);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while searching employees (POST).",
        details: msg,
      },
      { status: 500 }
    );
  }
}