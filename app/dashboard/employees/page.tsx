/* app/dashboard/employees/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";
import ActionButton from "@/components/ui/ActionButton";

export default function EmployeesPage() {
  const employees: { id: string; name: string; email: string; ni: string; payFreq: string; hasPayroll: boolean }[] = [];

  return (
    <PageTemplate title="Employees" currentSection="Employees">
      <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
          <div className="text-sm font-semibold text-neutral-900">Employee list</div>
          <div className="text-xs text-neutral-700">
            Sticky first column, 2 px separators, actions on the right.
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-100">
              <tr className="border-b-2 border-neutral-300">
                <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">NI</th>
                <th className="text-left px-4 py-3">Pay Frequency</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr className="border-b-2 border-neutral-300">
                  <td className="px-4 py-6 sticky left-0 bg-white" colSpan={4}>
                    <div className="text-neutral-800">No employees yet.</div>
                    <div className="text-neutral-700 text-xs">
                      Use the New Employee Wizard on the Dashboard to create your first record.
                    </div>
                  </td>
                  <td className="px-4 py-6 text-right bg-white"></td>
                </tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id} className="border-b-2 border-neutral-300">
                    <td className="px-4 py-3 sticky left-0 bg-white">{e.name}</td>
                    <td className="px-4 py-3">{e.email}</td>
                    <td className="px-4 py-3">{e.ni}</td>
                    <td className="px-4 py-3">{e.payFreq}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <ActionButton href={`/dashboard/employees/${e.id}/edit`} variant="success">
                          Edit
                        </ActionButton>
                        <ActionButton
                          href="#"
                          variant="primary"
                          className={e.hasPayroll ? "opacity-50 pointer-events-none" : ""}
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
