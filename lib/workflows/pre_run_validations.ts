/* C:\Users\adamm\Projects\wageflow\lib\workflows\pre_run_validations.ts
   WageFlow — Pre-run validation engine (Step 1 skeleton)
   Self-contained module: no external imports required.
   Provides:
     - ValidationRule, ValidationIssue types
     - Baseline rules (BANK_MISSING, NI_INVALID, EMP_INACTIVE, PAYE_DUPLICATE)
     - runPreRunValidations(employees) -> issues array + indexes
*/

export type Severity = "error" | "warning" | "info";

export interface EmployeeRecord {
  // Minimal fields needed for validations. Extend later once DB is wired.
  employee_id: string;          // stable ID (uuid string)
  full_name?: string | null;

  // Status
  is_active: boolean;           // active for payroll

  // HMRC identifiers
  paye_reference?: string | null; // employer-level ref normally, but we also detect duplicates provided at employee level if present
  ni_number?: string | null;      // National Insurance number

  // Pay routing
  bank_account_number?: string | null; // expect 8 digits (can arrive spaced)
  bank_sort_code?: string | null;      // expect 6 digits (can arrive with dashes)

  // Company scope
  company_id: string;
}

export interface ValidationIssue {
  id: string;                   // unique for client display
  rule: string;                 // machine code, e.g. "BANK_MISSING"
  message: string;              // short readable summary
  severity: Severity;
  employee_id?: string;         // which employee triggered it (if applicable)
  company_id?: string;
  pointers?: Record<string, string>; // field hints like { field: "bank_account_number" }
  meta?: Record<string, unknown>;
  ts: string;                   // ISO timestamp
}

export interface ValidationRuleContext {
  nowISO: string;
}

export interface ValidationRule {
  code: string; // stable identifier
  description: string;
  severity: Severity;
  applies(employees: EmployeeRecord[], ctx: ValidationRuleContext): boolean;
  evaluate(employees: EmployeeRecord[], ctx: ValidationRuleContext): ValidationIssue[];
}

/* ------------------------
   Utility helpers
------------------------- */

function normalizeDigits(input?: string | null): string {
  if (!input) return "";
  return (input.match(/\d/g) || []).join("");
}

function isLikelyValidNIN(ni?: string | null): boolean {
  if (!ni) return false;
  const cleaned = ni.toUpperCase().replace(/\s/g, "");
  // Basic NI format: two letters, six digits, optional final letter A-D (or none). Exclude invalid prefixes.
  // This is pragmatic, not gospel. HMRC has edge cases; refine later.
  const invalidPrefixes = /^(BG|GB|KN|NK|NT|TN|ZZ)/;
  if (invalidPrefixes.test(cleaned)) return false;
  const re = /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]?$/;
  return re.test(cleaned);
}

function uniqId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------
   Baseline rules
------------------------- */

const RULE_BANK_MISSING: ValidationRule = {
  code: "BANK_MISSING",
  description: "Employee is missing bank details required for payment.",
  severity: "error",
  applies: () => true,
  evaluate: (employees, ctx) => {
    const issues: ValidationIssue[] = [];
    for (const e of employees) {
      const sort = normalizeDigits(e.bank_sort_code || "");
      const acct = normalizeDigits(e.bank_account_number || "");
      const sortValid = sort.length === 6;
      const acctValid = acct.length === 8;

      if (!sortValid || !acctValid) {
        issues.push({
          id: uniqId("BANK"),
          rule: "BANK_MISSING",
          message: !sortValid && !acctValid
            ? "Missing or invalid sort code and account number."
            : !sortValid
              ? "Missing or invalid sort code."
              : "Missing or invalid account number.",
          severity: "error",
          employee_id: e.employee_id,
          company_id: e.company_id,
          pointers: {
            field: !sortValid && !acctValid ? "bank_sort_code, bank_account_number"
                  : !sortValid ? "bank_sort_code" : "bank_account_number"
          },
          meta: { sort, acct },
          ts: ctx.nowISO,
        });
      }
    }
    return issues;
  },
};

const RULE_NI_INVALID: ValidationRule = {
  code: "NI_INVALID",
  description: "Employee National Insurance number is missing or invalid format.",
  severity: "error",
  applies: () => true,
  evaluate: (employees, ctx) => {
    const issues: ValidationIssue[] = [];
    for (const e of employees) {
      if (!isLikelyValidNIN(e.ni_number)) {
        issues.push({
          id: uniqId("NI"),
          rule: "NI_INVALID",
          message: "NI number missing or invalid format.",
          severity: "error",
          employee_id: e.employee_id,
          company_id: e.company_id,
          pointers: { field: "ni_number" },
          meta: { ni_number: e.ni_number ?? null },
          ts: ctx.nowISO,
        });
      }
    }
    return issues;
  },
};

const RULE_EMP_INACTIVE: ValidationRule = {
  code: "EMP_INACTIVE",
  description: "Employee marked inactive but included in run.",
  severity: "warning",
  applies: () => true,
  evaluate: (employees, ctx) => {
    const issues: ValidationIssue[] = [];
    for (const e of employees) {
      if (!e.is_active) {
        issues.push({
          id: uniqId("INACTIVE"),
          rule: "EMP_INACTIVE",
          message: "Employee is inactive and should be excluded or reactivated.",
          severity: "warning",
          employee_id: e.employee_id,
          company_id: e.company_id,
          pointers: { field: "is_active" },
          ts: ctx.nowISO,
        });
      }
    }
    return issues;
  },
};

const RULE_PAYE_DUPLICATE: ValidationRule = {
  code: "PAYE_DUPLICATE",
  description: "Potential duplicate PAYE reference detected within batch.",
  severity: "warning",
  applies: () => true,
  evaluate: (employees, ctx) => {
    const issues: ValidationIssue[] = [];
    const seen: Record<string, string[]> = {};
    for (const e of employees) {
      const ref = (e.paye_reference || "").trim();
      if (!ref) continue;
      if (!seen[ref]) seen[ref] = [];
      seen[ref].push(e.employee_id);
    }
    for (const [ref, ids] of Object.entries(seen)) {
      if (ids.length > 1) {
        for (const empId of ids) {
          const emp = employees.find(x => x.employee_id === empId);
          issues.push({
            id: uniqId("PAYE_DUP"),
            rule: "PAYE_DUPLICATE",
            message: `PAYE reference "${ref}" appears multiple times in this batch.`,
            severity: "warning",
            employee_id: empId,
            company_id: emp?.company_id,
            pointers: { field: "paye_reference" },
            meta: { duplicate_count: ids.length },
            ts: ctx.nowISO,
          });
        }
      }
    }
    return issues;
  },
};

/* ------------------------
   Registry and runner
------------------------- */

const RULES: ValidationRule[] = [
  RULE_BANK_MISSING,
  RULE_NI_INVALID,
  RULE_EMP_INACTIVE,
  RULE_PAYE_DUPLICATE,
];

export interface RunOptions {
  enabledRules?: string[]; // whitelist by rule code
}

export interface RunResult {
  issues: ValidationIssue[];
  byEmployee: Record<string, ValidationIssue[]>;
  byRule: Record<string, ValidationIssue[]>;
}

export function runPreRunValidations(
  employees: EmployeeRecord[],
  opts: RunOptions = {}
): RunResult {
  const ctx: ValidationRuleContext = { nowISO: new Date().toISOString() };
  const activeRules = opts.enabledRules && opts.enabledRules.length
    ? RULES.filter(r => opts.enabledRules?.includes(r.code))
    : RULES;

  const issues: ValidationIssue[] = [];
  for (const rule of activeRules) {
    if (!rule.applies(employees, ctx)) continue;
    const out = rule.evaluate(employees, ctx);
    if (Array.isArray(out) && out.length) issues.push(...out);
  }

  const byEmployee: Record<string, ValidationIssue[]> = {};
  const byRule: Record<string, ValidationIssue[]> = {};

  for (const issue of issues) {
    if (issue.employee_id) {
      if (!byEmployee[issue.employee_id]) byEmployee[issue.employee_id] = [];
      byEmployee[issue.employee_id].push(issue);
    }
    if (!byRule[issue.rule]) byRule[issue.rule] = [];
    byRule[issue.rule].push(issue);
  }

  return { issues, byEmployee, byRule };
}

/* ------------------------
   Example usage (keep commented)
------------------------- */
/*
const sample: EmployeeRecord[] = [
  {
    employee_id: "e1",
    full_name: "Jane Smith",
    is_active: true,
    paye_reference: "123/AB456",
    ni_number: "QQ123456C",
    bank_account_number: "1234567", // invalid
    bank_sort_code: "12-34-5",      // invalid
    company_id: "c1",
  },
  {
    employee_id: "e2",
    full_name: "John Doe",
    is_active: false,
    paye_reference: "123/AB456",    // duplicate
    ni_number: "AA123456C",
    bank_account_number: "12345678",
    bank_sort_code: "12-34-56",
    company_id: "c1",
  },
];

const result = runPreRunValidations(sample);
console.log(result);
*/
