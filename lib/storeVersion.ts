/**
 * WageFlow demo localStorage namespace with versioning and one-time migration.
 * Goals:
 * - Single key: "wfStore"
 * - Version flag with safe upgrades
 * - Helpers for Employees and Absences
 * - Refresh event for tiles/pickers
 * - Light data hygiene (e.g., NI uppercase)
 */

export const STORAGE_KEY = "wfStore";
const STORE_VERSION = 2;

// CustomEvent name used across the app to trigger re-reads
export const REFRESH_EVENT = "wageflow:store-refresh";

// -------- Types kept intentionally loose to avoid app coupling --------
export type Employee = {
  id: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // ISO
  niNumber?: string;
  payGroup?: string;
  payType?: "hourly" | "salaried";
  hourlyRate?: number;
  salaryAnnual?: number;
  weeklyHours?: number;
  apprenticeFirstYear?: boolean;
};

type StoreShape = {
  version: number;
  employees: Employee[];
  absences: any[]; // use page-level shapes for reads/writes
  // reserved buckets for future
  payGroups?: any[];
  meta?: Record<string, any>;
};

// -------- Public API --------

/**
 * Ensure storage exists and is on current version.
 * Safe to call multiple times.
 */
export function ensureStoreReady(): void {
  if (typeof window === "undefined") return;

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      // Try to migrate legacy scattered keys on first run
      const migrated = migrateLegacyToSingleKey();
      if (!migrated) {
        const fresh: StoreShape = { version: STORE_VERSION, employees: [], absences: [] };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      }
      return;
    }

    // If present, validate and bump version if needed
    const parsed = safeParse(existing, { version: 0, employees: [], absences: [] }) as StoreShape;
    if (!isFinite(parsed.version) || parsed.version < 1) {
      parsed.version = 1;
    }

    if (parsed.version < STORE_VERSION) {
      const upgraded = upgradeStore(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
    } else {
      // also apply hygiene on load in case of drift
      const cleaned = cleanStore(parsed);
      if (JSON.stringify(cleaned) !== existing) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
    }
  } catch {
    // If storage is broken, reset minimally
    try {
      const fresh: StoreShape = { version: STORE_VERSION, employees: [], absences: [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // give up silently; UI should remain usable without storage
    }
  }
}

/**
 * Dispatch a window event to inform listeners to re-read localStorage.
 */
export function fireRefresh(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
  } catch {
    // older browsers might not support CustomEvent in weird test rigs
    const ev = document.createEvent?.("Event");
    if (ev?.initEvent) {
      ev.initEvent(REFRESH_EVENT, true, true);
      window.dispatchEvent(ev);
    }
  }
}

// ------------ Employees ------------

export function readEmployees(): Employee[] {
  const store = getStore();
  return Array.isArray(store.employees) ? store.employees.slice() : [];
}

export function writeEmployees(list: Employee[]): void {
  const store = getStore();

  // Light hygiene: normalize IDs and NI uppercase
  const normalized = (Array.isArray(list) ? list : []).map((e) => ({
    ...e,
    id: String(e?.id ?? ""),
    niNumber: typeof e?.niNumber === "string" ? e.niNumber.toUpperCase() : e?.niNumber,
  }));

  store.employees = normalized;
  setStore(store);
  fireRefresh();
}

// ------------ Absences ------------

export function readAbsences<T = any>(): T[] {
  const store = getStore();
  return Array.isArray(store.absences) ? (store.absences.slice() as T[]) : ([] as T[]);
}

export function writeAbsences<T = any>(list: T[]): void {
  const store = getStore();
  store.absences = Array.isArray(list) ? list : [];
  setStore(store);
  fireRefresh();
}

// ------------ Low-level helpers ------------

function getStore(): StoreShape {
  if (typeof window === "undefined") {
    // SSR guard: return ephemeral container
    return { version: STORE_VERSION, employees: [], absences: [] };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh: StoreShape = { version: STORE_VERSION, employees: [], absences: [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = safeParse(raw, { version: STORE_VERSION, employees: [], absences: [] }) as StoreShape;
    // ensure structure
    if (!Array.isArray(parsed.employees)) parsed.employees = [];
    if (!Array.isArray(parsed.absences)) parsed.absences = [];
    if (!isFinite(parsed.version)) parsed.version = 1;

    return cleanStore(parsed);
  } catch {
    const fresh: StoreShape = { version: STORE_VERSION, employees: [], absences: [] };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    return fresh;
  }
}

function setStore(store: StoreShape): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanStore(store)));
  } catch {
    // ignore
  }
}

function safeParse(raw: string, fallback: any): any {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Remove obvious junk and keep fields in predictable shapes
function cleanStore(s: StoreShape): StoreShape {
  const employees = (Array.isArray(s.employees) ? s.employees : []).map((e) => ({
    ...e,
    id: String(e?.id ?? ""),
    firstName: toStrOrUndef(e?.firstName),
    lastName: toStrOrUndef(e?.lastName),
    dateOfBirth: toISOOrUndef(e?.dateOfBirth),
    niNumber: typeof e?.niNumber === "string" ? e.niNumber.toUpperCase() : e?.niNumber,
    payGroup: toStrOrUndef(e?.payGroup),
    payType: e?.payType === "hourly" || e?.payType === "salaried" ? e.payType : undefined,
    hourlyRate: toNumOrUndef(e?.hourlyRate),
    salaryAnnual: toNumOrUndef(e?.salaryAnnual),
    weeklyHours: toNumOrUndef(e?.weeklyHours),
    apprenticeFirstYear: typeof e?.apprenticeFirstYear === "boolean" ? e.apprenticeFirstYear : undefined,
  })) as Employee[];

  const absences = Array.isArray(s.absences) ? s.absences : [];

  return {
    version: isFinite(s.version) ? s.version : 1,
    employees,
    absences,
    payGroups: Array.isArray(s.payGroups) ? s.payGroups : undefined,
    meta: s.meta && typeof s.meta === "object" ? s.meta : undefined,
  };
}

function toStrOrUndef(v: any): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function toNumOrUndef(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toISOOrUndef(v: any): string | undefined {
  if (!v) return undefined;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return undefined;
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// -------- Migration logic --------

/**
 * Upgrade a parsed store to current version. Add new buckets conservatively.
 */
function upgradeStore(prev: StoreShape): StoreShape {
  let s = cleanStore(prev);

  // Example bump: v1 -> v2 consolidates and adds meta bucket
  if (s.version < 2) {
    s = { ...s, version: 2, meta: { ...(s.meta || {}), upgradedAt: new Date().toISOString() } };
  }

  // Future migrations go here
  return s;
}

/**
 * One-time sweep for legacy keys and shapes to consolidate into wfStore.
 * Returns true if a migration occurred.
 */
function migrateLegacyToSingleKey(): boolean {
  if (typeof window === "undefined") return false;

  // Known legacy keys seen in early prototypes
  const legacyKeys = [
    "employeeStore",
    "employeesStore",
    "absenceStore",
    "absencesStore",
    "wf_employees",
    "wf_absences",
  ];

  const found: Record<string, any> = {};
  for (const k of legacyKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) found[k] = safeParse(raw, null);
    } catch {
      // ignore bad keys
    }
  }

  // If nothing to migrate, bail
  if (Object.keys(found).length === 0) return false;

  // Build new store from what we found
  const employees: Employee[] = normalizeLegacyEmployees(
    found["employeeStore"] ?? found["employeesStore"] ?? found["wf_employees"]
  );
  const absences: any[] = normalizeLegacyAbsences(
    found["absenceStore"] ?? found["absencesStore"] ?? found["wf_absences"]
  );

  const merged: StoreShape = cleanStore({
    version: STORE_VERSION,
    employees,
    absences,
    meta: { migratedAt: new Date().toISOString(), migratedFrom: Object.keys(found) },
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    // Best-effort cleanup of old keys to prevent future confusion
    for (const k of Object.keys(found)) {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeLegacyEmployees(src: any): Employee[] {
  if (!src) return [];
  const list = Array.isArray(src) ? src : Array.isArray(src?.employees) ? src.employees : [];
  return (list as any[]).map((e) => ({
    id: String(e?.id ?? e?.employeeId ?? cryptoRandomId()),
    firstName: toStrOrUndef(e?.firstName ?? e?.forename ?? e?.first_name),
    lastName: toStrOrUndef(e?.lastName ?? e?.surname ?? e?.last_name),
    dateOfBirth: toISOOrUndef(e?.dateOfBirth ?? e?.dob),
    niNumber: typeof e?.niNumber === "string" ? e.niNumber.toUpperCase() : toStrOrUndef(e?.ni),
    payGroup: toStrOrUndef(e?.payGroup ?? e?.group),
    payType: e?.payType === "hourly" || e?.payType === "salaried" ? e.payType : undefined,
    hourlyRate: toNumOrUndef(e?.hourlyRate ?? e?.hourly),
    salaryAnnual: toNumOrUndef(e?.salaryAnnual ?? e?.salary),
    weeklyHours: toNumOrUndef(e?.weeklyHours ?? e?.hoursPerWeek),
    apprenticeFirstYear: typeof e?.apprenticeFirstYear === "boolean" ? e.apprenticeFirstYear : undefined,
  }));
}

function normalizeLegacyAbsences(src: any): any[] {
  if (!src) return [];
  const list = Array.isArray(src) ? src : Array.isArray(src?.items) ? src.items : [];
  return (list as any[]).map((r) => {
    // Normalize common date fields to ISO yyyy-mm-dd
    const start = toISOOrUndef(r?.startDate ?? r?.start);
    const end = toISOOrUndef(r?.endDate ?? r?.end);
    const type = toStrOrUndef(r?.type) || "sickness";
    return {
      ...r,
      id: String(r?.id ?? cryptoRandomId()),
      type,
      startDate: start ?? r?.startDate ?? r?.start,
      endDate: end ?? r?.endDate ?? r?.end,
      employeeId: String(r?.employeeId ?? r?.empId ?? ""),
      employeeName: toStrOrUndef(r?.employeeName ?? r?.name) ?? "",
      _version: 1,
    };
  });
}

function cryptoRandomId(): string {
  try {
    // No need for strong crypto here, just uniqueness
    return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  } catch {
    return "id_" + Date.now().toString(36);
  }
}
