'use client';
/* @ts-nocheck */
import React, { useEffect, useState } from "react";
import HeaderBanner from "@components/ui/HeaderBanner";
import { useParams, useRouter } from "next/navigation";

export default function EditEmployeeDetailsPage() {
  const params = (useParams() as any) || {};
  const id = params.id ?? "";
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Preview stub: no data fetch
    setLoading(false);
  }, [id]);

  return (
    <div className="min-h-screen">
      <HeaderBanner title="Edit Employee Details (Preview)" />
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-700">
            Preview stub. Employee editor is disabled in preview mode.
          </p>
          <p className="text-xs text-gray-500 mt-2">Employee id: {id || "(none)"}.</p>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded bg-gray-200 px-4 py-2 text-sm"
              type="button"
              onClick={() => router.back()}
            >
              Back
            </button>
            <button className="rounded bg-gray-200 px-4 py-2 text-sm" type="button" disabled>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
