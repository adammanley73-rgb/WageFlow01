/* C:\Projects\wageflow01\app\dashboard\employees\import\page.tsx */
"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

type ParsedRow = Record<string, string>;

type ValidationResult = {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  normalized: ParsedRow;
};

type ImportResultRow = {
  rowNumber: number;
  employee_id?: string | null;
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

const TEMPLATE_COLUMNS = [
  "employee_number",
  "first_name",
  "last_name",
  "email",
  "phone",
  "job_title",
  "start_date",
  "hire_date",
  "date_of_birth",
  "employment_type",
  "annual_salary",
  "hourly_rate",
  "hours_per_week",
  "ni_number",
  "pay_frequency",
  "p45_provided",
  "starter_declaration",
  "student_loan_plan",
  "postgraduate_loan",
  "address_line_1",
  "address_line_2",
  "city",
  "county",
  "postcode",
  "country",
] as const;

const REQUIRED_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "start_date",
  "p45_provided",
] as const;

const PAY_FREQUENCIES = ["weekly", "fortnightly", "four_weekly", "monthly"] as const;
const STARTER_DECLARATIONS = ["A", "B", "C"] as const;
const STUDENT_LOAN_PLANS = ["none", "plan1", "plan2", "plan4", "plan5"] as const;

const TEMPLATE_SAMPLE_ROWS = [
  [
    "E001",
    "Jane",
    "Doe",
    "jane.doe@example.com",
    "07123456789",
    "Engineer",
    "01-04-2026",
    "01-04-2026",
    "15-01-1990",
    "full_time",
    "42000",
    "",
    "37.5",
    "AB123456C",
    "monthly",
    "false",
    "A",
    "none",
    "false",
    "1 High Street",
    "",
    "Liverpool",
    "Merseyside",
    "L1 1AA",
    "UK",
  ],
  [
    "E002",
    "John",
    "Smith",
    "john.smith@example.com",
    "",
    "Warehouse Operative",
    "08-04-2026",
    "08-04-2026",
    "21-06-1988",
    "full_time",
    "",
    "13.50",
    "40",
    "CD123456E",
    "weekly",
    "true",
    "",
    "",
    "",
    "2 King Street",
    "",
    "Liverpool",
    "Merseyside",
    "L2 2BB",
    "UK",
  ],
] as const;

function normalizeHeader(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, "_");
}

function cleanCell(value: string): string {
  return String(value ?? "").trim();
}

function isUkDateOnly(value: string): boolean {
  return /^\d{2}-\d{2}-\d{4}$/.test(String(value || "").trim());
}

function ukDateToIso(value: string): string {
  const s = String(value || "").trim();
  if (!isUkDateOnly(s)) return s;
  const [dd, mm, yyyy] = s.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function isValidNi(value: string): boolean {
  return /^[A-Z]{2}\d{6}[A-Z]$/.test(String(value || "").trim().toUpperCase());
}

function toCanonicalBoolean(value: string): "true" | "false" | "" {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return "";
  if (["true", "yes", "y", "1"].includes(s)) return "true";
  if (["false", "no", "n", "0"].includes(s)) return "false";
  return "";
}

function toCanonicalPayFrequency(value: string): string {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (s === "weekly") return "weekly";
  if (s === "fortnightly") return "fortnightly";
  if (s === "four_weekly" || s === "4_weekly" || s === "fourweekly" || s === "4weekly") return "four_weekly";
  if (s === "monthly") return "monthly";

  return s;
}

function toCanonicalStudentLoanPlan(value: string): string {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");

  if (!s) return "";
  if (s === "none") return "none";
  if (s === "plan1" || s === "1") return "plan1";
  if (s === "plan2" || s === "2") return "plan2";
  if (s === "plan4" || s === "4") return "plan4";
  if (s === "plan5" || s === "5") return "plan5";

  return String(value || "").trim().toLowerCase();
}

function toCanonicalStarterDeclaration(value: string): string {
  const s = String(value || "").trim().toUpperCase();
  if (!s) return "";
  if (STARTER_DECLARATIONS.includes(s as (typeof STARTER_DECLARATIONS)[number])) return s;
  return s;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const src = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = false;
        continue;
      }

      cell += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  rows.push(row);

  return rows
    .map((r) => r.map((c) => String(c ?? "")))
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
}

function buildTemplateCsv(): string {
  const lines: string[] = [];
  lines.push(TEMPLATE_COLUMNS.join(","));
  for (const row of TEMPLATE_SAMPLE_ROWS) {
    lines.push(row.join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

function downloadTemplate() {
  const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wageflow_bulk_new_starters_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function normaliseRow(rawRow: ParsedRow): ParsedRow {
  const out: ParsedRow = {};

  for (const key of TEMPLATE_COLUMNS) {
    out[key] = cleanCell(rawRow[key] || "");
  }

  out.employee_number = out.employee_number;
  out.first_name = out.first_name;
  out.last_name = out.last_name;
  out.email = out.email.toLowerCase();
  out.phone = out.phone;
  out.job_title = out.job_title;
  out.start_date = out.start_date;
  out.hire_date = out.hire_date;
  out.date_of_birth = out.date_of_birth;
  out.employment_type = out.employment_type;
  out.annual_salary = out.annual_salary;
  out.hourly_rate = out.hourly_rate;
  out.hours_per_week = out.hours_per_week;
  out.ni_number = out.ni_number.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
  out.pay_frequency = toCanonicalPayFrequency(out.pay_frequency);
  out.p45_provided = toCanonicalBoolean(out.p45_provided);
  out.starter_declaration = toCanonicalStarterDeclaration(out.starter_declaration);
  out.student_loan_plan = toCanonicalStudentLoanPlan(out.student_loan_plan);
  out.postgraduate_loan = toCanonicalBoolean(out.postgraduate_loan);
  out.address_line_1 = out.address_line_1;
  out.address_line_2 = out.address_line_2;
  out.city = out.city;
  out.county = out.county;
  out.postcode = out.postcode;
  out.country = out.country;

  return out;
}

function validateRow(rawRow: ParsedRow, rowNumber: number): ValidationResult {
  const normalized = normaliseRow(rawRow);
  const errors: string[] = [];

  for (const key of REQUIRED_COLUMNS) {
    if (!normalized[key]) {
      errors.push(`${key} is required.`);
    }
  }

  if (normalized.start_date && !isUkDateOnly(normalized.start_date)) {
    errors.push("start_date must be DD-MM-YYYY.");
  }

  if (normalized.hire_date && !isUkDateOnly(normalized.hire_date)) {
    errors.push("hire_date must be DD-MM-YYYY when provided.");
  }

  if (normalized.date_of_birth && !isUkDateOnly(normalized.date_of_birth)) {
    errors.push("date_of_birth must be DD-MM-YYYY when provided.");
  }

  if (normalized.pay_frequency && !PAY_FREQUENCIES.includes(normalized.pay_frequency as (typeof PAY_FREQUENCIES)[number])) {
    errors.push("pay_frequency must be weekly, fortnightly, four_weekly, or monthly.");
  }

  if (normalized.p45_provided === "") {
    errors.push("p45_provided must be true or false.");
  }

  if (normalized.ni_number && !isValidNi(normalized.ni_number)) {
    errors.push("ni_number must be a valid NI number, for example AB123456C.");
  }

  if (normalized.annual_salary && !Number.isFinite(Number(normalized.annual_salary))) {
    errors.push("annual_salary must be numeric when provided.");
  }

  if (normalized.hourly_rate && !Number.isFinite(Number(normalized.hourly_rate))) {
    errors.push("hourly_rate must be numeric when provided.");
  }

  if (normalized.hours_per_week && !Number.isFinite(Number(normalized.hours_per_week))) {
    errors.push("hours_per_week must be numeric when provided.");
  }

  const p45NotProvided = normalized.p45_provided === "false";

  if (p45NotProvided) {
    if (!normalized.starter_declaration) {
      errors.push("starter_declaration is required when p45_provided is false.");
    } else if (
      !STARTER_DECLARATIONS.includes(normalized.starter_declaration as (typeof STARTER_DECLARATIONS)[number])
    ) {
      errors.push("starter_declaration must be A, B, or C when p45_provided is false.");
    }

    if (!normalized.student_loan_plan) {
      errors.push("student_loan_plan is required when p45_provided is false.");
    } else if (
      !STUDENT_LOAN_PLANS.includes(normalized.student_loan_plan as (typeof STUDENT_LOAN_PLANS)[number])
    ) {
      errors.push("student_loan_plan must be none, plan1, plan2, plan4, or plan5 when p45_provided is false.");
    }

    if (normalized.postgraduate_loan === "") {
      errors.push("postgraduate_loan is required when p45_provided is false.");
    }
  }

  return {
    rowNumber,
    isValid: errors.length === 0,
    errors,
    normalized,
  };
}

function rowsFromCsvText(text: string): {
  headers: string[];
  rawRows: ParsedRow[];
  validation: ValidationResult[];
  missingColumns: string[];
  unknownColumns: string[];
} {
  const parsed = parseCsv(text);

  if (parsed.length === 0) {
    return {
      headers: [],
      rawRows: [],
      validation: [],
      missingColumns: [...REQUIRED_COLUMNS],
      unknownColumns: [],
    };
  }

  const headers = parsed[0].map(normalizeHeader);
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  const unknownColumns = headers.filter((col) => !TEMPLATE_COLUMNS.includes(col as (typeof TEMPLATE_COLUMNS)[number]));

  const dataRows = parsed.slice(1);
  const rawRows: ParsedRow[] = dataRows.map((cells) => {
    const row: ParsedRow = {};
    headers.forEach((header, index) => {
      row[header] = cleanCell(cells[index] || "");
    });
    return row;
  });

  const validation = rawRows.map((row, idx) => validateRow(row, idx + 2));

  return {
    headers,
    rawRows,
    validation,
    missingColumns,
    unknownColumns,
  };
}

function buildApiRows(validation: ValidationResult[]) {
  return validation.map((result) => ({
    ...result.normalized,
    start_date: result.normalized.start_date ? ukDateToIso(result.normalized.start_date) : "",
    hire_date: result.normalized.hire_date ? ukDateToIso(result.normalized.hire_date) : "",
    date_of_birth: result.normalized.date_of_birth ? ukDateToIso(result.normalized.date_of_birth) : "",
  }));
}

export default function EmployeesImportPage() {
  const [fileName, setFileName] = useState<string>("");
  const [rawCsv, setRawCsv] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string>("");
  const [importSuccess, setImportSuccess] = useState<string>("");
  const [importResults, setImportResults] = useState<ImportResultRow[]>([]);

  const parsed = useMemo(() => {
    if (!rawCsv) {
      return {
        headers: [] as string[],
        rawRows: [] as ParsedRow[],
        validation: [] as ValidationResult[],
        missingColumns: [] as string[],
        unknownColumns: [] as string[],
      };
    }
    return rowsFromCsvText(rawCsv);
  }, [rawCsv]);

  const validCount = parsed.validation.filter((x) => x.isValid).length;
  const invalidCount = parsed.validation.filter((x) => !x.isValid).length;

  const canImport =
    !isReading &&
    !isImporting &&
    parsed.rawRows.length > 0 &&
    parsed.missingColumns.length === 0 &&
    invalidCount === 0;

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setLoadError("");
    setRawCsv("");
    setFileName("");
    setImportError("");
    setImportSuccess("");
    setImportResults([]);

    if (!file) return;

    try {
      setIsReading(true);
      const text = await file.text();
      setRawCsv(text);
      setFileName(file.name);
    } catch (error: any) {
      setLoadError(error?.message || "Failed to read CSV file.");
    } finally {
      setIsReading(false);
    }
  }

  async function importRows() {
    if (!canImport) return;

    try {
      setIsImporting(true);
      setImportError("");
      setImportSuccess("");
      setImportResults([]);

      const response = await fetch("/api/employees/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: buildApiRows(parsed.validation),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationErrors = Array.isArray(payload?.validation)
          ? payload.validation
              .map((item: any) => {
                const rowNumber = item?.rowNumber ?? "?";
                const errors = Array.isArray(item?.errors) ? item.errors.join(" | ") : "";
                return `Row ${rowNumber}: ${errors}`;
              })
              .join("\n")
          : "";

        throw new Error(
          validationErrors ||
            payload?.error ||
            payload?.message ||
            "Import failed."
        );
      }

      const results = Array.isArray(payload?.results) ? payload.results : [];
      const importedCount = Number(payload?.importedCount ?? results.length ?? 0);

      setImportResults(results);
      setImportSuccess(`${importedCount} employee row(s) imported successfully.`);
    } catch (error: any) {
      setImportError(error?.message || "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-t-xl border-b border-neutral-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-blue-700">Bulk New Starters Import (CSV)</h1>
              <p className="mt-1 text-sm text-neutral-700">
                Download the template, upload your CSV, validate it, then import the rows.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/employees"
                className="inline-flex items-center rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white"
              >
                Back to Employees
              </Link>

              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white"
              >
                Download CSV Template
              </button>
            </div>
          </div>
        </div>

        <main className="w-full">
          <section className="rounded-b-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 p-4">
                <h2 className="text-sm font-semibold text-neutral-900">Required columns</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {REQUIRED_COLUMNS.map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    >
                      {col}
                    </span>
                  ))}
                </div>

                <h3 className="mt-4 text-sm font-semibold text-neutral-900">Full template columns</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TEMPLATE_COLUMNS.map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 p-4">
                <h2 className="text-sm font-semibold text-neutral-900">Rules</h2>
                <div className="mt-2 space-y-2 text-sm text-neutral-700">
                  <p>Required: first_name, last_name, email, start_date, p45_provided.</p>
                  <p>Dates in the CSV must be DD-MM-YYYY.</p>
                  <p>pay_frequency must be weekly, fortnightly, four_weekly, or monthly.</p>
                  <p>NI is checked when provided.</p>
                  <p>If p45_provided is false, starter_declaration, student_loan_plan, and postgraduate_loan are required.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">Upload CSV</h2>
                  <p className="mt-1 text-sm text-neutral-700">
                    Upload your file, review the validation results, then import the valid rows.
                  </p>
                </div>

                <div className="text-sm text-neutral-600">
                  {fileName ? `Loaded: ${fileName}` : "No file loaded yet"}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onFileChange}
                  className="block w-full text-sm text-neutral-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                />

                <button
                  type="button"
                  onClick={importRows}
                  disabled={!canImport}
                  className="inline-flex items-center rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  title={!canImport ? "Fix validation errors first." : "Import all validated rows."}
                >
                  {isImporting ? "Importing..." : "Import Rows"}
                </button>
              </div>

              {isReading ? (
                <p className="mt-3 text-sm font-medium text-blue-700">Reading CSV...</p>
              ) : null}

              {loadError ? (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {loadError}
                </div>
              ) : null}

              {importError ? (
                <div className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {importError}
                </div>
              ) : null}

              {importSuccess ? (
                <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {importSuccess}
                </div>
              ) : null}
            </div>

            {rawCsv ? (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Rows found</div>
                    <div className="mt-2 text-2xl font-semibold text-neutral-900">{parsed.rawRows.length}</div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Valid rows</div>
                    <div className="mt-2 text-2xl font-semibold text-green-700">{validCount}</div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Invalid rows</div>
                    <div className="mt-2 text-2xl font-semibold text-red-700">{invalidCount}</div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Detected columns</div>
                    <div className="mt-2 text-sm font-semibold text-neutral-900">{parsed.headers.length}</div>
                  </div>
                </div>

                {parsed.missingColumns.length > 0 ? (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Missing required columns: {parsed.missingColumns.join(", ")}
                  </div>
                ) : null}

                {parsed.unknownColumns.length > 0 ? (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Unknown columns found: {parsed.unknownColumns.join(", ")}
                  </div>
                ) : null}

                <div className="mt-6 rounded-lg border border-neutral-200 p-4">
                  <h2 className="text-sm font-semibold text-neutral-900">Validation results</h2>

                  {parsed.validation.length === 0 ? (
                    <p className="mt-3 text-sm text-neutral-700">No data rows found.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {parsed.validation.slice(0, 50).map((result) => (
                        <div
                          key={result.rowNumber}
                          className={`rounded-lg border p-4 ${
                            result.isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                          }`}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm font-semibold text-neutral-900">
                              CSV row {result.rowNumber}
                              {result.normalized.first_name || result.normalized.last_name
                                ? ` - ${result.normalized.first_name} ${result.normalized.last_name}`.trim()
                                : ""}
                            </div>

                            <span
                              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                result.isValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                            >
                              {result.isValid ? "Valid" : "Invalid"}
                            </span>
                          </div>

                          {!result.isValid ? (
                            <ul className="mt-3 space-y-1 text-sm text-red-700">
                              {result.errors.map((error, index) => (
                                <li key={`${result.rowNumber}-${index}`}>• {error}</li>
                              ))}
                            </ul>
                          ) : null}

                          <div className="mt-3 overflow-x-auto rounded-md bg-white p-3">
                            <pre className="text-xs text-neutral-700">
                              {JSON.stringify(result.normalized, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}

                      {parsed.validation.length > 50 ? (
                        <div className="text-sm text-neutral-600">
                          Showing first 50 rows only. Total rows loaded: {parsed.validation.length}.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {importResults.length > 0 ? (
              <div className="mt-6 rounded-lg border border-neutral-200 p-4">
                <h2 className="text-sm font-semibold text-neutral-900">Imported rows</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-neutral-100">
                        <th className="border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-700">CSV Row</th>
                        <th className="border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-700">Employee ID</th>
                        <th className="border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-700">Name</th>
                        <th className="border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-700">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResults.map((row) => (
                        <tr key={`${row.rowNumber}-${row.employee_id}-${row.id}`} className="bg-white">
                          <td className="border border-neutral-200 px-3 py-2 text-sm text-neutral-800">{row.rowNumber}</td>
                          <td className="border border-neutral-200 px-3 py-2 text-sm text-neutral-800">{row.employee_id || "—"}</td>
                          <td className="border border-neutral-200 px-3 py-2 text-sm text-neutral-800">
                            {`${row.first_name || ""} ${row.last_name || ""}`.trim() || "—"}
                          </td>
                          <td className="border border-neutral-200 px-3 py-2 text-sm text-neutral-800">{row.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
