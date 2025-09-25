/* @ts-nocheck */

// Preview stub for employee store

export async function ensureStoreReady() { return true; }
export async function readEmployees() { return []; }
export async function writeEmployees(employees: any[]) { return employees ?? []; }

export async function getAll() { return []; }
export function subscribe(_callback: any) { return () => {}; }
export async function removeEmployee(_id: string) { return true; }
