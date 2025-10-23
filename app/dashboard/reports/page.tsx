/* app/dashboard/reports/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";

export default function ReportsPage() {
  return (
    <PageTemplate title="Reports" currentSection="Reports">
      {/* Use the same single card wrapper as every other page */}
      <div className="rounded-2xl bg-neutral-100 ring-1 ring-neutral-300 p-3 sm:p-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="rounded-2xl bg-neutral-200 px-4 py-6 text-center ring-1 ring-neutral-300">
            <div className="text-sm font-semibold text-neutral-900">Payroll Runs</div>
            <div className="mt-2 text-2xl font-semibold">0</div>
          </div>
          <div className="rounded-2xl bg-neutral-200 px-4 py-6 text-center ring-1 ring-neutral-300">
            <div className="text-sm font-semibold text-neutral-900">Total Gross</div>
            <div className="mt-2 text-2xl font-semibold">£0.00</div>
          </div>
          <div className="rounded-2xl bg-neutral-200 px-4 py-6 text-center ring-1 ring-neutral-300">
            <div className="text-sm font-semibold text-neutral-900">Total Deductions</div>
            <div className="mt-2 text-2xl font-semibold">£0.00</div>
          </div>
        </div>

        {/* Payroll summary table */}
        <div className="rounded-xl bg-white ring-1 ring-neutral-200 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 text-sm font-semibold text-neutral-900">
            Payroll Summary
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100">
                <tr className="border-b-2 border-neutral-300">
                  <th className="text-left px-4 py-3">Run Number</th>
                  <th className="text-left px-4 py-3">Pay Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Gross</th>
                  <th className="text-left px-4 py-3">Deductions</th>
                  <th className="text-left px-4 py-3">Net</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-6 text-neutral-700" colSpan={6}>
                    No payroll runs found. Create a run in Payroll and come back to view reports.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RTI log */}
        <div className="rounded-xl bg-white ring-1 ring-neutral-200 overflow-hidden mt-4">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 text-sm font-semibold text-neutral-900">
            RTI Submission Log
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100">
                <tr className="border-b-2 border-neutral-300">
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Period</th>
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-6 text-neutral-700" colSpan={6}>
                    No submissions logged yet. Submit FPS from a payroll run to populate this table.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
