// C:\Projects\wageflow01\app\dashboard\absence\[id]\edit\page.tsx
/* @ts-nocheck */

import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatUkDate } from "@/lib/formatUkDate";

export const runtime = "nodejs";
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
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function safeDateOrEmpty(v: unknown) {
  const s = safeStr(v).trim();
  return s || "";
}

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
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
    case "bereaved_partners_paternity":
      return "Bereaved partner's paternity";
    default:
      return v.replaceAll("_", " ");
  }
}

function statusLabel(s: string | null | undefined): string {
  const v = String(s ?? "").trim();
  if (!v) return "Unknown";

  switch (v) {
    case "draft":
      return "Draft";
    case "scheduled":
      return "Scheduled";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return v.replaceAll("_", " ");
  }
}

function employeeLabel(emp: EmployeeRow | undefined | null, fallback: string) {
  if (!emp) return fallback;

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
  return fallback;
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function AbsenceEditPage({ params, searchParams }: Props) {
  const p = await params;
  const absenceId = safeStr(p?.id).trim();

  const sp: SearchParamsRecord | undefined = searchParams ? await searchParams : undefined;
  const errorParam = typeof sp?.error === "string" ? sp.error : "";
  const savedParam = typeof sp?.saved === "string" ? sp.saved : "";

  const cookieStore = await cookies();
  const activeCompanyId =
    cookieStore.get("active_company_id")?.value ?? cookieStore.get("company_id")?.value ?? "";

  const supabase = getAdminClientOrNull();

  async function saveAbsenceAction(formData: FormData) {
    "use server";

    const cookieStoreInner = await cookies();
    const activeCompanyIdInner =
      cookieStoreInner.get("active_company_id")?.value ??
      cookieStoreInner.get("company_id")?.value ??
      "";

    if (!activeCompanyIdInner) {
      redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` + encodeURIComponent("No active company selected"));
    }

    const supabaseInner = getAdminClientOrNull();
    if (!supabaseInner) {
      redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` + encodeURIComponent("Server config missing"));
    }

    const first_day = safeStr(formData.get("first_day")).trim();
    const last_day_expected = safeStr(formData.get("last_day_expected")).trim();
    const last_day_actual_raw = safeStr(formData.get("last_day_actual")).trim();
    const reference_notes = safeStr(formData.get("reference_notes")).trim();
    const type = safeStr(formData.get("type")).trim();
    const status = safeStr(formData.get("status")).trim();

    if (!first_day || !isIsoDate(first_day)) {
      redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` + encodeURIComponent("Start date is required and must be a valid date"));
    }

    if (!last_day_expected || !isIsoDate(last_day_expected)) {
      redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` + encodeURIComponent("Expected end date is required and must be a valid date"));
    }

    const last_day_actual = last_day_actual_raw ? last_day_actual_raw : null;
    if (last_day_actual && !isIsoDate(last_day_actual)) {
      redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` + encodeURIComponent("Actual end date must be a valid date or left blank"));
    }

    const updatePayload: Record<string, any> = {
      first_day,
      last_day_expected,
      last_day_actual,
      reference_notes: reference_notes || null,
    };

    if (type) updatePayload.type = type;
    if (status) updatePayload.status = status;

    const { data, error } = await supabaseInner
      .from("absences")
      .update(updatePayload)
      .eq("id", absenceId)
      .eq("company_id", activeCompanyIdInner)
      .select("id")
      .maybeSingle();

    if (error) {
      const msg = String(error.message || "Save failed");

      const code = String((error as any)?.code || "");
      const lower = msg.toLowerCase();

      if (code === "23P01" || lower.includes("absences_no_overlap_per_employee")) {
        redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` + encodeURIComponent("Save blocked: these dates overlap another absence for this employee."));
      }

      redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` + encodeURIComponent(msg));
    }

    if (!data?.id) {
      redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` + encodeURIComponent("Nothing updated. Not found for this company."));
    }

    revalidatePath("/dashboard/absence/list");
    revalidatePath(`/dashboard/absence/${encodeURIComponent(absenceId)}`);
    redirect(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit?saved=1`);
  }

  if (!absenceId) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">Missing absence</div>
            <div className="mt-1 text-sm text-neutral-700">The URL is missing the record.</div>
            <div className="mt-4">
              <Link href="/dashboard/absence/list" className="text-sm text-blue-700 underline">
                Back to absence list
              </Link>
            </div>
          </div>
        </div>
      </PageTemplate>
    );
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
            <div className="mt-4">
              <Link href="/dashboard/absence/list" className="text-sm text-blue-700 underline">
                Back to absence list
              </Link>
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
            <div className="mt-4">
              <Link href="/dashboard/absence/list" className="text-sm text-blue-700 underline">
                Back to absence list
              </Link>
            </div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  let absence: AbsenceRow | null = null;
  let loadError: string | null = null;

  try {
    const { data, error } = await supabase
      .from("absences")
      .select("id, company_id, employee_id, type, status, first_day, last_day_expected, last_day_actual, reference_notes")
      .eq("id", absenceId)
      .eq("company_id", activeCompanyId)
      .maybeSingle();

    if (error) {
      loadError = error.message ?? "Could not load this absence.";
      absence = null;
    } else {
      absence = data ? (data as AbsenceRow) : null;
      if (!absence) loadError = "Could not load this absence.";
    }
  } catch (e: any) {
    loadError = e?.message ?? "Could not load this absence.";
    absence = null;
  }

  let employeeText = "Employee";
  if (absence?.employee_id) {
    try {
      const { data: empData, error: empErr } = await supabase
        .from("employees")
        .select("*")
        .eq("id", absence.employee_id)
        .maybeSingle();

      if (!empErr && empData) {
        employeeText = employeeLabel(empData as EmployeeRow, "Employee");
      }
    } catch {
      employeeText = "Employee";
    }
  }

  const statusLower = safeStr(absence?.status).trim().toLowerCase();
  const editingLocked = statusLower === "cancelled" || statusLower === "completed";

  const startIso = safeDateOrEmpty(absence?.first_day);
  const endExpectedIso = safeDateOrEmpty(absence?.last_day_expected);
  const endActualIso = safeDateOrEmpty(absence?.last_day_actual);

  return (
    <PageTemplate title="Absence" currentSection="absence">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-neutral-900">Edit absence</div>

              {savedParam === "1" ? <div className="mt-2 text-xs text-green-700">Saved.</div> : null}
              {errorParam ? <div className="mt-2 text-xs text-red-700">Save error: {errorParam}</div> : null}
              {loadError ? <div className="mt-2 text-xs text-red-700">Load error: {loadError}</div> : null}
            </div>

            <div className="shrink-0">
              <Link href="/dashboard/absence/list" className="text-sm text-blue-700 underline">
                Back to absence list
              </Link>
            </div>
          </div>

          {!absence ? (
            <div className="mt-4 text-sm text-neutral-700">
              This absence could not be loaded for the active company.
            </div>
          ) : (
            <div className="mt-4">
              <div className="text-sm text-neutral-900 font-semibold">{employeeText}</div>
              <div className="mt-1 text-xs text-neutral-600">
                Type: {typeLabel(absence.type)} | Status: {statusLabel(absence.status)}
              </div>

              {editingLocked ? (
                <div className="mt-2 text-xs text-neutral-700">
                  This absence is {statusLabel(absence.status).toLowerCase()}. Editing is disabled.
                </div>
              ) : null}

              <form action={saveAbsenceAction} className="mt-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900">Start date</label>
                    <input
                      name="first_day"
                      type="date"
                      defaultValue={startIso}
                      className="mt-2 w-full rounded-xl ring-1 ring-neutral-300 px-3 py-2 text-sm"
                      disabled={editingLocked}
                    />
                    <div className="mt-1 text-xs text-neutral-600">{startIso ? "UK: " + formatUkDate(startIso) : ""}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-900">Expected end date</label>
                    <input
                      name="last_day_expected"
                      type="date"
                      defaultValue={endExpectedIso}
                      className="mt-2 w-full rounded-xl ring-1 ring-neutral-300 px-3 py-2 text-sm"
                      disabled={editingLocked}
                    />
                    <div className="mt-1 text-xs text-neutral-600">
                      {endExpectedIso ? "UK: " + formatUkDate(endExpectedIso) : ""}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-900">Actual end date</label>
                    <input
                      name="last_day_actual"
                      type="date"
                      defaultValue={endActualIso}
                      className="mt-2 w-full rounded-xl ring-1 ring-neutral-300 px-3 py-2 text-sm"
                      disabled={editingLocked}
                    />
                    <div className="mt-1 text-xs text-neutral-600">
                      {endActualIso ? "UK: " + formatUkDate(endActualIso) : "Leave blank if not known"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900">Type</label>
                    <select
                      name="type"
                      defaultValue={safeStr(absence.type) || ""}
                      className="mt-2 w-full rounded-xl ring-1 ring-neutral-300 px-3 py-2 text-sm bg-white"
                      disabled={editingLocked}
                    >
                      <option value="">Unknown</option>
                      <option value="annual_leave">Annual leave</option>
                      <option value="sickness">Sickness</option>
                      <option value="maternity">Maternity</option>
                      <option value="paternity">Paternity</option>
                      <option value="shared_parental">Shared parental</option>
                      <option value="adoption">Adoption</option>
                      <option value="parental_bereavement">Parental bereavement</option>
                      <option value="unpaid_leave">Unpaid leave</option>
                      <option value="bereaved_partners_paternity">Bereaved partner's paternity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-900">Status</label>
                    <select
                      name="status"
                      defaultValue={safeStr(absence.status) || "draft"}
                      className="mt-2 w-full rounded-xl ring-1 ring-neutral-300 px-3 py-2 text-sm bg-white"
                      disabled={editingLocked}
                    >
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-900">Reference notes</label>
                  <textarea
                    name="reference_notes"
                    defaultValue={absence.reference_notes ?? ""}
                    rows={5}
                    className="mt-2 w-full rounded-xl ring-1 ring-neutral-300 p-3 text-sm"
                    disabled={editingLocked}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={editingLocked}
                    className={
                      "rounded-xl px-5 py-2 font-semibold text-white " +
                      (editingLocked ? "bg-neutral-400 opacity-60 cursor-not-allowed" : "bg-green-600 hover:bg-green-700")
                    }
                  >
                    Save
                  </button>

                  <Link href="/dashboard/absence/list" className="text-sm text-blue-700 underline">
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}