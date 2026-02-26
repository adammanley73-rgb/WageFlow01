// C:\Projects\wageflow01\app\dashboard\absence\[id]\edit\page.tsx
/* @ts-nocheck */

import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatUkDate } from "@/lib/formatUkDate";

export const runtime = "nodejs";
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
  [key: string]: any;
};

type EmployeeRow = {
  id: string;
  [key: string]: any;
};

type AbsenceTypeItem = {
  code: string;
  label: string;
  endpoint?: string;
  category?: string;
  paid_default?: boolean;
  effective_from?: string | null;
};

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
}

function readChunkedCookieValue(
  all: { name: string; value: string }[],
  baseName: string
): string | null {
  const exact = all.find((c) => c.name === baseName);
  if (exact) return exact.value;

  const parts = all
    .filter((c) => c.name.startsWith(baseName + "."))
    .map((c) => {
      const m = c.name.match(/\.(\d+)$/);
      const idx = m ? Number(m[1]) : 0;
      return { idx, value: c.value };
    })
    .sort((a, b) => a.idx - b.idx);

  if (parts.length === 0) return null;
  return parts.map((p) => p.value).join("");
}

async function extractAccessTokenFromCookies(): Promise<string | null> {
  try {
    const jar = await cookies();
    const all = jar.getAll();

    const bases = new Set<string>();
    for (const c of all) {
      const n = c.name;
      if (!n.includes("auth-token")) continue;
      if (!n.startsWith("sb-") && !n.includes("sb-")) continue;
      bases.add(n.replace(/\.\d+$/, ""));
    }

    for (const base of bases) {
      const raw = readChunkedCookieValue(all as any, base);
      if (!raw) continue;

      const decoded = (() => {
        try {
          return decodeURIComponent(raw);
        } catch {
          return raw;
        }
      })();

      try {
        const obj = JSON.parse(decoded);
        if (obj && typeof obj.access_token === "string") return obj.access_token;
      } catch {}

      try {
        const asJson = Buffer.from(decoded, "base64").toString("utf8");
        const obj = JSON.parse(asJson);
        if (obj && typeof obj.access_token === "string") return obj.access_token;
      } catch {}
    }

    return null;
  } catch {
    return null;
  }
}

async function createSupabaseRlsClientOrNull(): Promise<{ supabase: any; hasToken: boolean } | null> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;

  const token = await extractAccessTokenFromCookies();

  const opts: any = {
    auth: { persistSession: false, autoRefreshToken: false },
  };

  if (token) {
    opts.global = { headers: { Authorization: `Bearer ${token}` } };
  }

  return { supabase: createClient(url, anonKey, opts), hasToken: Boolean(token) };
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

  const client = await createSupabaseRlsClientOrNull();

  async function saveAbsenceAction(formData: FormData) {
    "use server";

    const cookieStoreInner = await cookies();
    const activeCompanyIdInner =
      cookieStoreInner.get("active_company_id")?.value ??
      cookieStoreInner.get("company_id")?.value ??
      "";

    if (!activeCompanyIdInner) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("No active company selected")
      );
    }

    const clientInner = await createSupabaseRlsClientOrNull();
    if (!clientInner) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Server config missing")
      );
    }

    if (!clientInner.hasToken) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("Not signed in. Log in again.")
      );
    }

    const supabaseInner = clientInner.supabase;

    const { data: membership, error: memErr } = await supabaseInner
      .from("company_memberships")
      .select("role")
      .eq("company_id", activeCompanyIdInner)
      .maybeSingle();

    if (memErr || !membership) {
      redirect(
        `/dashboard/absence/${encodeURIComponent(absenceId)}/edit?error=` +
          encodeURIComponent("You do not have access to this company.")
      );
    }

    const first_day = safeStr(formData.get("first_day")).trim();
    const last_day_expected = safeStr(formData.get("last_day_expected")).trim();
    const last_day_actual_raw = safeStr(formData.get("last_day_actual")).trim();
    const reference_notes = safeStr(formData.get("reference_notes")).trim();
    const type = safeStr(formData.get("type")).trim();
    const status = safeStr(formData.get("status")).trim();

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

  if (!client) {
    return (
      <PageTemplate title="Absence" currentSection="absence">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">Server config missing</div>
            <div className="mt-1 text-sm text-neutral-700">
              SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set on the server.
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

  if (!client.hasToken) {
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

  const supabase = client.supabase;

  const { data: membership, error: memErr } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", activeCompanyId)
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

  const currentTypeLabel = currentType ? typeLabelMap[currentType] || currentType.replaceAll("_", " ") : "Unknown";

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
            <div className="mt-4 text-sm text-neutral-700">This absence could not be loaded for the active company.</div>
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