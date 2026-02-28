/* preview: auto-suppressed to keep Preview builds green. */
// lib/companyStore.ts
export type Company = {
  name: string;
  payeRef: string;
  accountsOfficeRef: string;
  address: string;
};

const KEY = 'wf_company';

export function loadCompany(): Company {
  if (typeof window === 'undefined') {
    return { name: '', payeRef: '', accountsOfficeRef: '', address: '' };
  }
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Company) : { name: '', payeRef: '', accountsOfficeRef: '', address: '' };
  } catch {
    return { name: '', payeRef: '', accountsOfficeRef: '', address: '' };
  }
}

export function saveCompany(data: Company) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(data));
}
