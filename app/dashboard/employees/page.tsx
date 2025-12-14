/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\page.tsx

import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import PageTemplate from "@/components/layout/PageTemplate";
import ActionButton from "@/components/ui/ActionButton";

export const dynamic = "force-dynamic";

type Company = {
  id: string;
  name: string;
  created_at?: string;
};

type EmployeeRow = {
  id?: string | null;
  employee_id?: string | null;

  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;

  employee_number?: string | null;
  ni_number?: string | null;

  pay_frequency?: string | null;
  pay_basis?: string | null;
};

function getActiveCompanyIdFromCookies(): string | null {
  const jar = cookies();
  return jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;
}

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
    const activeCompanyId = getActiveCompanyIdFromCookies();
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
}

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getSupabaseKey(): string {
  // Prefer service role if present. Fall back to anon key.
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

      // Try plain JSON
      try {
        const obj = JSON.parse(decoded);
        if (obj && typeof obj.access_token === "string") return obj.access_token;
      } catch {}

      // Try base64 JSON
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

  if (!url || !key) {
    return null;
  }

  const accessToken = extractAccessTokenFromCookies();

  const opts: any = {
    auth: { persistSession: false, autoRefreshToken: false },
  };

  if (accessToken) {
    opts.global = { headers: { Authorization: `Bearer ${accessToken}` } };
  }

  return createClient(url, key, opts);
}

function formatFrequency(v: string | null | undefined): string {
  if (!v) return "—";
  const s = String(v).trim();
  if (!s) return "—";
  if (s === "four_weekly") return "Four-weekly";
  if (s === "fortnightly") return "Fortnightly";
  if (s === "weekly") return "Weekly";
  if (s === "monthly") return "Monthly";
  if (s === "quarterly") return "Quarterly";
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatNI(v: string | null | undefined): string {
  const s = (v ?? "").toString().trim();
  return s ? s.toUpperCase() : "—";
}

async function loadEmployeesForCompany(companyId: string): Promise<EmployeeRow[]> {
  try {
    const supabase = createSupabaseRequestClient();
    if (!supabase) return [];

    // Try full set first
    const fullSelect =
      "id, employee_id, first_name, last_name, email, employee_number, ni_number, pay_frequency, pay_basis";

    let { data, error } = await supabase
      .from("employees")
      .select(fullSelect)
      .eq("company_id", companyId)
      .order("first_name", { ascending: true });

    // Fallback if schema differs
    if (error) {
      const minimalSelect = "id, employee_id, first_name, last_name, employee_number";
      const fallback = await supabase
        .from("employees")
        .select(minimalSelect)
        .eq("company_id", companyId)
        .order("first_name", { ascending: true });

      if (fallback.error) {
        console.error("employees page: employees load error", fallback.error);
        return [];
      }

      return (fallback.data as any[]) || [];
    }

    return (data as any[]) || [];
  } catch (err) {
    console.error("employees page: unexpected load error", err);
    return [];
  }
}

export default async function EmployeesPage() {
  const companyId = getActiveCompanyIdFromCookies();

  const [activeCompanyName, employeeRows] = await Promise.all([
    getActiveCompanyNameViaApi(),
    companyId ? loadEmployeesForCompany(companyId) : Promise.resolve([]),
  ]);

  const employees = (employeeRows || []).map((r) => {
    const rowId = (r.id || r.employee_id || "").toString();
    const fullName = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();

    const displayName =
      fullName ||
      (r.employee_number ? `Employee (${r.employee_number})` : "") ||
      (r.email ? r.email : "") ||
      "Employee";

    return {
      id: rowId,
      name: displayName,
      email: (r.email ?? "").toString() || "—",
      ni: formatNI((r as any).ni_number ?? (r as any).ni ?? null),
      payFreq: formatFrequency((r as any).pay_frequency ?? (r as any).pay_freq ?? null),
      hasPayroll: false, // TODO: wire real delete guard when payroll tables are reconnected
    };
  });

  return (
    <PageTemplate title="Employees" currentSection="employees">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="rounded-2xl bg-white/80 px-4 py-4">
          {activeCompanyName ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg sm:text-xl text-[#0f3c85]">
                <span className="font-semibold">Active company:</span>{" "}
                <span className="font-bold">{activeCompanyName}</span>
              </p>
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
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
                className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
              >
                Select company
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Employee list</div>
            <div className="text-xs text-neutral-700">
              Sticky first column, 2 px separators, actions on the right.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100">
                <tr className="border-b-2 border-neutral-300">
                  <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">NI</th>
                  <th className="text-left px-4 py-3">Pay Frequency</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr className="border-b-2 border-neutral-300">
                    <td className="px-4 py-6 sticky left-0 bg-white" colSpan={4}>
                      <div className="text-neutral-800">
                        {activeCompanyName ? "No employees found for this company yet." : "No active company selected."}
                      </div>
                      <div className="text-neutral-700 text-xs">
                        Create an employee using the New Employee Wizard.
                      </div>
                    </td>
                    <td className="px-4 py-6 text-right bg-white"></td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.id} className="border-b-2 border-neutral-300">
                      <td className="px-4 py-3 sticky left-0 bg-white">{e.name}</td>
                      <td className="px-4 py-3">{e.email}</td>
                      <td className="px-4 py-3">{e.ni}</td>
                      <td className="px-4 py-3">{e.payFreq}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <ActionButton href={`/dashboard/employees/${e.id}/edit`} variant="success">
                            Edit
                          </ActionButton>
                          <ActionButton
                            href="#"
                            variant="primary"
                            className={e.hasPayroll ? "opacity-50 pointer-events-none" : ""}
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

          <div className="px-4 py-4 bg-neutral-50 border-t-2 border-neutral-300">
            <ActionButton href="/dashboard/employees/new" variant="primary">
              Create employee
            </ActionButton>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
