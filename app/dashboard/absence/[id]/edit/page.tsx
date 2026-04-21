// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\[id]\edit\page.tsx

import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatUkDate } from "@/lib/formatUkDate";
import { createClient } from "@/lib/supabase/server";
import DeleteAbsenceButton from "../DeleteAbsenceButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

type EmployeeContractRow = {
  id: string;
  contract_number: string | null;
  job_title: string | null;
  status: string | null;
  start_date: string | null;
  leave_date: string | null;
  pay_after_leaving?: boolean | null;
  created_at?: string | null;
};

type AbsenceContractTargetRow = {
  contract_id: string | null;
};

type AbsenceTypeItem = {
  code: string;
  label: string;
  endpoint?: string;
  category?: string;
  paid_default?: boolean;
  effective_from?: string | null;
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParamsRecord>;
};

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

function fallbackAbsenceTypes(): AbsenceTypeItem[] {
  return [
    { code: "annual_leave", label: "Annual leave" },
    { code: "sickness", label: "Sickness" },
    { code: "maternity", label: "Maternity" },
    { code: "paternity", label: "Paternity" },
    { code: "shared_parental", label: "Shared parental leave" },
    { code: "adoption", label: "Adoption" },
    { code: "parental_bereavement", label: "Parental bereavement" },
    { code: "unpaid_leave", label: "Unpaid leave" },
    { code: "bereaved_partners_paternity", label: "Bereaved partner's paternity leave" },
  ];
}

function getContractSuffixNumber(contractNumber: string | null | undefined): number | null {
  const raw = String(contractNumber || "").trim();
  if (!raw) return null;
  const match = raw.match(/-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function toSortableTime(value: string | null | undefined): number {
  const raw = String(value || "").trim();
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
}

function sortContractsMainFirst(rows: EmployeeContractRow[]): EmployeeContractRow[] {
  return [...rows].sort((a, b) => {
    const aSuffix = getContractSuffixNumber(a.contract_number);
    const bSuffix = getContractSuffixNumber(b.contract_number);

    if (aSuffix !== null && bSuffix !== null && aSuffix !== bSuffix) {
      return aSuffix - bSuffix;
    }

    if (aSuffix !== null && bSuffix === null) return -1;
    if (aSuffix === null && bSuffix !== null) return 1;

    const aStart = toSortableTime(a.start_date);
    const bStart = toSortableTime(b.start_date);
    if (aStart !== bStart) return aStart - bStart;

    const aCreated = toSortableTime(a.created_at);
    const bCreated = toSortableTime(b.created_at);
    if (aCreated !== bCreated) return aCreated - bCreated;

    return String(a.contract_number || "").localeCompare(String(b.contract_number || ""));
  });
}

function contractStatusLabel(value: string | null | undefined) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "active") return "Active";
  if (v === "inactive") return "Inactive";
  if (v === "leaver") return "Leaver";
  return v ? v.replaceAll("_", " ") : "Unknown";
}

function contractPillClass(status: string | null | undefined) {
  const v = String(status || "").trim().toLowerCase();
  if (v === "active") {
    return "inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800";
  }
  if (v === "leaver") {
    return "inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900";
  }
  return "inline-flex items-center rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700";
}

async function loadAbsenceTypesFromApi(): Promise<AbsenceTypeItem[] | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "";
    if (!host) return null;

    const proto =
      h.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");

    const baseUrl = `${proto}://${host}`;

    const res = await fetch(`${baseUrl}/api/absence/types`, { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok || data?.ok === false) return null;

    const items = Array.isArray(data?.items) ? data.items : null;
    if (!items) return null;

    const cleaned: AbsenceTypeItem[] = items
      .map((x: any) => ({
        code: String(x?.code || "").trim(),
        label: String(x?.label || x?.code || "").trim(),
        endpoint: x?.endpoint,
        category: x?.category,
        paid_default: x?.paid_default,
        effective_from: x?.effective_from ?? null,
      }))
      .filter((x: any) => x.code && x.label);

    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

async function getActiveCompanyId(): Promise<string> {
  const cookieStore = await cookies();
  return String(
    cookieStore.get("active_company_id")?.value ??
      cookieStore.get("company_id")?.value ??
      ""
  ).trim();
}

export default async function AbsenceEditPage({ params, searchParams }: Props) {
  const p = await params;
  const absenceId = safeStr(p?.id).trim();

  const sp: SearchParamsRecord | undefined = searchParams ? await searchParams : undefined;
  const errorParam = typeof sp?.error === "string" ? sp.error : "";
  const savedParam = typeof sp?.saved === "string" ? sp.saved : "";

  async function saveAbsenceAction(formData: FormData) {
    "use server";

    const activeCompanyIdInner = await getActiveCompanyId();

    if (!activeCompanyIdInner) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("No active company selected")
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user ?? null;

    if (authErr || !user) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Not signed in. Log in again.")
      );
    }

    const { data: membership, error: memErr } = await supabase
      .from("company_memberships")
      .select("role")
      .eq("company_id", activeCompanyIdInner)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr || !membership) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("You do not have access to this company.")
      );
    }

    const { data: currentAbsence, error: currentAbsenceErr } = await supabase
      .from("absences")
      .select("id, employee_id, type, first_day, last_day_expected, last_day_actual, reference_notes, status")
      .eq("id", absenceId)
      .eq("company_id", activeCompanyIdInner)
      .maybeSingle();

    if (currentAbsenceErr || !currentAbsence) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("This absence could not be found for the active company.")
      );
    }

    const currentAbsenceRow = currentAbsence as AbsenceRow;

    const first_day = safeStr(formData.get("first_day")).trim();
    const last_day_expected = safeStr(formData.get("last_day_expected")).trim();
    const last_day_actual_raw = safeStr(formData.get("last_day_actual")).trim();
    const reference_notes = safeStr(formData.get("reference_notes")).trim();
    const type = safeStr(formData.get("type")).trim();
    const status = safeStr(formData.get("status")).trim();

    const selectedContractIds = Array.from(
      new Set(
        formData
          .getAll("selected_contract_ids")
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter(Boolean)
      )
    );

    if (!first_day || !isIsoDate(first_day)) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Start date is required and must be a valid date")
      );
    }

    if (!last_day_expected || !isIsoDate(last_day_expected)) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Expected end date is required and must be a valid date")
      );
    }

    const last_day_actual = last_day_actual_raw ? last_day_actual_raw : null;

    if (last_day_actual && !isIsoDate(last_day_actual)) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Actual end date must be a valid date or left blank")
      );
    }

    if (last_day_expected < first_day) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Expected end date cannot be earlier than the start date")
      );
    }

    if (last_day_actual && last_day_actual < first_day) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Actual end date cannot be earlier than the start date")
      );
    }

    if (type === "sickness") {
      const { data: validContractsRaw, error: validContractsErr } = await supabase
        .from("employee_contracts")
        .select("id")
        .eq("company_id", activeCompanyIdInner)
        .eq("employee_id", currentAbsenceRow.employee_id);

      if (validContractsErr) {
        redirect(
          `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
            encodeURIComponent("Could not validate selected contracts.")
        );
      }

      const validIds = new Set(
        (Array.isArray(validContractsRaw) ? validContractsRaw : [])
          .map((row: any) => String(row?.id || "").trim())
          .filter(Boolean)
      );

      if (validIds.size > 0 && selectedContractIds.length === 0) {
        redirect(
          `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
            encodeURIComponent("Select at least one contract affected by this sickness absence.")
        );
      }

      const invalidIds = selectedContractIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        redirect(
          `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
            encodeURIComponent("One or more selected contracts are invalid for this employee.")
        );
      }
    }

    const updatePayload: Record<string, any> = {
      first_day,
      last_day_expected,
      last_day_actual,
      reference_notes: reference_notes || null,
      type: type || null,
      status: status || null,
    };

    const { data, error } = await supabase
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
        redirect(
          `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
            encodeURIComponent("Save blocked: these dates overlap another absence for this employee.")
        );
      }

      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent(msg)
      );
    }

    if (!data?.id) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Nothing updated. Not found for this company.")
      );
    }

    if (type === "sickness") {
      const sicknessEndDate = last_day_actual || last_day_expected;

      const { data: updatedSicknessRows, error: sicknessUpdateErr } = await supabase
        .from("sickness_periods")
        .update({
          company_id: activeCompanyIdInner,
          employee_id: currentAbsenceRow.employee_id,
          start_date: first_day,
          end_date: sicknessEndDate,
        })
        .eq("company_id", activeCompanyIdInner)
        .eq("absence_id", absenceId)
        .select("id");

      if (sicknessUpdateErr) {
        redirect(
          `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
            encodeURIComponent("Absence saved, but the sickness period could not be updated.")
        );
      }

      if (!Array.isArray(updatedSicknessRows) || updatedSicknessRows.length === 0) {
        const { error: sicknessInsertErr } = await supabase.from("sickness_periods").insert({
          absence_id: absenceId,
          company_id: activeCompanyIdInner,
          employee_id: currentAbsenceRow.employee_id,
          start_date: first_day,
          end_date: sicknessEndDate,
        });

        if (sicknessInsertErr) {
          redirect(
            `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
              encodeURIComponent("Absence saved, but the sickness period could not be stored.")
          );
        }
      }

      const { error: deleteTargetsErr } = await supabase
        .from("absence_contract_targets")
        .delete()
        .eq("company_id", activeCompanyIdInner)
        .eq("absence_id", absenceId);

      if (deleteTargetsErr) {
        redirect(
          `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
            encodeURIComponent("Absence saved, but the old contract targets could not be cleared.")
        );
      }

      if (selectedContractIds.length > 0) {
        const targetRows = selectedContractIds.map((contractId) => ({
          company_id: activeCompanyIdInner,
          absence_id: absenceId,
          employee_id: currentAbsenceRow.employee_id,
          contract_id: contractId,
        }));

        const { error: targetInsertErr } = await supabase
          .from("absence_contract_targets")
          .insert(targetRows);

        if (targetInsertErr) {
          redirect(
            `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
              encodeURIComponent("Absence saved, but the selected contract targets could not be stored.")
          );
        }
      }
    } else {
      if (currentAbsenceRow.type === "sickness") {
        const { error: deleteTargetsErr } = await supabase
          .from("absence_contract_targets")
          .delete()
          .eq("company_id", activeCompanyIdInner)
          .eq("absence_id", absenceId);

        if (deleteTargetsErr) {
          redirect(
            `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
              encodeURIComponent("Absence saved, but old sickness contract targets could not be removed.")
          );
        }

        const { error: deleteSicknessErr } = await supabase
          .from("sickness_periods")
          .delete()
          .eq("company_id", activeCompanyIdInner)
          .eq("absence_id", absenceId);

        if (deleteSicknessErr) {
          redirect(
            `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
              encodeURIComponent("Absence saved, but the old sickness period could not be removed.")
          );
        }
      }
    }

    revalidatePath("/dashboard/absence");
    revalidatePath("/dashboard/absence/list");
    revalidatePath(`/dashboard/absence/${encodeURIComponent(absenceId)}`);
    revalidatePath(`/dashboard/absence/${encodeURIComponent(absenceId)}/edit`);

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

  const activeCompanyId = await getActiveCompanyId();

  if (!activeCompanyId) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">No active company selected</div>
            <div className="mt-1 text-sm text-neutral-700">Select a company on the Dashboard, then come back here.</div>
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

  const supabase = await createClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  if (authErr || !user) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">Not signed in</div>
            <div className="mt-1 text-sm text-neutral-700">Log in again, then retry this page.</div>
            <div className="mt-4">
              <Link href="/login" className="text-sm text-blue-700 underline">
                Go to login
              </Link>
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
            <div className="text-sm font-semibold text-neutral-900">Access blocked</div>
            <div className="mt-1 text-sm text-neutral-700">You do not have access to the active company.</div>
            <div className="mt-4">
              <Link href="/dashboard/companies" className="text-sm text-blue-700 underline">
                Go to Companies
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

  let employeeContracts: EmployeeContractRow[] = [];
  let selectedContractIdSet = new Set<string>();

  if (absence?.type === "sickness" && absence.employee_id) {
    try {
      const { data: contractData, error: contractErr } = await supabase
        .from("employee_contracts")
        .select("id, contract_number, job_title, status, start_date, leave_date, pay_after_leaving, created_at")
        .eq("company_id", activeCompanyId)
        .eq("employee_id", absence.employee_id);

      if (!contractErr && Array.isArray(contractData)) {
        employeeContracts = sortContractsMainFirst(contractData as EmployeeContractRow[]);
      }
    } catch {
      employeeContracts = [];
    }

    try {
      const { data: targetData, error: targetErr } = await supabase
        .from("absence_contract_targets")
        .select("contract_id")
        .eq("company_id", activeCompanyId)
        .eq("absence_id", absence.id);

      if (!targetErr && Array.isArray(targetData)) {
        selectedContractIdSet = new Set(
          (targetData as AbsenceContractTargetRow[])
            .map((row) => String(row?.contract_id || "").trim())
            .filter(Boolean)
        );
      }
    } catch {
      selectedContractIdSet = new Set<string>();
    }
  }

  const statusLower = safeStr(absence?.status).trim().toLowerCase();
  const editingLocked = statusLower === "cancelled" || statusLower === "completed";

  const startIso = safeDateOrEmpty(absence?.first_day);
  const endExpectedIso = safeDateOrEmpty(absence?.last_day_expected);
  const endActualIso = safeDateOrEmpty(absence?.last_day_actual);

  const apiTypes = await loadAbsenceTypesFromApi();
  let types: AbsenceTypeItem[] = apiTypes && apiTypes.length ? apiTypes : fallbackAbsenceTypes();

  const seen = new Set<string>();
  types = types
    .map((t) => ({ code: String(t.code || "").trim(), label: String(t.label || t.code || "").trim() }))
    .filter((t) => {
      if (!t.code || !t.label) return false;
      if (seen.has(t.code)) return false;
      seen.add(t.code);
      return true;
    });

  const currentType = safeStr(absence?.type).trim();
  if (currentType && !types.some((t) => t.code === currentType)) {
    types = [{ code: currentType, label: currentType.replaceAll("_", " ") }, ...types];
  }

  const typeLabelMap: Record<string, string> = {};
  for (const t of types) typeLabelMap[t.code] = t.label;

  const currentTypeLabel = currentType
    ? typeLabelMap[currentType] || currentType.replaceAll("_", " ")
    : "Unknown";

  const showSicknessContracts = currentType === "sickness";

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
                Type: {currentTypeLabel} | Status: {statusLabel(absence.status)}
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
                    <div className="mt-1 text-xs text-neutral-600">
                      {startIso ? "UK: " + formatUkDate(startIso) : ""}
                    </div>
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
                      defaultValue={currentType || ""}
                      className="mt-2 w-full rounded-xl ring-1 ring-neutral-300 px-3 py-2 text-sm bg-white"
                      disabled={editingLocked}
                    >
                      <option value="">Unknown</option>
                      {types.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.label}
                        </option>
                      ))}
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

                {showSicknessContracts ? (
                  <section className="flex flex-col gap-3">
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">Affected contracts</div>
                      <div className="mt-1 text-xs text-neutral-600">
                        Tick every contract that should receive this sickness absence.
                      </div>
                    </div>

                    {employeeContracts.length === 0 ? (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                        No contracts were found for this employee.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {employeeContracts.map((contract) => {
                          const contractId = String(contract.id || "").trim();
                          const checked = selectedContractIdSet.has(contractId);
                          const startLabel = contract.start_date
                            ? formatUkDate(contract.start_date, contract.start_date)
                            : "No start date";
                          const leaveLabel = contract.leave_date
                            ? formatUkDate(contract.leave_date, contract.leave_date)
                            : "";

                          return (
                            <label
                              key={contractId}
                              className={`flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition ${
                                checked
                                  ? "border-blue-600 bg-blue-50/60"
                                  : "border-neutral-300 bg-white hover:bg-neutral-50"
                              } ${editingLocked ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  name="selected_contract_ids"
                                  value={contractId}
                                  defaultChecked={checked}
                                  disabled={editingLocked}
                                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-600"
                                />

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-semibold text-neutral-900">
                                      {String(contract.contract_number || "").trim() || "Unnamed contract"}
                                    </div>

                                    <span className={contractPillClass(contract.status)}>
                                      {contractStatusLabel(contract.status)}
                                    </span>

                                    {contract.pay_after_leaving === true ? (
                                      <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                                        Pay after leaving
                                      </span>
                                    ) : null}
                                  </div>

                                  {String(contract.job_title || "").trim() ? (
                                    <div className="mt-1 text-sm text-neutral-700">
                                      {String(contract.job_title || "").trim()}
                                    </div>
                                  ) : null}

                                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-600">
                                    <span>Start: {startLabel}</span>
                                    {leaveLabel ? <span>Leave: {leaveLabel}</span> : null}
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ) : null}

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

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={editingLocked}
                    className={
                      "rounded-xl px-5 py-2 font-semibold text-white " +
                      (editingLocked
                        ? "bg-neutral-400 opacity-60 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700")
                    }
                  >
                    Save
                  </button>

                  <Link
                    href="/dashboard/absence/list"
                    className="inline-flex items-center justify-center rounded-full bg-[#23408e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d3576]"
                  >
                    Cancel
                  </Link>

                  <DeleteAbsenceButton
                    absenceId={absence.id}
                    redirectTo="/dashboard/absence/list"
                  />
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}