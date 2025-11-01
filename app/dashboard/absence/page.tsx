import PageTemplate from "@/components/layout/PageTemplate";
import ActionButton from "@/components/ui/ActionButton";
import { cookies } from "next/headers";

export default async function AbsencePage() {
const cookieStore = cookies();
const activeCompanyName =
cookieStore.get("active_company_name")?.value ?? "No company selected";

const absences: {
id: string;
employee: string;
startDate: string;
endDate: string;
type: string;
processedInPayroll: boolean;
}[] = [];

return (
<PageTemplate title="Absence" currentSection="Absence">
<div className="mb-4 rounded-xl bg-white px-6 py-3 flex items-baseline gap-2">
<span className="text-xs tracking-[0.25em] text-slate-500 uppercase">Company</span>
<span className="text-base font-semibold text-[#0f3c85] leading-none">
{activeCompanyName}
</span>
</div>

  <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
    <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
      <div className="text-sm font-semibold text-neutral-900">Absence records</div>
      <div className="text-xs text-neutral-700">
        Use the Record New Absence Wizard from the Dashboard to add an entry.
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <colgroup>
          <col className="w-[18rem]" />
          <col className="w-[10rem]" />
          <col className="w-[10rem]" />
          <col className="w-[10rem]" />
          <col className="w-[12rem]" />
        </colgroup>
        <thead className="bg-neutral-100">
          <tr className="border-b-2 border-neutral-300">
            <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">Employee</th>
            <th className="text-left px-4 py-3">Start Date</th>
            <th className="text-left px-4 py-3">End Date</th>
            <th className="text-left px-4 py-3">Type</th>
            <th className="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {absences.length === 0 ? (
            <tr className="border-b-2 border-neutral-300">
              <td className="px-4 py-6 sticky left-0 bg-white" colSpan={4}>
                <div className="text-neutral-800">No absences recorded yet.</div>
                <div className="text-neutral-700 text-xs">
                  Add one via the Record New Absence Wizard on the Dashboard.
                </div>
              </td>
              <td className="px-4 py-6 text-right bg-white" />
            </tr>
          ) : (
            absences.map((a) => (
              <tr key={a.id} className="border-b-2 border-neutral-300">
                <td className="px-4 py-3 sticky left-0 bg-white">{a.employee}</td>
                <td className="px-4 py-3">{a.startDate}</td>
                <td className="px-4 py-3">{a.endDate}</td>
                <td className="px-4 py-3">{a.type}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <ActionButton href={`/dashboard/absence/${a.id}/edit`} variant="success">
                      Edit
                    </ActionButton>
                    <ActionButton
                      href="#"
                      variant="primary"
                      className={a.processedInPayroll ? "opacity-50 pointer-events-none" : ""}
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