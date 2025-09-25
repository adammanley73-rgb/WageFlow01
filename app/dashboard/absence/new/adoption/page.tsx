/* @ts-nocheck */
import React from "react";
import HeaderBanner from "@components/ui/HeaderBanner";

export default function AdoptionLeavePage() {
  return (
    <div className="min-h-screen">
      <HeaderBanner title="New Adoption Leave" />
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-700">
          Preview stub. Adoption leave wizard is disabled in preview mode.
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
              <span className="text-xs text-gray-600">Expected placement date</span>
              <input
                type="date"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                disabled
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Leave start date</span>
              <input
                type="date"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                disabled
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Weeks of leave</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                disabled
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded bg-gray-200 px-4 py-2 text-sm" disabled>
              Save
            </button>
            <button className="rounded bg-gray-200 px-4 py-2 text-sm" disabled>
              Cancel
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          This page is a compile-safe placeholder. Real logic, validation, and SMP/SAP calculations will be enabled after preview hardening.
        </p>
      </div>
    </div>
  );
}
