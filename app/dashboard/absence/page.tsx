/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\page.tsx

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";import { cookies, headers } from "next/headers";

type Company = {
  id: string;
  name: string;
  created_at?: string;
};

function getBaseUrl(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.VERCEL_URL ??
    "localhost:3000";

  const normalizedHost = host.startsWith("http") ? host : `${proto}://${host}`;
  return normalizedHost.replace(/\/$/, "");
}

function buildCookieHeader(): string {
  const jar = cookies();
  const all = jar.getAll();
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function getActiveCompanyNameViaApi(): Promise<string | null> {
  try {
    const jar = cookies();
    const activeCompanyId =
      jar.get("active_company_id")?.value ??
      jar.get("company_id")?.value ??
      null;

    if (!activeCompanyId) return null;

    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/companies`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: buildCookieHeader(),
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const companies: Company[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.companies)
      ? data.companies
      : [];

    const match = companies.find((c) => c.id === activeCompanyId);
    return match?.name ?? null;
  } catch {
    return null;
  }
}import PageTemplate from "@/components/layout/PageTemplate";
import ActionButton from "@/components/ui/ActionButton";
import { formatUkDate } from "@/lib/formatUkDate";

export const dynamic = "force-dynamic";

type ActiveCompany = {
  id: string;
  name: string | null;
} | null;

function getActiveCompanyIdFromCookies(): string | null {
  const jar = cookies();
  return jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;
}

async function getActiveCompany(): Promise<ActiveCompany> {
  const id = getActiveCompanyIdFromCookies();
  if (!id) return null;

  const name = await getActiveCompanyNameViaApi();
  return { id, name };
}

// Best-effort Supabase client for server-side reads. Uses service role if present, else anon key + access token cookie.
function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getSupabaseKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
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

function extractAccessTokenFromCookies(): string | null {
  try {
    const jar = cookies();
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

function createSupabaseRequestClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) return null;

  const token = extractAccessTokenFromCookies();
  const opts: any = { auth: { persistSession: false, autoRefreshToken: false } };

  if (token) opts.global = { headers: { Authorization: `Bearer ${token}` } };

  return createClient(url, key, opts);
}

type UiAbsenceRow = {
  id: string;
  employee: string;
  startDate: string | null;
  endDate: string | null;
  type: string;
  processedInPayroll: boolean;
};

async function getAbsencesForCompany(companyId: string): Promise<UiAbsenceRow[]> {
  try {
    const supabase = createSupabaseRequestClient();
    if (!supabase) return [];

    const { data: rows, error } = await supabase
      .from("absences")
      .select(
        "id, employee_id, type, status, first_day, last_day_expected, last_day_actual, reference_notes, created_at"
      )
      .eq("company_id", companyId)
      .order("first_day", { ascending: false });

    if (error || !rows) {
      console.error("absence page: error loading absences", error);
      return [];
    }

    const employeeIds = Array.from(
      new Set(rows.map((r: any) => r.employee_id).filter((v: any) => !!v))
    );

    let employeesById: Record<string, { name: string; number: string | null }> = {};

    if (employeeIds.length > 0) {
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employee_number")
        .in("id", employeeIds);

      if (empError) {
        console.error("absence page: error loading employees", empError);
      } else if (employees) {
        for (const e of employees as any[]) {
          const fullName = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
          employeesById[e.id] = {
            name: fullName || e.employee_number || "Employee",
            number: e.employee_number ?? null,
          };
        }
      }
    }

    return (rows as any[]).map((row) => {
      const emp = employeesById[row.employee_id] ?? { name: "Unknown employee", number: null };

      const startDate: string | null = row.first_day ?? null;
      const endDate: string | null = row.last_day_expected ?? row.last_day_actual ?? row.first_day ?? null;

      const displayEmployee =
        emp.number && emp.name ? `${emp.name} (${emp.number})` : emp.name || "Employee";

      let displayType = "Absence";
      if (row.type === "annual_leave") displayType = "Annual leave";
      else if (row.type === "sickness") displayType = "Sickness";
      else if (typeof row.type === "string") displayType = row.type;

      return {
        id: row.id,
        employee: displayEmployee,
        startDate,
        endDate,
        type: displayType,
        processedInPayroll: false,
      };
    });
  } catch (err) {
    console.error("absence page: unexpected error loading absences", err);
    return [];
  }
}

export default async function AbsencePage() {
  const activeCompany = await getActiveCompany();
  const absences = activeCompany ? await getAbsencesForCompany(activeCompany.id) : [];

  return (
    <PageTemplate title="Absence" currentSection="absence">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          {activeCompany ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg sm:text-xl" style={{ color: "var(--wf-blue)" }}>
                <span className="font-semibold text-neutral-900">Active company:</span>{" "}
                <span className="font-bold">{activeCompany.name ?? "Untitled company"}</span>
              </p>
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  backgroundColor: "var(--wf-blue)",
                  ["--tw-ring-color" as any]: "var(--wf-blue)",
                }}
              >
                Change company
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm sm:text-base text-neutral-800">
                No active company selected. Go to the Companies page to choose one.
              </p>
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  backgroundColor: "var(--wf-blue)",
                  ["--tw-ring-color" as any]: "var(--wf-blue)",
                }}
              >
                Select company
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Absence records</div>
            <div className="text-xs text-neutral-700">
              Records are created using the Record new absence wizard.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <colgroup>
                <col className="w-[18rem]" />
                <col className="w-[10rem]" />
                <col className="w-[10rem]" />
                <col className="w-[10rem]" />
                <col className="w-[12rem]" />
              </colgroup>
              <thead className="bg-neutral-100">
                <tr className="border-b-2 border-neutral-300">
                  <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">Employee</th>
                  <th className="text-left px-4 py-3">Start date</th>
                  <th className="text-left px-4 py-3">End date</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {absences.length === 0 ? (
                  <tr className="border-b-2 border-neutral-300">
                    <td className="px-4 py-6 sticky left-0 bg-white" colSpan={4}>
                      <div className="text-neutral-800">No absences recorded yet.</div>
                      <div className="text-neutral-700 text-xs">
                        Use the Record new absence wizard to add the first entry.
                      </div>
                    </td>
                    <td className="px-4 py-6 text-right bg-white" />
                  </tr>
                ) : (
                  absences.map((a) => (
                    <tr key={a.id} className="border-b-2 border-neutral-300">
                      <td className="px-4 py-3 sticky left-0 bg-white">{a.employee}</td>
                      <td className="px-4 py-3">{a.startDate ? formatUkDate(a.startDate) : "—"}</td>
                      <td className="px-4 py-3">{a.endDate ? formatUkDate(a.endDate) : "—"}</td>
                      <td className="px-4 py-3">{a.type}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <ActionButton href={`/dashboard/absence/${a.id}/edit`} variant="success">
                            Edit
                          </ActionButton>
                          <ActionButton
                            href="#"
                            variant="primary"
                            className={a.processedInPayroll ? "opacity-50 pointer-events-none" : ""}
                          >
                            Delete
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
