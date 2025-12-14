/* C:\Users\adamm\Projects\wageflow01\app\dashboard\settings\company\page.tsx */
import React from "react";

const S = {
  page: { maxWidth: "72rem", margin: "0 auto" },
  wrap: { background: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.5rem" },
};

export default function SettingsCompanyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">Settings</h1>
      </div>

      <main style={S.page}>
        <div style={S.wrap}>
          <h2 className="text-base font-medium text-neutral-900">Company</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Company settings are disabled in this preview build. This placeholder keeps CI and typecheck green until wiring is complete.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-600">Company name</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Acme Ltd"
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

          <div className="mt-6">
            <button
              className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2 text-white text-sm disabled:opacity-60"
              disabled
            >
              Save changes (disabled)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
