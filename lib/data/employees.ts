// lib/data/employees.ts
// Thin dynamic proxy so app routes can `import { listEmployeesSSR } from "@/lib/data/employees"`
// without statically pulling server-only imports into places that might be seen by /pages.
// Do NOT import next/headers here.

export type {
  EmployeeRow,
  EmployeeListItem,
  EmployeePickerOption,
} from "./employees.server";

// Dynamic forwarders
export async function listEmployeesSSR(limit?: number) {
  const m = await import("./employees.server");
  return m.listEmployeesSSR(limit);
}

export async function listEmployeePickerOptions(limit?: number) {
  const m = await import("./employees.server");
  return m.listEmployeePickerOptions(limit);
}

export async function getEmployeeById(id: string) {
  const m = await import("./employees.server");
  return m.getEmployeeById(id);
}
