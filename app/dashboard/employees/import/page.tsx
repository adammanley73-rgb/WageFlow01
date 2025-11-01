/* C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\import\page.tsx */
import React from "react";

export default function EmployeesImportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">Import Employees (CSV)</h1>
      </div>

      <main className="mx-auto max-w-6xl">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">
            CSV import is disabled in this preview build while we wire the Supabase data service and
            server actions. This placeholder exists to keep CI and typecheck green.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-4">
              <h2 className="text-sm font-medium text-neutral-800">Expected columns</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
                <li>first_name</li>
                <li>last_name</li>
                <li>email</li>
                <li>date_of_birth (YYYY-MM-DD)</li>
                <li>ni_number</li>
                <li>job_title</li>
                <li>annual_salary</li>
                <li>pay_frequency</li>
              </ul>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4">
              <h2 className="text-sm font-medium text-neutral-800">Sample first row</h2>
              <pre className="mt-2 overflow-auto rounded bg-neutral-50 p-3 text-xs text-neutral-800">
{`first_name,last_name,email,date_of_birth,ni_number,job_title,annual_salary,pay_frequency
Jane,Doe,jane.doe@example.com,1990-01-15,AB123456C,Engineer,42000,MONTHLY`}
              </pre>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              disabled
              className="block w-full text-sm text-neutral-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-60"
            />
            <button
              className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2 text-white text-sm disabled:opacity-60"
              disabled
            >
              Upload CSV (disabled)
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            We will replace this with a streaming CSV parser and Supabase upsert with validation once
            the employees data service is in place.
          </p>
        </section>
      </main>
    </div>
  );
}
