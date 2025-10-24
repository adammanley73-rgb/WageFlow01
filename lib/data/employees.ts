// lib/data/employees.ts
// Proxy exports that point at the server-only implementation under app/_server.

export type {
  EmployeeRow,
  EmployeeListItem,
  EmployeePickerOption,
} from "./employees.types";

export {
  listEmployeesSSR,
  listEmployeePickerOptions,
  getEmployeeById,
} from "@/app/_server/employees";
