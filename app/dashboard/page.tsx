// app/dashboard/page.tsx
// Server component: fetches the active company and shows it on the dashboard.
// Uses the internal /api/active-company endpoint and forwards cookies for SSR.

import React from "react";
import { headers } from "next/headers";

type ActiveCompany = {
  id: string;
  name: string | null;
};

async function getActiveCompany(): Promise<ActiveCompany | null> {
  // Forward incoming cookies so the API can read the active_company_* values
  const incoming = headers();
  const cookie = incoming.get("cookie") ?? "";

  // Relative URL works on both Vercel and local dev inside app router
  const res = await fetch("/api/active-company", {
    method: "GET",
    headers: { cookie },
    // We want fresh info if user switches companies
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    // Avoid throwing; render a soft error state instead
    return null;
  }

  return (await res.json()) as ActiveCompany;
}

function ActiveCompanyCard({ company }: { company: ActiveCompany }) {
  const displayName = company.name?.trim() || "Unnamed company";
  return (
    <div className="mx-auto mt-4 max-w-6xl px-4">
      <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-base font-medium text-neutral-700">
            Active company
          </div>
          <div className="text-xs text-neutral-500">ID: {company.id}</div>
        </div>
        <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
          {displayName}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const company = await getActiveCompany();

  // If middleware is configured correctly, this should not render in missing state.
  // Still, fail soft to avoid crashing the page during local testing.
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-200 to-sky-200">
      {/* Keep top spacing consistent with your layout */}
      <div className="pt-6" />

      {company ? (
        <ActiveCompanyCard company={company} />
      ) : (
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            No active company detected. If you are not redirected to Company
            Selection, check middleware and cookies.
          </div>
        </div>
      )}

      {/* Placeholder for the rest of the dashboard tiles/cards.
         Replace with your existing dashboard content as needed. */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-6 text-center">
            <div className="text-sm text-neutral-600">Employees</div>
            <div className="mt-1 text-3xl font-semibold text-neutral-900">
              —
            </div>
          </div>
          <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-6 text-center">
            <div className="text-sm text-neutral-600">Payroll</div>
            <div className="mt-1 text-3xl font-semibold text-neutral-900">
              —
            </div>
          </div>
          <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-6 text-center">
            <div className="text-sm text-neutral-600">Absence</div>
            <div className="mt-1 text-3xl font-semibold text-neutral-900">
              —
            </div>
          </div>
          <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-6 text-center">
            <div className="text-sm text-neutral-600">Settings</div>
            <div className="mt-1 text-3xl font-semibold text-neutral-900">
              —
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
