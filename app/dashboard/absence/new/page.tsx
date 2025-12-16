/* @ts-nocheck */
// app/dashboard/absence/new/page.tsx
import Link from "next/link";

export default function NewAbsenceHub() {
  // Do NOT render HeaderBanner here. The layout already did.
  return (
    <div className="rounded-2xl overflow-hidden bg-white/90 ring-1 ring-neutral-200 shadow-sm">
      {/* Title-only header (centered, slightly smaller than page title) */}
      <div className="px-6 py-6 border-b border-neutral-200">
        <h1 className="text-center text-3xl font-semibold text-blue-900">
          Record New Absence
        </h1>
      </div>

      {/* Content */}
      <section className="bg-white">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sickness */}
            <div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold mb-2">Sickness</h2>
              <p className="mb-4">
                Uses SSP rules with PIWs, linking, waiting days, and the 28-week cap.
              </p>
              <Link href="/dashboard/absence/new/sickness" className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                Open
              </Link>
            </div>

            {/* Maternity */}
            <div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold mb-2">Maternity</h2>
              <p className="mb-4">
                Computes SMP AWE and weekly schedule. Saves totals in the record.
              </p>
              <Link href="/dashboard/absence/new/maternity" className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                Open
              </Link>
            </div>

            {/* Adoption */}
            <div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold mb-2">Adoption</h2>
              <p className="mb-4">
                Computes SAP weekly schedule when available. Placement date optional.
              </p>
              <Link href="/dashboard/absence/new/adoption" className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                Open
              </Link>
            </div>

            {/* Paternity */}
            <div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold mb-2">Paternity</h2>
              <p className="mb-4">
                Computes SPP schedule. Two-week entitlement where eligible.
              </p>
              <Link href="/dashboard/absence/new/paternity" className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                Open
              </Link>
            </div>

            {/* Shared Parental */}
            <div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold mb-2">Shared Parental</h2>
              <p className="mb-4">
                Computes ShPP schedule. Requires eligible partner leave details.
              </p>
              <Link href="/dashboard/absence/new/shared-parental" className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                Open
              </Link>
            </div>

            {/* Parental Bereavement */}
            <div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold mb-2">Parental Bereavement</h2>
              <p className="mb-4">
                Computes SPBP schedule. One or two weeks depending on circumstance.
              </p>
              <Link href="/dashboard/absence/new/parental-bereavement" className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                Open
              </Link>
            </div>

            {/* Annual Leave */}
            <div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold mb-2">Annual Leave</h2>
              <p className="mb-4">
                Logs and manages paid annual leave, automatically reducing entitlement.
              </p>
              <Link href="/dashboard/absence/new/annual-leave" className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                Open
              </Link>
            </div>

            {/* Unpaid Leave */}
            <div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold mb-2">Unpaid Leave</h2>
              <p className="mb-4">
                Records unpaid absence periods and adjusts payroll accordingly.
              </p>
              <Link href="/dashboard/absence/new/unpaid-leave" className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                Open
              </Link>
            </div>
          </div>

          {/* View saved absences */}
          <div className="mt-10 text-center">
            <Link href="/dashboard/absence/list" className="inline-block bg-blue-900 text-white px-5 py-2 rounded hover:bg-blue-800">
              View saved absences
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
