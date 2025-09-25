/* @ts-nocheck */
// app/dashboard/absence/new/page.tsx
import React from "react";
import Link from "next/link";
import HeaderBanner from "@components/ui/HeaderBanner";

export default function NewAbsenceHub() {
  return (
    <div className="relative min-h-screen text-gray-900">
      {/* Full-bleed gradient behind everything */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-green-500 to-blue-800" />

      {/* Single shared container = header width matches cards; pt-6 avoids margin-collapse white strip */}
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-8">
        {/* Header banner (no margins on this block) */}
        <div className="rounded-2xl overflow-hidden shadow">
          <HeaderBanner title="Record New Absence" />
        </div>

        {/* Content pulled up close to banner */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sickness */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Sickness</h2>
            <p className="mb-4">
              Uses SSP rules with PIWs, linking, waiting days, and the 28-week cap.
            </p>
            <Link
              href="/dashboard/absence/new/sickness"
              className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              Open
            </Link>
          </div>

          {/* Maternity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Maternity</h2>
            <p className="mb-4">
              Computes SMP AWE and weekly schedule. Saves totals in the record.
            </p>
            <Link
              href="/dashboard/absence/new/maternity"
              className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              Open
            </Link>
          </div>

          {/* Adoption */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Adoption</h2>
            <p className="mb-4">
              Computes SAP weekly schedule when available. Placement date optional.
            </p>
            <Link
              href="/dashboard/absence/new/adoption"
              className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              Open
            </Link>
          </div>

          {/* Paternity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Paternity</h2>
            <p className="mb-4">
              Computes SPP schedule. Two-week entitlement where eligible.
            </p>
            <Link
              href="/dashboard/absence/new/paternity"
              className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              Open
            </Link>
          </div>

          {/* Shared Parental */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Shared Parental</h2>
            <p className="mb-4">
              Computes ShPP schedule. Requires eligible partner leave details.
            </p>
            <Link
              href="/dashboard/absence/new/shared-parental"
              className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              Open
            </Link>
          </div>

          {/* Parental Bereavement */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Parental Bereavement</h2>
            <p className="mb-4">
              Computes SPBP schedule. One or two weeks depending on circumstance.
            </p>
            <Link
              href="/dashboard/absence/new/parental-bereavement"
              className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              Open
            </Link>
          </div>
        </div>

        {/* List link */}
        <div className="mt-8">
          <Link
            href="/dashboard/absence/list"
            className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
          >
            View saved absences
          </Link>
        </div>
      </div>
    </div>
  );
}

