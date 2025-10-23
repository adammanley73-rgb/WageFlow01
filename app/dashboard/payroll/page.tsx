/* app/dashboard/payroll/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";
import ActionButton from "@/components/ui/ActionButton";

type RunStatus = "draft" | "processing" | "approved" | "rti_submitted" | "completed";

export default function PayrollPage() {
  // Placeholder data. Replace with Supabase data later.
  const runs: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: RunStatus;
    createdAt: string;
  }[] = [];

  const cannotDelete = (status: RunStatus) =>
    status === "rti_submitted" || status === "completed" || status === "approved";

  return (
    <PageTemplate title="Payroll" currentSection="Payroll">
      <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
          <div className="text-sm font-semibold text-neutral-900">Payroll runs</div>
          <div className="text-xs text-neutral-700">
            Use the Create Payroll Run Wizard from the Dashboard to start a run.
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <colgroup>
              <col className="w-[16rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[12rem]" />
            </colgroup>
            <thead className="bg-neutral-100">
              <tr className="border-b-2 border-neutral-300">
                <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">Run ID</th>
                <th className="text-left px-4 py-3">Period Start</th>
                <th className="text-left px-4 py-3">Period End</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr className="border-b-2 border-neutral-300">
                  <td className="px-4 py-6 sticky left-0 bg-white" colSpan={5}>
                    <div className="text-neutral-800">No payroll runs yet.</div>
                    <div className="text-neutral-700 text-xs">
                      Start one via the Create Payroll Run Wizard on the Dashboard.
                    </div>
                  </td>
                  <td className="px-4 py-6 text-right bg-white" />
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="border-b-2 border-neutral-300">
                    <td className="px-4 py-3 sticky left-0 bg-white">{r.id}</td>
                    <td className="px-4 py-3">{r.periodStart}</td>
                    <td className="px-4 py-3">{r.periodEnd}</td>
                    <td className="px-4 py-3 capitalize">{r.status.replace("_", " ")}</td>
                    <td className="px-4 py-3">{r.createdAt}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <ActionButton href={`/dashboard/payroll/${r.id}/edit`} variant="success">
                          Edit
                        </ActionButton>
                        <ActionButton
                          href="#"
                          variant="primary"
                          className={cannotDelete(r.status) ? "opacity-50 pointer-events-none" : ""}
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTemplate>
  );
}
