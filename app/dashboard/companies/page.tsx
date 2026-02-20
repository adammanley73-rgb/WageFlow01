// C:\Users\adamm\Projects\wageflow01\app\dashboard\companies\page.tsx
import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

type Company = {
  id: string;
  name: string | null;
};

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
  );
}

async function getMemberCompanies(): Promise<Company[]> {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("vw_member_companies")
    .select("id,name")
    .order("name", { ascending: true });

  if (error) {
    console.error("vw_member_companies select failed:", error.message);
    return [];
  }

  return data ?? [];
}

async function selectCompanyAction(formData: FormData) {
  "use server";

  const raw = formData.get("companyId");
  const companyId = typeof raw === "string" ? raw.trim() : "";

  if (!companyId || !isUuid(companyId)) {
    redirect("/dashboard/companies");
  }

  const jar = await cookies();

  jar.set("active_company_id", companyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/dashboard");
}

export default async function CompaniesPage() {
  const companies = await getMemberCompanies();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-400 to-blue-600">
      <div className="mx-auto max-w-6xl pt-10 px-6">
        <div className="rounded-t-[32px] bg-white px-6 py-6 flex items-center gap-4">
          <div className="h-14 w-32 flex items-center justify-center bg-transparent">
            <img
              src="/WageFlowLogo.png"
              alt="WageFlow"
              className="h-12 w-auto object-contain"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-[#154da4]">
              Company Selection
            </h1>
            <p className="text-sm text-neutral-600">
              Choose a company to continue. Your choice is saved for 30 days.
            </p>
          </div>
        </div>

        <div className="bg-white/90 px-0 pb-8 rounded-b-[32px] shadow-sm">
          <div className="px-6 pt-6">
            <div className="rounded-xl overflow-hidden ring-1 ring-neutral-200">
              {companies.length === 0 ? (
                <div className="px-6 py-8 text-neutral-700 text-sm bg-neutral-200">
                  No companies visible for this account. Check memberships.
                </div>
              ) : (
                <ul>
                  {companies.map((c, idx) => (
                    <li
                      key={c.id}
                      className={`flex items-center justify-between gap-4 px-6 py-4 bg-neutral-200 ${
                        idx < companies.length - 1
                          ? "border-b border-neutral-300"
                          : ""
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">
                          {c.name ?? "Unnamed company"}
                        </div>
                        <div className="text-xs text-neutral-600">{c.id}</div>
                      </div>

                      <form action={selectCompanyAction}>
                        <input type="hidden" name="companyId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-[#1b64ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1550ca] transition-transform hover:-translate-y-[2px]"
                        >
                          Use this company
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
