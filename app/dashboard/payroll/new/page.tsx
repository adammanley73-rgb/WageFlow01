/* @ts-nocheck */
// app/dashboard/payroll/new/page.tsx
import HeaderBanner from "../../../../components/ui/HeaderBanner";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NewPayrollPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      <HeaderBanner title="Payroll" currentSection="payroll" />

      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-900">
            Start a new payroll run
          </h2>
          <p className="mt-2 text-neutral-700">
            Create, review, and approve payroll runs.
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/dashboard/payroll"
              className="rounded-2xl bg-[#1e40af] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Back to Payroll
            </Link>
            <Link
              href="/dashboard/payroll"
              className="rounded-2xl bg-neutral-800 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Open Runs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

