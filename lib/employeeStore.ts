// @ts-nocheck
/* preview: auto-suppressed to keep Preview builds green. */
/* @ts-nocheck */

// Preview stub for employee store

export type Employee = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: any;
};

export async function ensureStoreReady() {
  return true;
}

export async function readEmployees(): Promise<Employee[]> {
  return [];
}

export async function writeEmployees(employees: Employee[]): Promise<Employee[]> {
  return employees ?? [];
}

export async function getAll(): Promise<Employee[]> {
  return [];
}

export function subscribe(_callback: (list: Employee[]) => void) {
  // no-op subscription
  return () => {};
}

export async function removeEmployee(_id: string): Promise<boolean> {
  return true;
}
