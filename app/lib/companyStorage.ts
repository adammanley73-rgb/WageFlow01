'use client';

export type Company = {
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  postcode?: string;
  country?: string;
  payeRef?: string;              // 3 digits / reference
  accountsOfficeRef?: string;    // 13 char AAnnnnnnAAAAA
  phone?: string;
  email?: string;
  defaultPayday?: string;        // e.g. "25th of month"
  taxYearStart?: string;         // "06-04-2025"
  taxYearEnd?: string;           // "05-04-2026"
  aeProvider?: string;           // e.g. "NEST"
};

const KEY = 'wf_company';

// Demo-safe defaults used if nothing saved yet
const DEFAULT_COMPANY: Company = {
  name: 'Demo Company Ltd',
  address1: '1 Market Street',
  city: 'Manchester',
  postcode: 'M1 1AA',
  country: 'United Kingdom',
  payeRef: '123/AB456',
  accountsOfficeRef: '123PA00012345',
  phone: '0161 000 0000',
  email: 'payroll@demo.co.uk',
  defaultPayday: '25th of month',
  taxYearStart: '06-04-2025',
  taxYearEnd: '05-04-2026',
  aeProvider: 'NEST',
};

type Listener = (c: Company) => void;
const listeners = new Set<Listener>();

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getCompany(): Company {
  if (!isBrowser()) return DEFAULT_COMPANY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_COMPANY;
    const parsed = JSON.parse(raw) as Partial<Company>;
    return { ...DEFAULT_COMPANY, ...parsed };
  } catch {
    return DEFAULT_COMPANY;
  }
}

export function setCompany(patch: Partial<Company>) {
  if (!isBrowser()) return;
  const merged = { ...getCompany(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(merged));
  // Notify in-tab subscribers
  listeners.forEach((fn) => fn(merged));
}

// Subscribe to in-tab updates and cross-tab changes
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);

  function onStorage(e: StorageEvent) {
    if (e.key === KEY) {
      try {
        const next = e.newValue ? (JSON.parse(e.newValue) as Company) : getCompany();
        fn({ ...DEFAULT_COMPANY, ...next });
      } catch {
        fn(getCompany());
      }
    }
  }

  if (isBrowser()) window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    if (isBrowser()) window.removeEventListener('storage', onStorage);
  };
}
