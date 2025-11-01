/* C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\edit\page.tsx */
import React from "react";

export default function EditEmployeePreviewPage() {
  return (
    <div className="min-h-screen">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-blue-700">Edit Employee (Preview)</h1>
      </div>

      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-700">
            Preview-only placeholder. Edit flow will be wired after the employees data service.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-600">Employee</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Read-only in preview"
                readOnly
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-600">Email</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Read-only in preview"
                readOnly
              />
            </label>
          </div>

          <div className="pt-3">
            <button
              className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2 text-white text-sm disabled:opacity-60"
              disabled
            >
              Save changes (disabled in preview)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
