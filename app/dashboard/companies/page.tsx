/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\companies\page.tsx

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";

export const dynamic = "force-dynamic";

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

  // VERCEL_URL is usually just the hostname without protocol.
  const normalizedHost = host.startsWith("http") ? host : `${proto}://${host}`;
  return normalizedHost.replace(/\/$/, "");
}

function buildCookieHeader(): string {
  const jar = cookies();
  const all = jar.getAll();
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function getCompanies(): Promise<Company[]> {
  try {
    const baseUrl = getBaseUrl();

    const res = await fetch(`${baseUrl}/api/companies`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: buildCookieHeader(),
      },
    });

    if (!res.ok) {
      console.error("companies page: /api/companies non-200", {
        status: res.status,
        statusText: res.statusText,
      });
      return [];
    }

    const data = await res.json();

    // Expected shape: an array of companies.
    if (Array.isArray(data)) return data;

    // Defensive fallback if the API ever changes shape.
    if (data && Array.isArray(data.companies)) return data.companies;

    return [];
  } catch (err) {
    console.error("companies page: failed to load companies", err);
    return [];
  }
}

// Server action: set active company cookie and bounce back to dashboard
async function setActiveCompanyAction(formData: FormData) {
  "use server";

  const companyId = formData.get("company_id");

  if (typeof companyId !== "string" || !companyId) return;

  const jar = cookies();

  jar.set("active_company_id", companyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Non-httpOnly mirror for any client-side helpers
  jar.set("company_id", companyId, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}

export default async function CompaniesPage() {
  const [companies, cookieStore] = await Promise.all([
    getCompanies(),
    Promise.resolve(cookies()),
  ]);

  const activeCompanyId =
    cookieStore.get("active_company_id")?.value ??
    cookieStore.get("company_id")?.value ??
    null;

  return (
    <PageTemplate title="Companies" currentSection="Companies">
      <div className="rounded-2xl bg-white shadow-sm p-4 sm:p-6">
        {companies.length === 0 ? (
          <div className="text-sm text-neutral-600">
            No companies found for your account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-neutral-500 px-2">
                    Name
                  </th>
                  <th className="text-right text-xs font-semibold text-neutral-500 px-2">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {companies.map((company) => {
                  const isActive = company.id === activeCompanyId;

                  return (
                    <tr key={company.id}>
                      <td className="rounded-l-xl bg-neutral-100 px-2 py-2 text-sm text-neutral-900">
                        {company.name}
                      </td>

                      <td className="rounded-r-xl bg-neutral-100 px-2 py-2 text-right">
                        <form action={setActiveCompanyAction} className="inline-block">
                          <input type="hidden" name="company_id" value={company.id} />
                          <button
                            type="submit"
                            className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-semibold transition ${
                              isActive
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-sky-900 text-white hover:bg-sky-800"
                            }`}
                            disabled={isActive}
                          >
                            {isActive ? "Active company" : "Use this company"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
