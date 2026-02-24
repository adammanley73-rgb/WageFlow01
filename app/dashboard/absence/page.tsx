// C:\Projects\wageflow01\app\dashboard\absence\page.tsx

import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { formatUkDate } from "@/lib/formatUkDate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import AbsenceEmployeeFilter from "./AbsenceEmployeeFilter";

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
    case "parental_bereavement":
      return "Parental bereavement";
    case "unpaid_leave":
      return "Unpaid leave";
    case "unpaid_other":
      return "Unpaid leave";
    default:
      return v.replaceAll("_", " ");
  }
}

function employeeLabel(emp: EmployeeRow | undefined | null, fallbackId: string) {
  if (!emp) return fallbackId;

  const name =
    (typeof (emp as any).name === "string" && (emp as any).name.trim()) ||
    (typeof (emp as any).full_name === "string" && (emp as any).full_name.trim()) ||
    (typeof (emp as any).display_name === "string" && (emp as any).display_name.trim()) ||
    (typeof (emp as any).preferred_name === "string" && (emp as any).preferred_name.trim()) ||
    [
      typeof (emp as any).first_name === "string" ? (emp as any).first_name.trim() : "",
      typeof (emp as any).last_name === "string" ? (emp as any).last_name.trim() : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const empNo =
    (typeof (emp as any).employee_number === "string" && (emp as any).employee_number.trim()) ||
    (typeof (emp as any).payroll_number === "string" && (emp as any).payroll_number.trim()) ||
    "";

  if (name && empNo) return name + " (" + empNo + ")";
  if (name) return name;
  if (empNo) return "Employee " + empNo;
  return fallbackId;
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type Props = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function AbsencePage({ searchParams }: Props) {
  const sp: SearchParamsRecord | undefined = searchParams ? await searchParams : undefined;

  const deletedParam = typeof sp?.deleted === "string" ? sp.deleted : "";
  const deleteErrorParam = typeof sp?.deleteError === "string" ? sp.deleteError : "";

  const cookieStore = await cookies();

  const activeCompanyId =
    cookieStore.get("active_company_id")?.value ??
    cookieStore.get("company_id")?.value ??
    "";

  const supabase = getAdminClientOrNull();

  async function deleteAbsenceAction(formData: FormData) {
    "use server";

    const cookieStoreInner = await cookies();

    const activeCompanyIdInner =
      cookieStoreInner.get("active_company_id")?.value ??
      cookieStoreInner.get("company_id")?.value ??
      "";

    if (!activeCompanyIdInner) {
      redirect("/dashboard/absence?deleteError=" + encodeURIComponent("No active company selected"));
    }

    const absenceIdRaw = formData.get("absenceId");
    const absenceId = typeof absenceIdRaw === "string" ? absenceIdRaw.trim() : "";

    if (!absenceId) {
      redirect("/dashboard/absence?deleteError=" + encodeURIComponent("Missing absence id"));
    }

    const supabaseInner = getAdminClientOrNull();
    if (!supabaseInner) {
      redirect("/dashboard/absence?deleteError=" + encodeURIComponent("Server config missing"));
    }

    const { data, error } = await supabaseInner
      .from("absences")
      .delete()
      .eq("id", absenceId)
      .eq("company_id", activeCompanyIdInner)
      .select("id");

    if (error) {
      redirect("/dashboard/absence?deleteError=" + encodeURIComponent(error.message ?? "Delete failed"));
    }

    const deletedCount = Array.isArray(data) ? data.length : 0;
    if (deletedCount === 0) {
      redirect(
        "/dashboard/absence?deleteError=" +
          encodeURIComponent("Nothing deleted. Wrong company, missing record, or bad id.")
      );
    }

    revalidatePath("/dashboard/absence");
    redirect("/dashboard/absence?deleted=1");
  }

  if (!activeCompanyId) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />

          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">No active company selected</div>
            <div className="mt-1 text-sm text-neutral-700">
              Select a company on the Dashboard, then come back here.
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  if (!supabase) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />

          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">Server config missing</div>
            <div className="mt-1 text-sm text-neutral-700">
              SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set on the server.
            </div>
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
      .select("id, company_id, employee_id, type, status, first_day, last_day_expected, last_day_actual, reference_notes")
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
      const { data: empData, error: empErr } = await supabase.from("employees").select("*").in("id", employeeIds);

      if (!empErr && Array.isArray(empData)) {
        for (const emp of empData as any[]) {
          if (emp && typeof emp.id === "string") {
            employeesById.set(emp.id, emp as EmployeeRow);
          }
        }
      }
    } catch {
      // ignore
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
      employeeId: employeeId || "",
      employee: employeeLabel(emp, employeeId || "Unknown employee"),
      startDate: start,
      endDate: end,
      type: typeLabel(r.type),
      processedInPayroll,
    };
  });

  const employeesForFilter = employeeIds
    .map((id) => {
      const emp = employeesById.get(id);
      const label = employeeLabel(emp, id);
      const empNo =
        (typeof (emp as any)?.employee_number === "string" && (emp as any).employee_number.trim()) ||
        (typeof (emp as any)?.payroll_number === "string" && (emp as any).payroll_number.trim()) ||
        "";
      return { id, label, employeeNumber: empNo || null };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <PageTemplate title="Absence" currentSection="absence">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-300">
            {deletedParam === "1" ? <div className="text-xs text-green-700">Deleted.</div> : null}
            {deleteErrorParam ? <div className="text-xs text-red-700">Delete error: {deleteErrorParam}</div> : null}
            {loadError ? <div className="text-xs text-red-700">Load error: {loadError}</div> : null}
          </div>

          <AbsenceEmployeeFilter
            employees={employeesForFilter}
            absences={absences}
            deleteAbsenceAction={deleteAbsenceAction}
          />
        </div>
      </div>
    </PageTemplate>
  );
}