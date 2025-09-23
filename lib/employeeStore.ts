// C:\Users\adamm\Projects\wageflow01\lib\employeeStore.ts

const KEY = 'wageflow.employees.v1';
// Likely historic keys from earlier builds. We’ll scan and migrate once.
const LEGACY_KEYS = [
  'wageflow.employees',
  'employees',
  'wf_employees',
  'employee_list',
  'wageflow.employees.v0',
];

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  ni: string;
  payGroup:
    | 'weekly_hourly'
    | 'monthly_salaried'
    | 'fortnightly'
    | 'fourweekly'
    | 'monthly_hourly';
  hourlyRate?: number | null;
  annualSalary?: number | null;
  weeklyHours?: number | null;
  createdAt: number;
  updatedAt: number;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function normaliseEmployee(input: any): Employee | null {
  if (!input) return null;
  const id = String(input.id ?? '').trim();
  if (!id) return null;

  const firstName = String(input.firstName ?? '').trim();
  const lastName = String(input.lastName ?? '').trim();
  const ni = String(input.ni ?? input.nino ?? '')
    .toUpperCase()
    .replace(/\s+/g, '');

  const payGroup = (input.payGroup ?? input.pay_group ?? 'monthly_salaried') as Employee['payGroup'];

  const weeklyHours =
    input.weeklyHours != null
      ? Number(input.weeklyHours)
      : input.weekly_hours != null
      ? Number(input.weekly_hours)
      : null;

  let annualSalary =
    input.annualSalary != null
      ? Number(input.annualSalary)
      : input.annual_salary != null
      ? Number(input.annual_salary)
      : null;

  let hourlyRate =
    input.hourlyRate != null
      ? Number(input.hourlyRate)
      : input.hourly_rate != null
      ? Number(input.hourly_rate)
      : null;

  if (payGroup === 'monthly_salaried' && annualSalary && weeklyHours && !hourlyRate) {
    const yearlyHours = weeklyHours * 52.1429;
    hourlyRate = Number((annualSalary / yearlyHours).toFixed(2));
  }

  const now = Date.now();
  const createdAt = Number(input.createdAt ?? now);
  const updatedAt = now;

  return {
    id,
    firstName,
    lastName,
    ni,
    payGroup,
    hourlyRate: hourlyRate ?? null,
    annualSalary: annualSalary ?? null,
    weeklyHours: weeklyHours ?? null,
    createdAt,
    updatedAt,
  };
}

function dedupe(list: Employee[]): Employee[] {
  const map = new Map<string, Employee>();
  for (const e of list) {
    if (!map.has(e.id)) map.set(e.id, e);
  }
  return Array.from(map.values());
}

function safeWrite(list: Employee[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
  } catch {
    // ignore quota/privacy errors
  }
}

function tryParseArray(raw: string | null): any[] | null {
  if (!raw) return null;
  try {
    const val = JSON.parse(raw);
    return Array.isArray(val) ? val : null;
  } catch {
    return null;
  }
}

function migrateLegacyIfNeeded(): Employee[] {
  if (!isBrowser()) return [];
  // If we already have data under the canonical key, use it.
  const current = tryParseArray(window.localStorage.getItem(KEY));
  if (current && current.length) {
    return current.map(normaliseEmployee).filter((e): e is Employee => !!e);
  }

  // Aggregate from any legacy keys that look like arrays.
  const collected: Employee[] = [];
  for (const k of LEGACY_KEYS) {
    const arr = tryParseArray(window.localStorage.getItem(k));
    if (arr && arr.length) {
      for (const item of arr) {
        const e = normaliseEmployee(item);
        if (e) collected.push(e);
      }
    }
  }

  const merged = dedupe(collected);
  if (merged.length) {
    // Write to the canonical key and clear legacy keys.
    safeWrite(merged);
    try {
      for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
  return merged;
}

function safeRead(): Employee[] {
  if (!isBrowser()) return [];
  try {
    // Read canonical, or migrate if empty.
    const migrated = migrateLegacyIfNeeded();
    const list = migrated.length
      ? migrated
      : (() => {
          const raw = window.localStorage.getItem(KEY);
          const arr = tryParseArray(raw) ?? [];
          return arr.map(normaliseEmployee).filter((e): e is Employee => !!e);
        })();
    return list;
  } catch {
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
    return [];
  }
}

// Public API

export function getEmployees(): Employee[] {
  return safeRead();
}

export function getEmployeeById(id: string): Employee | null {
  return getEmployees().find(e => e.id === id) ?? null;
}

export function setEmployees(list: Employee[]): void {
  const normalised = list.map(normaliseEmployee).filter((e): e is Employee => !!e);
  safeWrite(normalised);
}

export function addEmployee(e: Employee): void {
  const list = getEmployees();
  const exists = list.some(x => x.id === e.id);
  const toSave = exists
    ? list.map(x => (x.id === e.id ? { ...x, ...normaliseEmployee(e)! } : x))
    : [...list, normaliseEmployee(e)!];
  setEmployees(toSave);
}

export function updateEmployee(id: string, patch: Partial<Employee>): void {
  const list = getEmployees();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return;
  const updated = normaliseEmployee({ ...list[idx], ...patch, id })!;
  list[idx] = updated;
  setEmployees(list);
}

export function deleteEmployee(id: string): void {
  const next = getEmployees().filter(e => e.id !== id);
  setEmployees(next);
}

export function countEmployees(): number {
  return getEmployees().length;
}

export function subscribe(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === KEY) listener();
  };
  const onVisible = () => listener();

  window.addEventListener('storage', onStorage);
  window.addEventListener('visibilitychange', onVisible);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('visibilitychange', onVisible);
  };
}
