// C:\Projects\wageflow01\app\dashboard\absence\page.tsx

import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import AbsenceEmployeeFilter from "./AbsenceEmployeeFilter";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatUkDate } from "@/lib/formatUkDate";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
};

type EmployeeRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  employee_number?: string | null;
  payroll_number?: string | null;
  full_name?: string | null;
  name?: string | null;
  display_name?: string | null;
  preferred_name?: string | null;
};

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "")
  );
}

async function getActiveCompanyId(): Promise<string> {
  const cookieStore = await cookies();
  const v =
    cookieStore.get("active_company_id")?.value ??
    cookieStore.get("company_id")?.value ??
    "";
  return String(v || "").trim();
}

function typeLabel(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "Unknown";
  switch (s) {
    case "annual":
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
    case "bereaved_partners_paternity":
      return "Bereaved partners paternity";
    case "unpaid_leave":
      return "Unpaid leave";
    case "unpaid_other":
      return "Unpaid leave";
    default:
      return s.replaceAll("_", " ");
  }
}

function employeeLabel(emp: EmployeeRow | undefined | null, fallbackId: string) {
  if (!emp) return fallbackId;

  const name =
    (typeof (emp as any).name === "string" && (emp as any).name.trim()) ||
    (typeof (emp as any).full_name === "string" && (emp as any).full_name.trim()) ||
    (typeof (emp as any).display_name === "string" &&
      (emp as any).display_name.trim()) ||
    (typeof (emp as any).preferred_name === "string" &&
      (emp as any).preferred_name.trim()) ||
    [
      typeof (emp as any).first_name === "string"
        ? (emp as any).first_name.trim()
        : "",
      typeof (emp as any).last_name === "string"
        ? (emp as any).last_name.trim()
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const empNo =
    (typeof (emp as any).employee_number === "string" &&
      (emp as any).employee_number.trim()) ||
    (typeof (emp as any).payroll_number === "string" &&
      (emp as any).payroll_number.trim()) ||
    "";

  if (name && empNo) return name + " (" + empNo + ")";
  if (name) return name;
  if (empNo) return "Employee " + empNo;
  return fallbackId;
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<SearchParamsRecord> };

function isStaffRole(role: string) {
  return ["owner", "admin", "manager", "processor"].includes(
    String(role || "").toLowerCase()
  );
}

export default async function AbsencePage({ searchParams }: Props) {
  const sp: SearchParamsRecord | undefined = searchParams
    ? await searchParams
    : undefined;

  const deletedParam = typeof sp?.deleted === "string" ? sp.deleted : "";
  const deleteErrorParam =
    typeof sp?.deleteError === "string" ? sp.deleteError : "";

  const activeCompanyId = await getActiveCompanyId();

  if (!activeCompanyId) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">
              No active company selected
            </div>
            <div className="mt-1 text-sm text-neutral-700">
              Select a company on the Dashboard, then come back here.
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  if (!isUuid(activeCompanyId)) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">
              Invalid active company
            </div>
            <div className="mt-1 text-sm text-neutral-700">
              Re-select your company on the Dashboard.
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const supabase = await getServerSupabase();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">
              Sign in required
            </div>
            <div className="mt-1 text-sm text-neutral-700">
              Please sign in again.
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const { data: membership, error: memErr } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", activeCompanyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr || !membership) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">
              Company access denied
            </div>
            <div className="mt-1 text-sm text-neutral-700">
              You do not have access to the active company.
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const role = String((membership as any).role || "member");
  const canDelete = isStaffRole(role);

  async function deleteAbsenceAction(formData: FormData) {
    "use server";

    const activeCompanyIdInner = await getActiveCompanyId();
    if (!activeCompanyIdInner || !isUuid(activeCompanyIdInner)) {
      redirect(
        "/dashboard/absence?deleteError=" +
          encodeURIComponent("No active company selected")
      );
    }

    const supabaseInner = await getServerSupabase();
    const { data: userDataInner } = await supabaseInner.auth.getUser();
    const userInner = userDataInner?.user ?? null;

    if (!userInner) {
      redirect(
        "/dashboard/absence?deleteError=" +
          encodeURIComponent("Sign in required")
      );
    }

    const { data: membershipInner } = await supabaseInner
      .from("company_memberships")
      .select("role")
      .eq("company_id", activeCompanyIdInner)
      .eq("user_id", userInner.id)
      .maybeSingle();

    const roleInner = String((membershipInner as any)?.role || "member");
    if (!isStaffRole(roleInner)) {
      redirect(
        "/dashboard/absence?deleteError=" +
          encodeURIComponent("You do not have permission to delete absences")
      );
    }

    const absenceIdRaw = formData.get("absenceId");
    const absenceId = typeof absenceIdRaw === "string" ? absenceIdRaw.trim() : "";

    if (!absenceId || !isUuid(absenceId)) {
      redirect(
        "/dashboard/absence?deleteError=" + encodeURIComponent("Missing absence id")
      );
    }

    const { data: checkRow, error: checkErr } = await supabaseInner
      .from("absences")
      .select("id,status")
      .eq("id", absenceId)
      .eq("company_id", activeCompanyIdInner)
      .maybeSingle();

    if (checkErr || !checkRow) {
      redirect(
        "/dashboard/absence?deleteError=" +
          encodeURIComponent("Absence not found for this company")
      );
    }

    const st = String((checkRow as any).status || "").trim().toLowerCase();
    const processedInPayroll =
      st === "processed" ||
      st === "approved" ||
      st === "rti_submitted" ||
      st === "completed";

    if (processedInPayroll) {
      redirect(
        "/dashboard/absence?deleteError=" +
          encodeURIComponent("This absence is locked because it has been processed in payroll")
      );
    }

    const { data, error } = await supabaseInner
      .from("absences")
      .delete()
      .eq("id", absenceId)
      .eq("company_id", activeCompanyIdInner)
      .select("id");

    if (error) {
      redirect(
        "/dashboard/absence?deleteError=" +
          encodeURIComponent(error.message ?? "Delete failed")
      );
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
        .select("id, first_name, last_name, employee_number, payroll_number, full_name, name")
        .eq("company_id", activeCompanyId)
        .in("id", employeeIds);

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
        (typeof (emp as any)?.employee_number === "string" &&
          (emp as any).employee_number.trim()) ||
        (typeof (emp as any)?.payroll_number === "string" &&
          (emp as any).payroll_number.trim()) ||
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
            {deletedParam === "1" ? (
              <div className="text-xs text-green-700">Deleted.</div>
            ) : null}
            {deleteErrorParam ? (
              <div className="text-xs text-red-700">
                Delete error: {deleteErrorParam}
              </div>
            ) : null}
            {loadError ? (
              <div className="text-xs text-red-700">Load error: {loadError}</div>
            ) : null}
            {!canDelete ? (
              <div className="text-xs text-neutral-700">
                Delete is disabled for your role.
              </div>
            ) : null}
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