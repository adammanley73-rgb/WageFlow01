/* @ts-nocheck */
import React from "react";
import HeaderBanner from "@components/ui/HeaderBanner";

export default async function SettingsPage() {
  // Preview stub. No data fetch. Keep it compile-safe.
  return (
    <div className="min-h-screen">
      <HeaderBanner title="Company Settings (Preview)" />
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">Company</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-600">Company name</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                defaultValue="Preview Co"
                readOnly
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Pay schedule</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                defaultValue="Monthly"
                readOnly
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-600">Address</span>
              <textarea
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                defaultValue=""
                readOnly
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Phone</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                defaultValue=""
                readOnly
              />
            </label>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            This is a preview-only page. Editing is disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
