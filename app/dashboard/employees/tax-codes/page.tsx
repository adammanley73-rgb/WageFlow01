// app/dashboard/employees/tax-codes/page.tsx
// Server component. Fetches employees via the server data service and renders a simple list.

import React from "react";
import { listEmployeesSSR } from "@/lib/data/employees";

export const revalidate = 0; // always fresh while we wire this up

export default async function EmployeeTaxCodesPage() {
  const employees = await listEmployeesSSR(200);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Employee Tax Codes
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        Server-rendered preview. Wiring in progress.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-300 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">Employee</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">NI Number</th>
              <th className="px-3 py-2 text-left">Job Title</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t border-neutral-200">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2">{e.email ?? "—"}</td>
                <td className="px-3 py-2">{e.ni_number ?? "—"}</td>
                <td className="px-3 py-2">{e.job_title ?? "—"}</td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-neutral-500" colSpan={4}>
                  No employees found for the active company.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
