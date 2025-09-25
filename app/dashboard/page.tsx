// File: app/dashboard/page.tsx
/* @ts-nocheck */
import React from "react";
import Link from "next/link";
import HeaderBanner from "@components/ui/HeaderBanner";

export default async function DashboardPage() {
  return (
    <div className="min-h-screen">
      <HeaderBanner title="Dashboard (Preview)" />
      <div className="p-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">PAYE Preview</h3>
          <p className="text-sm text-gray-700 mb-3">
            Run the PAYE v1 monthly preview calculator with stubbed results.
          </p>
          <Link
            href="/dashboard/preview"
            className="inline-block rounded bg-gray-800 px-4 py-2 text-sm text-white"
          >
            Open preview
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Employees</h3>
          <p className="text-sm text-gray-700 mb-3">
            Preview-safe employee directory and new employee form.
          </p>
          <div className="flex gap-2">
            <Link
              href="/dashboard/employees/directory"
              className="rounded bg-gray-200 px-4 py-2 text-sm"
            >
              Directory
            </Link>
            <Link
              href="/dashboard/employees/new"
              className="rounded bg-gray-200 px-4 py-2 text-sm"
            >
              Add employee
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Settings</h3>
          <p className="text-sm text-gray-700 mb-3">
            Company settings are stubbed and compile-safe in preview.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-block rounded bg-gray-200 px-4 py-2 text-sm"
          >
            Open settings
          </Link>
        </div>
      </div>
    </div>
  );
}
