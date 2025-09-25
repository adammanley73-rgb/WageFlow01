/* @ts-nocheck */
import React from "react";
import Link from "next/link";
import HeaderBanner from "@components/ui/HeaderBanner";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: { m?: string; d?: string };
}) {
  return (
    <div className="min-h-screen">
      <HeaderBanner title="Employees (Preview)" />
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          Preview stub. Employee data is disabled in preview mode.
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/employees/directory"
            className="rounded bg-gray-200 px-4 py-2 text-sm"
          >
            Open directory
          </Link>
          <Link
            href="/dashboard/employees/new"
            className="rounded bg-gray-200 px-4 py-2 text-sm"
          >
            Add employee
          </Link>
        </div>
      </div>
    </div>
  );
}
