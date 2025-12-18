import PageTemplate from "@/components/layout/PageTemplate";
import ActionButton from "@/components/ui/ActionButton";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { formatUkDate } from "@/lib/formatUkDate";

export const dynamic = "force-dynamic";

type AbsenceRow = {
id: string;
company_id: string | null;
employee_id: string | null;
type: string | null;
status: string | null;
first_day: string | null;
last_day_expected: string | null;
last_day_actual: string | null;
reference_notes: string | null;
[key: string]: any;
};

type EmployeeRow = {
id: string;
[key: string]: any;
};

function getAdminClientOrNull() {
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) return null;

return createClient(url, serviceKey, {
auth: { persistSession: false },
});
}

function typeLabel(t: string | null | undefined): string {
const v = String(t ?? "").trim();
if (!v) return "Unknown";

switch (v) {
case "annual_leave":
return "Annual leave";
case "sickness":
return "Sickness";
case "maternity":
return "Maternity";
case "paternity":
return "Paternity";
case "shared_parental":
return "Shared parental";
case "adoption":
return "Adoption";
default:
return v.replaceAll("_", " ");
}
}

function employeeLabel(emp: EmployeeRow | undefined | null, fallbackId: string) {
if (!emp) return fallbackId;

const name =
(typeof emp.name === "string" && emp.name.trim()) ||
(typeof emp.full_name === "string" && emp.full_name.trim()) ||
(typeof emp.display_name === "string" && emp.display_name.trim()) ||
(typeof emp.preferred_name === "string" && emp.preferred_name.trim()) ||
[
typeof emp.first_name === "string" ? emp.first_name.trim() : "",
typeof emp.last_name === "string" ? emp.last_name.trim() : "",
]
.filter(Boolean)
.join(" ")
.trim();

const empNo =
(typeof emp.employee_number === "string" && emp.employee_number.trim()) ||
(typeof emp.payroll_number === "string" && emp.payroll_number.trim()) ||
"";

if (name && empNo) return name + " (" + empNo + ")";
if (name) return name;
if (empNo) return "Employee " + empNo;
return fallbackId;
}

export default async function AbsencePage() {
const cookieStore = cookies();

const activeCompanyId = cookieStore.get("active_company_id")?.value ?? "";

const supabase = getAdminClientOrNull();

if (!activeCompanyId) {
return (
<PageTemplate title="Absence" currentSection="absence">
<div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
<div className="text-sm font-semibold text-neutral-900">
No active company selected
</div>
<div className="mt-1 text-sm text-neutral-700">
Select a company on the Dashboard, then come back here.
</div>
</div>
</PageTemplate>
);
}

if (!supabase) {
return (
<PageTemplate title="Absence" currentSection="absence">
<div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
<div className="text-sm font-semibold text-neutral-900">
Server config missing
</div>
<div className="mt-1 text-sm text-neutral-700">
SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set on the server.
</div>
</div>
</PageTemplate>
);
}

let absenceRows: AbsenceRow[] = [];
let loadError: string | null = null;

try {
const { data, error } = await supabase
.from("absences")
.select(
"id, company_id, employee_id, type, status, first_day, last_day_expected, last_day_actual, reference_notes"
)
.eq("company_id", activeCompanyId)
.order("first_day", { ascending: false })
.limit(500);

if (error) {
  loadError = error.message ?? "Failed to load absences";
  absenceRows = [];
} else {
  absenceRows = Array.isArray(data) ? (data as AbsenceRow[]) : [];
}


} catch (e: any) {
loadError = e?.message ?? "Failed to load absences";
absenceRows = [];
}

const employeeIds = Array.from(
new Set(
absenceRows
.map((r) => (typeof r.employee_id === "string" ? r.employee_id : ""))
.filter(Boolean)
)
);

const employeesById = new Map<string, EmployeeRow>();

if (employeeIds.length > 0) {
try {
const { data: empData, error: empErr } = await supabase
.from("employees")
.select("*")
.in("id", employeeIds);

  if (!empErr && Array.isArray(empData)) {
    for (const emp of empData as any[]) {
      if (emp && typeof emp.id === "string") {
        employeesById.set(emp.id, emp as EmployeeRow);
      }
    }
  }
} catch {
  // fall back to showing employee_id
}


}

const absences = absenceRows.map((r) => {
const employeeId = typeof r.employee_id === "string" ? r.employee_id : "";
const emp = employeeId ? employeesById.get(employeeId) : null;

const start = formatUkDate(r.first_day);
const end = formatUkDate(r.last_day_actual ?? r.last_day_expected);

const status = String(r.status ?? "").trim().toLowerCase();
const processedInPayroll =
  status === "processed" ||
  status === "approved" ||
  status === "rti_submitted" ||
  status === "completed";

return {
  id: String(r.id),
  employee: employeeLabel(emp, employeeId || "Unknown employee"),
  startDate: start,
  endDate: end,
  type: typeLabel(r.type),
  processedInPayroll,
};


});

return (
<PageTemplate title="Absence" currentSection="absence">
<div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
<div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 flex items-start justify-between gap-4">
<div>
<div className="text-sm font-semibold text-neutral-900">
Absence records
</div>
<div className="text-xs text-neutral-700">
Absences are created via the Absence wizards. Dates show in UK
format dd-mm-yyyy.
</div>
{loadError && (
<div className="mt-1 text-xs text-red-700">
Load error: {loadError}
</div>
)}
</div>

      <div className="shrink-0">
        <div className="text-xs text-neutral-600">
          Use New Absence wizard to add records.
        </div>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <colgroup>
          <col className="w-[22rem]" />
          <col className="w-[10rem]" />
          <col className="w-[10rem]" />
          <col className="w-[12rem]" />
          <col className="w-[12rem]" />
        </colgroup>
        <thead className="bg-neutral-100">
          <tr className="border-b-2 border-neutral-300">
            <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">
              Employee
            </th>
            <th className="text-left px-4 py-3">Start Date</th>
            <th className="text-left px-4 py-3">End Date</th>
            <th className="text-left px-4 py-3">Type</th>
            <th className="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {absences.length === 0 ? (
            <tr className="border-b-2 border-neutral-300">
              <td
                className="px-4 py-6 sticky left-0 bg-white"
                colSpan={4}
              >
                <div className="text-neutral-800">
                  No absences found for this company.
                </div>
                <div className="text-neutral-700 text-xs">
                  If you know records exist, they were likely saved under a
                  different company_id.
                </div>
              </td>
              <td className="px-4 py-6 text-right bg-white" />
            </tr>
          ) : (
            absences.map((a) => (
              <tr key={a.id} className="border-b-2 border-neutral-300">
                <td className="px-4 py-3 sticky left-0 bg-white">
                  {a.employee}
                </td>
                <td className="px-4 py-3">{a.startDate}</td>
                <td className="px-4 py-3">{a.endDate}</td>
                <td className="px-4 py-3">{a.type}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <ActionButton
                      href={`/dashboard/absence/${a.id}/edit`}
                      variant="success"
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      href="#"
                      variant="primary"
                      className={
                        a.processedInPayroll
                          ? "opacity-50 pointer-events-none"
                          : ""
                      }
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
