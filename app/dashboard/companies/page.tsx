// C:\Projects\wageflow01\app\dashboard\companies\page.tsx
import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import { getServerSupabase } from "@/lib/supabase/server";

type Company = {
  id: string;
  name: string | null;
};

type LoadCompaniesResult = {
  companies: Company[];
  hasSession: boolean;
  loadError: string | null;
};

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
  );
}

function isExpectedMissingSessionError(message: string) {
  return message.toLowerCase().includes("auth session missing");
}

async function getMemberCompanies(): Promise<LoadCompaniesResult> {
  const supabase = await getServerSupabase();

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    const message = authError?.message ?? "";

    if (message && !isExpectedMissingSessionError(message)) {
      console.warn("Companies page auth check warning:", message);
    }

    return {
      companies: [],
      hasSession: false,
      loadError:
        "Your login session could not be confirmed. Log out, sign back in, then choose your assigned company again.",
    };
  }

  const { data, error } = await supabase
    .from("vw_member_companies")
    .select("id,name")
    .order("name", { ascending: true });

  if (error) {
    console.warn("vw_member_companies select warning:", error.message);

    return {
      companies: [],
      hasSession: true,
      loadError:
        "Your company memberships could not be loaded. This may be a stale session or a membership assignment issue.",
    };
  }

  return {
    companies: data ?? [],
    hasSession: true,
    loadError: null,
  };
}

async function selectCompanyAction(formData: FormData) {
  "use server";

  const raw = formData.get("companyId");
  const companyId = typeof raw === "string" ? raw.trim() : "";

  if (!companyId || !isUuid(companyId)) {
    redirect("/dashboard/companies?error=invalid-company");
  }

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("vw_member_companies")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.warn("Company selection membership check warning:", error.message);
    redirect("/dashboard/companies?error=company-check-failed");
  }

  if (!data?.id) {
    redirect("/dashboard/companies?error=company-not-available");
  }

  const jar = await cookies();

  const cookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  };

  jar.set("active_company_id", companyId, cookieOptions);
  jar.set("company_id", companyId, cookieOptions);

  redirect("/dashboard");
}

function getErrorMessage(error: string | null): string | null {
  if (!error) return null;

  if (error === "invalid-company") {
    return "The selected company ID was invalid. Choose a company from the list.";
  }

  if (error === "company-not-available") {
    return "That company is not available to your account. Choose an assigned company or sign in again.";
  }

  if (error === "company-check-failed") {
    return "WageFlow could not confirm your company access. Sign in again if this continues.";
  }

  return "Company selection needs attention. Sign in again if this continues.";
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params?.error ?? null);
  const result = await getMemberCompanies();
  const companies = result.companies;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-400 to-blue-600">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="rounded-t-[32px] bg-white px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-32 items-center justify-center bg-transparent">
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
        </div>

        <div className="rounded-b-[32px] bg-white/90 px-0 pb-8 shadow-sm">
          <div className="px-5 pt-6 sm:px-6">
            {errorMessage ? (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {errorMessage}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl ring-1 ring-neutral-200">
              {companies.length === 0 ? (
                <div className="bg-neutral-200 px-6 py-8 text-sm text-neutral-800">
                  <div className="text-base font-bold text-neutral-950">
                    {result.hasSession
                      ? "No companies are available for this account."
                      : "Your session needs refreshing."}
                  </div>

                  <div className="mt-2 max-w-3xl leading-6">
                    {result.loadError ||
                      "This account has no visible company memberships. For UAT users, confirm the tester is assigned to the correct WageFlow UAT company."}
                  </div>

                  <div className="mt-4 max-w-3xl leading-6">
                    This is not automatically a data isolation failure. First refresh the login session, then check the tester company membership if the list is still empty.
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <a
                      href="/dashboard/companies"
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#0f3c85] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68]"
                    >
                      Try again
                    </a>

                    <LogoutButton className="h-9" />
                  </div>
                </div>
              ) : (
                <ul>
                  {companies.map((c, idx) => (
                    <li
                      key={c.id}
                      className={`flex flex-col gap-4 bg-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
                        idx < companies.length - 1
                          ? "border-b border-neutral-300"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-neutral-900">
                          {c.name ?? "Unnamed company"}
                        </div>
                        <div className="break-all text-xs text-neutral-600">
                          {c.id}
                        </div>
                      </div>

                      <form action={selectCompanyAction}>
                        <input type="hidden" name="companyId" value={c.id} />
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-md bg-[#1b64ff] px-4 text-sm font-semibold text-white transition-transform hover:-translate-y-[2px] hover:bg-[#1550ca]"
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
