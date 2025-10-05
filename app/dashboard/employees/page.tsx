/* @ts-nocheck */
import HeaderBanner from "@/components/ui/HeaderBanner";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireCompanyIdOrRedirect } from "@/lib/company";

export default async function EmployeesPage() {
  const companyId = requireCompanyIdOrRedirect();
  const supabase = supabaseServer();

  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email, job_title, ni_number, pay_frequency")
    .eq("company_id", companyId)
    .order("last_name", { ascending: true });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-blue-800">
      <HeaderBanner currentSection="Employees" />
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-300 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-800">Employees</h2>
            <Link
              href="/dashboard/employees/new"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-blue-800 text-white text-sm"
            >
              Create employee
            </Link>
          </div>

          {error ? (
            <div className="p-4 text-red-700 text-sm">
              Failed to load employees: {error.message}
            </div>
          ) : !employees || employees.length === 0 ? (
            <div className="p-4 text-neutral-700 text-sm">No employees found for this company.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100 text-neutral-700">
                  <tr>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Job title</th>
                    <th className="text-left px-4 py-3">NI number</th>
                    <th className="text-left px-4 py-3">Pay frequency</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-300">
                  {employees.map((e) => {
                    const name = [e.first_name, e.last_name].filter(Boolean).join(" ");
                    return (
                      <tr key={e.id} className="bg-white hover:bg-neutral-50">
                        <td className="px-4 py-3">{name || "—"}</td>
                        <td className="px-4 py-3">{e.email || "—"}</td>
                        <td className="px-4 py-3">{e.job_title || "—"}</td>
                        <td className="px-4 py-3">{e.ni_number || "—"}</td>
                        <td className="px-4 py-3">{e.pay_frequency || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <Link
                              href={`/dashboard/employees/${e.id}/edit`}
                              className="px-3 py-1.5 rounded-lg bg-green-600 text-white"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/dashboard/employees/${e.id}/delete`}
                              className="px-3 py-1.5 rounded-lg bg-blue-800 text-white"
                            >
                              Delete
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
