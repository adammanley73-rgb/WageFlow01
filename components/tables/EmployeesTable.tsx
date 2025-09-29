/* components/tables/EmployeesTable.tsx */
"use client";

type Row = {
  id: string;
  name: string;
  role: string;
  niNumber?: string;
  payFrequency?: string;
  hourlyRate?: string;
  annualSalary?: string;
  hasPayrollData: boolean;
};

const rows: Row[] = [
  { id: "e1", name: "Sam Carter", role: "Developer", niNumber: "QQ123456A", payFrequency: "Monthly", annualSalary: "£45,000", hasPayrollData: true },
  { id: "e2", name: "Nia Patel", role: "Designer", niNumber: "QQ654321B", payFrequency: "Weekly", hourlyRate: "£22.50", hasPayrollData: false },
  { id: "e3", name: "Lee Wong", role: "Support", niNumber: "QQ112233C", payFrequency: "Monthly", annualSalary: "£28,000", hasPayrollData: false }
];

export default function EmployeesTable() {
  return (
    <div className="rounded-xl bg-neutral-200 ring-1 ring-neutral-400 overflow-hidden">
      <table className="w-full border-collapse">
        <thead className="bg-neutral-300">
          <tr className="text-left text-sm text-neutral-700">
            <th className="sticky left-0 bg-neutral-300 px-4 py-3 w-[26%]">Name</th>
            <th className="px-4 py-3 w-[18%]">Role</th>
            <th className="px-4 py-3 w-[18%]">Payroll</th>
            <th className="px-4 py-3 w-[18%]">NI</th>
            <th className="px-4 py-3 text-right w-[20%]">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows.map((r) => {
            const payrollText = r.annualSalary ? `${r.payFrequency} • ${r.annualSalary}` : `${r.payFrequency} • ${r.hourlyRate ?? "-"}`;
            return (
              <tr key={r.id} className="border-t-2 border-neutral-400">
                <td className="sticky left-0 bg-neutral-200 px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">{r.role}</td>
                <td className="px-4 py-3">{payrollText}</td>
                <td className="px-4 py-3">{r.niNumber ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <a
                      href={`/dashboard/employees/${r.id}/edit`}
                      className="inline-flex h-8 items-center justify-center rounded-md bg-emerald-600 px-4 text-white text-xs hover:-translate-y-0.5 transition-transform"
                    >
                      Edit
                    </a>
                    <button
                      disabled={r.hasPayrollData}
                      className={`inline-flex h-8 items-center justify-center rounded-md px-4 text-white text-xs transition-transform ${
                        r.hasPayrollData ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:-translate-y-0.5"
                      }`}
                      title={r.hasPayrollData ? "Cannot delete. Payroll data exists." : "Delete"}
                      onClick={() => {
                        if (r.hasPayrollData) return;
                        alert(`Delete ${r.name} (placeholder)`);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">No employees yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
