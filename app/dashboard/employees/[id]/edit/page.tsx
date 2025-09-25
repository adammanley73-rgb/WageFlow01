/* @ts-nocheck */
import React from "react";
import HeaderBanner from "@components/ui/HeaderBanner";

export default async function EditEmployeePage({
  params,
}: {
  params: { id: string };
}) {
  const id = params?.id ?? "";

  // Preview stub: no DB calls, no getAdmin
  return (
    <div className="min-h-screen">
      <HeaderBanner title="Edit Employee (Preview)" />
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-700">
            Preview stub. Employee editor is disabled in preview mode.
          </p>
          <p className="text-xs text-gray-500 mt-2">Employee id: {id || "(none)"}.</p>
          <div className="mt-4 flex gap-2">
            <a
              href="/dashboard/employees/directory"
              className="rounded bg-gray-200 px-4 py-2 text-sm inline-block"
            >
              Back to directory
            </a>
            <button className="rounded bg-gray-200 px-4 py-2 text-sm" disabled>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
