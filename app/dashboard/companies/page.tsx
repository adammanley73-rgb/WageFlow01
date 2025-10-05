/* @ts-nocheck */
import HeaderBanner from "@/components/ui/HeaderBanner";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCompanyIdFromCookie } from "@/lib/company";
import { selectCompanyAction, clearCompanyAction } from "./actions";

export default async function CompaniesPage() {
  const supabase = supabaseServer();
  const selectedId = getCompanyIdFromCookie();

  const { data: rows, error } = await supabase
    .from("my_companies_v")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-blue-800">
      <HeaderBanner currentSection="Companies" />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-300 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-800">
              Select a company
            </h2>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 bg-neutral-200 text-neutral-900 text-sm"
              >
                Back to dashboard
              </Link>
              <Link
                href="/dashboard/companies/new"
                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 bg-blue-800 text-white text-sm"
              >
                Create company
              </Link>
            </div>
          </div>

          {error ? (
            <div className="p-4 text-red-700 text-sm">
              Failed to load companies: {error.message}
            </div>
          ) : rows && rows.length > 0 ? (
            <ul className="divide-y divide-neutral-200">
              {rows.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-neutral-900">{c.name}</div>
                    <div className="text-xs text-neutral-600 break-all">
                      {c.id}
                    </div>
                  </div>
                  {/* @ts-expect-error Server Action */}
                  <form action={selectCompanyAction}>
                    <input type="hidden" name="company_id" value={c.id} />
                    <button
                      type="submit"
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        selectedId === c.id
                          ? "bg-green-600 text-white"
                          : "bg-blue-800 text-white"
                      }`}
                    >
                      {selectedId === c.id ? "Selected" : "Select"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-neutral-700 text-sm">
              You have no companies yet. Create one to continue.
            </div>
          )}

          <div className="p-4 border-t border-neutral-300 flex items-center justify-between">
            <div className="text-sm text-neutral-700">
              {selectedId ? (
                <>
                  Current selection:
                  <span className="ml-2 font-mono text-neutral-900">
                    {selectedId}
                  </span>
                </>
              ) : (
                "No company selected."
              )}
            </div>
            {/* @ts-expect-error Server Action */}
            <form action={clearCompanyAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 bg-neutral-200 text-neutral-900 text-sm"
              >
                Clear company selection
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-neutral-800">Notes</h3>
            <ul className="mt-2 text-sm list-disc list-inside text-neutral-700">
              <li>
                This page is always accessible, even without a selected company.
              </li>
              <li>
                Selection writes a secure cookie. RLS still enforces membership
                on data access.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
