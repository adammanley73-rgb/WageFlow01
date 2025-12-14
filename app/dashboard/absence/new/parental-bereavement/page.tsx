/* C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\parental-bereavement\page.tsx */
import React from "react";

export default function ParentalBereavementPage() {
  return (
    <div className="min-h-screen">
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-blue-700">New Parental Bereavement Leave</h1>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-700">
          Preview stub. Parental Bereavement wizard is disabled in preview mode.
        </p>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-600">Employee</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Select employee (stub)"
                readOnly
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-600">Start date</span>
              <input
                type="date"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                readOnly
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
