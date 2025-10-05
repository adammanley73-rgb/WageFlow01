// Ambient module declarations to satisfy TypeScript when using "@/..." path aliases
// and dynamic imports for client-only calculators. This keeps the editor from
// whining while the runtime loads the real modules.

// Core alias pattern used across the app
declare module "@/*";

// Specific calculators used by Absence pages
declare module "@/lib/ssp";
declare module "@/lib/sap";
declare module "@/lib/spp";
declare module "@/lib/shpp";
declare module "@/lib/spbp";

// Store namespace and utils
declare module "@/lib/storeVersion";

// Components resolved via alias
declare module "@/components/employees/EmployeePicker";

// If you use JSON imports anywhere under the alias,
// this makes TS treat them as 'any' without extra config.
declare module "*.json" {
  const value: any;
  export default value;
}
