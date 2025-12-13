// app/dashboard/payroll/schedules/page.tsx
// Server component. Do NOT mark with "use client".
// Keep imports server-safe. If you need client interactivity, split it into a child component later.

import React from "react";
import { listEmployeesSSR } from "@/lib/data/employees";

export const revalidate = 0;

export default async function PayrollSchedulesPage() {
  // Temporary: use employees list to prove server data access without client imports.
  // Replace with real schedules query when your schedules table/service is ready.
  const employees = await listEmployeesSSR(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Payroll Schedules
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        Server-rendered placeholder. Replace with real schedules list.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-300 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">Employee</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">NI</th>
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
