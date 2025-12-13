/* C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\new\page.tsx */
import React from "react";

export default function PayrollNewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">Payroll</h1>
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">
            Payroll run wizard is disabled in this preview build. This placeholder keeps CI and typecheck green until the workflow is wired.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-600">Pay period start</span>
              <input
                type="date"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                readOnly
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-600">Pay period end</span>
              <input
                type="date"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                readOnly
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-600">Payment date</span>
              <input
                type="date"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                readOnly
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-600">Pay frequency</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Monthly"
                readOnly
              />
            </label>
          </div>

          <div className="pt-4">
            <button
              className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2 text-white text-sm disabled:opacity-60"
              disabled
            >
              Start payroll run (disabled)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
