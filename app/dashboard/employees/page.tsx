import React from "react";
import { headers } from "next/headers";
import PageTemplate from "@/components/layout/PageTemplate";

type ActiveCompany = {
  id: string | null;
  name: string | null;
};

async function getActiveCompany(): Promise<ActiveCompany> {
  const h = headers();
  const cookieHeader = h.get("cookie") ?? "";
  const parts = cookieHeader.split(";").map((p) => p.trim());

  let id: string | null = null;
  let name: string | null = null;

  for (const p of parts) {
    if (p.startsWith("active_company_id=")) {
      id = decodeURIComponent(p.slice("active_company_id=".length));
    }
    if (p.startsWith("active_company_name=")) {
      name = decodeURIComponent(p.slice("active_company_name=".length));
    }
  }

  return { id, name };
}

export default async function EmployeesPage() {
  const active = await getActiveCompany();

  return (
    <PageTemplate title="Employees" currentSection="Employees">
      <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden mb-6">
        {/* company stripe */}
        <div className="px-6 py-3 bg-white border-b-2 border-neutral-200 flex items-baseline gap-3">
          <span className="text-xs uppercase tracking-wide text-neutral-500 leading-none">
            Company
          </span>
          <span className="text-lg font-semibold text-[#0f3c85] leading-none">
            {active.name ?? "No active company selected"}
          </span>
        </div>

        {/* header actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-100">
          <div className="text-sm text-neutral-700">
            Active employees for this company.
          </div>
          <a
            href="/dashboard/employees/new"
            className="px-4 py-2 rounded-full bg-[#0f3c85] text-white text-sm font-semibold hover:bg-[#0c2f68] transition"
          >
            Create employee
          </a>
        </div>

        {/* table */}
        <div className="px-6 pb-6 bg-neutral-100">
          <div className="overflow-x-auto rounded-lg ring-1 ring-neutral-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="sticky left-0 bg-neutral-100 px-4 py-3 text-neutral-700 border-b-2 border-neutral-200">
                    Name
                  </th>
                  <th className="px-4 py-3 text-neutral-700 border-b-2 border-neutral-200">
                    NI Number
                  </th>
                  <th className="px-4 py-3 text-neutral-700 border-b-2 border-neutral-200">
                    Job title
                  </th>
                  <th className="px-4 py-3 text-neutral-700 border-b-2 border-neutral-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-neutral-700 text-right border-b-2 border-neutral-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-2 border-neutral-200">
                  <td className="sticky left-0 bg-white px-4 py-3 text-neutral-800">
                    No employees yet
                  </td>
                  <td className="px-4 py-3 text-neutral-500">–</td>
                  <td className="px-4 py-3 text-neutral-500">–</td>
                  <td className="px-4 py-3 text-neutral-500">–</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        className="px-3 py-1 rounded-md bg-neutral-200 text-neutral-700 text-xs"
                        disabled
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-md bg-red-100 text-red-700 text-xs"
                        disabled
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
