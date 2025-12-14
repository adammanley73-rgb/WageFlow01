/* C:\Users\adamm\Projects\wageflow01\app\dashboard\companies\new\page.tsx */
import React from "react";

export default function CompaniesNewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-blue-800">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">Companies</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-neutral-200">
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-700">
              Create company placeholder. This compiles cleanly while we wire Supabase.
            </p>

            <div className="grid gap-4">
              <label className="block">
                <span className="text-xs text-gray-600">Company name</span>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Acme Ltd"
                  readOnly
                />
              </label>

              <label className="block">
                <span className="text-xs text-gray-600">Company number</span>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Optional"
                  readOnly
                />
              </label>
            </div>

            <div className="pt-2">
              <button
                className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2 text-white text-sm disabled:opacity-60"
                disabled
              >
                Save company (disabled in preview)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
