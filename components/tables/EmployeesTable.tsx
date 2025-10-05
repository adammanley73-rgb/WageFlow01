/* components/tables/EmployeesTable.tsx */

type Employee = {
  id: string;
  name: string;
  role: string;
  payroll?: string; // presence means there is linked payroll data
  ni?: string;
};

// Temporary placeholder data until Supabase is wired
const rows: Employee[] = [
  { id: "1", name: "Sam Carter", role: "Developer", payroll: "Monthly · £45,000", ni: "QQ123456A" },
  { id: "2", name: "Nia Patel", role: "Designer", payroll: "Weekly · £22.50", ni: "QQ654321B" },
  { id: "3", name: "Lee Wong", role: "Support", ni: "QQ112233C" } // no payroll -> delete enabled
];

export default function EmployeesTable() {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-300">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-100 text-neutral-700">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Name</th>
            <th className="px-4 py-3 text-left font-semibold">Role</th>
            <th className="px-4 py-3 text-left font-semibold">Payroll</th>
            <th className="px-4 py-3 text-left font-semibold">NI</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.map((r) => {
            const canDelete = !r.payroll;
            return (
              <tr key={r.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">{r.role}</td>
                <td className="px-4 py-3">{r.payroll ?? <span className="text-neutral-400">None</span>}</td>
                <td className="px-4 py-3">{r.ni ?? <span className="text-neutral-400">—</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-neutral-300 hover:shadow-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={!canDelete}
                      className={
                        "rounded-lg px-3 py-1.5 text-white " +
                        (canDelete
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-neutral-300 text-neutral-600 cursor-not-allowed")
                      }
                      title={canDelete ? "Delete employee" : "Delete disabled: payroll data exists"}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
/* components/tables/EmployeesTable.tsx */
