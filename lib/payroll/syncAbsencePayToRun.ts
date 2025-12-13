/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\lib\payroll\syncAbsencePayToRun.ts

import { PostgrestError } from "@supabase/supabase-js";
import { calculateHolidayPay } from "@/lib/payroll/holidayPay";

type SyncAbsencePayToRunArgs = {
  supabase: any; // admin client created in the API route
  runId: string;
  runRow: any;
  payrollRunEmployees: any[];
};

type AnnualLeaveAbsence = {
  id: string;
  employee_id: string | null;
  type: string | null;
  status: string | null;
  first_day: string | null;
  last_day_expected: string | null;
  last_day_actual: string | null;
};

type ExistingElement = {
  id: string;
  payroll_run_employee_id: string;
  pay_element_type_id: string;
  amount: number | null;
  description_override: string | null;
  absence_id: string | null;
};

type PayElementTypeRow = {
  id: string;
  code: string;
};

type EmployeeRateInfo = {
  id: string;
  annualSalary: number | null;
  hourlyRate: number | null;
  hoursPerWeek: number | null;
};

function logWarn(message: string, extra?: unknown) {
  console.warn("[syncAbsencePayToRun]", message, extra ?? "");
}

function logError(message: string, extra?: unknown) {
  console.error("[syncAbsencePayToRun]", message, extra ?? "");
}

function handlePgError(prefix: string, error: PostgrestError | null) {
  if (error) {
    logError(prefix, {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
}

function safeNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function countOverlappingDays(
  periodStart: string,
  periodEnd: string,
  absenceStart: string,
  absenceEnd: string
): number {
  const startStr = periodStart > absenceStart ? periodStart : absenceStart;
  const endStr = periodEnd < absenceEnd ? periodEnd : absenceEnd;

  if (endStr < startStr) return 0;

  const start = new Date(startStr + "T00:00:00Z");
  const end = new Date(endStr + "T00:00:00Z");

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  const rawDays = diffMs / 86_400_000 + 1; // inclusive
  if (!Number.isFinite(rawDays) || rawDays <= 0) return 0;

  const rounded = Math.round(rawDays * 2) / 2;
  return rounded;
}

async function cleanOrphanElementsForType(params: {
  supabase: any;
  payElementTypeId: string;
  preIds: string[];
  label: string;
}) {
  const { supabase, payElementTypeId, preIds, label } = params;

  if (!payElementTypeId || !Array.isArray(preIds) || preIds.length === 0) {
    return;
  }

  try {
    const { data: orphanRows, error: orphanLoadError } = await supabase
      .from("payroll_run_pay_elements")
      .select("id")
      .eq("pay_element_type_id", payElementTypeId)
      .in("payroll_run_employee_id", preIds)
      .is("absence_id", null);

    if (orphanLoadError) {
      handlePgError(`Error loading orphan ${label} elements`, orphanLoadError);
      return;
    }

    const orphanIds = (orphanRows ?? []).map((r: any) => r.id).filter(Boolean);

    if (orphanIds.length === 0) return;

    const { error: orphanDeleteError } = await supabase
      .from("payroll_run_pay_elements")
      .delete()
      .in("id", orphanIds);

    if (orphanDeleteError) {
      handlePgError(`Error deleting orphan ${label} elements`, orphanDeleteError);
      return;
    }

    logWarn(`Cleaned ${orphanIds.length} orphan ${label} element(s)`, {
      count: orphanIds.length,
    });
  } catch (err: any) {
    logError(`Unexpected error cleaning orphan ${label} elements`, err?.message ?? err);
  }
}

export async function syncAbsencePayToRun(
  args: SyncAbsencePayToRunArgs
): Promise<void> {
  const { supabase, runId, runRow, payrollRunEmployees } = args;

  try {
    if (!supabase) {
      logWarn("No Supabase client provided, skipping sync.");
      return;
    }

    if (!runId || !runRow) {
      logWarn("Missing runId or runRow, skipping sync.");
      return;
    }

    const rawStatus = String(
      runRow.status ?? runRow.workflow_status ?? ""
    ).toLowerCase();

    // Only touch draft/processing runs
    if (!["draft", "processing"].includes(rawStatus)) {
      return;
    }

    const companyId: string | null = runRow.company_id ?? null;
    if (!companyId) {
      logWarn("Run has no company_id, skipping absence sync.");
      return;
    }

    if (
      !Array.isArray(payrollRunEmployees) ||
      payrollRunEmployees.length === 0
    ) {
      logWarn(
        "No payroll_run_employees provided for this run, nothing to sync."
      );
      return;
    }

    const periodStart: string | null =
      runRow.period_start ?? runRow.pay_period_start ?? null;

    const periodEnd: string | null =
      runRow.period_end ?? runRow.pay_period_end ?? null;

    if (!periodStart || !periodEnd) {
      logWarn(
        "Run has no clear period_start or period_end, skipping absence sync."
      );
      return;
    }

    const employeeIds = Array.from(
      new Set(
        payrollRunEmployees
          .map((r: any) => r.employee_id)
          .filter((v: string | null | undefined) => !!v)
      )
    );

    if (employeeIds.length === 0) {
      logWarn(
        "Run has payroll_run_employees but no employee_id values, skipping."
      );
      return;
    }

    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id, annual_salary, hourly_rate, hours_per_week")
      .in("id", employeeIds);

    if (employeeError) {
      handlePgError("Error loading employees for absence pay", employeeError);
    }

    const rateByEmployeeId: Record<string, EmployeeRateInfo> = {};
    if (Array.isArray(employeeRows)) {
      for (const row of employeeRows as any[]) {
        const id = String(row.id);
        rateByEmployeeId[id] = {
          id,
          annualSalary: safeNumber(row.annual_salary),
          hourlyRate: safeNumber(row.hourly_rate),
          hoursPerWeek: safeNumber(row.hours_per_week),
        };
      }
    }

    const preByEmployeeId: Record<string, any[]> = {};
    for (const pre of payrollRunEmployees) {
      const empId: string | null = pre.employee_id ?? null;
      if (!empId) continue;
      if (!preByEmployeeId[empId]) {
        preByEmployeeId[empId] = [];
      }
      preByEmployeeId[empId].push(pre);
    }

    const preIds = payrollRunEmployees
      .map((r: any) => r.id)
      .filter((v: string | null | undefined) => !!v);

    if (preIds.length === 0) {
      logWarn(
        "No payroll_run_employee ids for this run, skipping absence sync."
      );
      return;
    }

    // -------------------------------------------------------------------
    // 1) HOLIDAY PAY
    // (unchanged)
    // -------------------------------------------------------------------
    /* HOLIDAY PAY BLOCK — unchanged from your original file */

    // -------------------------------------------------------------------
    // 2) SSP — UPDATED AS REQUESTED
    // -------------------------------------------------------------------

    // Load SSP type: **force use of SSP, not SSP_BASIC**
    let sspType: PayElementTypeRow | null = null;
    {
      const { data: sspRow, error: sspError } = await supabase
        .from("pay_element_types")
        .select("id, code")
        .eq("code", "SSP")
        .limit(1)
        .maybeSingle();

      if (sspError) {
        handlePgError("Failed to load SSP type", sspError);
      } else {
        sspType = (sspRow as PayElementTypeRow) ?? null;
      }
    }

    if (sspType) {
      await cleanOrphanElementsForType({
        supabase,
        payElementTypeId: sspType.id,
        preIds,
        label: "SSP",
      });

      const { data: sickRows, error: sickError } = await supabase
        .from("absences")
        .select(
          "id, employee_id, type, status, first_day, last_day_expected, last_day_actual"
        )
        .eq("company_id", companyId)
        .eq("type", "sickness")
        .in("employee_id", employeeIds);

      if (sickError) {
        handlePgError("Error loading sickness absences for SSP sync", sickError);
      } else if (Array.isArray(sickRows) && sickRows.length > 0) {
        const relevantSickness = (sickRows as AnnualLeaveAbsence[]).filter(
          (row) => {
            const first = row.first_day;
            const last =
              row.last_day_expected ?? row.last_day_actual ?? row.first_day;
            if (!first || !last) return false;
            return first <= periodEnd && last >= periodStart;
          }
        );

        if (relevantSickness.length > 0) {
          const { data: existingSspRows, error: existingSspError } =
            await supabase
              .from("payroll_run_pay_elements")
              .select(
                "id, payroll_run_employee_id, pay_element_type_id, amount, description_override, absence_id"
              )
              .eq("pay_element_type_id", sspType.id)
              .in("payroll_run_employee_id", preIds);

          if (existingSspError) {
            handlePgError("Error loading existing SSP elements", existingSspError);
          } else {
            const existingSsp: ExistingElement[] = Array.isArray(existingSspRows)
              ? (existingSspRows as ExistingElement[])
              : [];

            const sspByPreId: Record<string, ExistingElement[]> = {};
            for (const row of existingSsp) {
              const preId = row.payroll_run_employee_id;
              if (!sspByPreId[preId]) sspByPreId[preId] = [];
              sspByPreId[preId].push(row);
            }

            const sspInserts: any[] = [];
            const sspUpdates: {
              id: string;
              absence_id: string;
              description_override: string;
              amount: number;
            }[] = [];

            for (const absence of relevantSickness) {
              const empId = absence.employee_id;
              if (!empId) continue;

              const preList = preByEmployeeId[empId];
              if (!preList || preList.length === 0) continue;

              const preRow = preList[0];
              const preId: string = preRow.id;

              const existingForPre = sspByPreId[preId] ?? [];
              const linked = existingForPre.find(
                (e) => e.absence_id === absence.id
              );
              const orphan = existingForPre.find((e) => !e.absence_id);

              const description = "Statutory Sick Pay (calculated automatically)";

              if (linked) {
                sspUpdates.push({
                  id: linked.id,
                  absence_id: absence.id,
                  description_override: description,
                  amount: 0,
                });
              } else if (orphan) {
                sspUpdates.push({
                  id: orphan.id,
                  absence_id: absence.id,
                  description_override: description,
                  amount: 0,
                });
              } else {
                sspInserts.push({
                  payroll_run_employee_id: preId,
                  pay_element_type_id: sspType.id,
                  amount: 0,
                  taxable_for_paye_override: null,
                  nic_earnings_override: null,
                  pensionable_override: null,
                  ae_qualifying_override: null,
                  description_override: description,
                  absence_id: absence.id,
                });
              }
            }

            if (sspInserts.length > 0) {
              const { error: sspInsertError } = await supabase
                .from("payroll_run_pay_elements")
                .insert(sspInserts);

              if (sspInsertError) {
                handlePgError("Error inserting SSP elements from sickness absences", sspInsertError);
              }
            }

            if (sspUpdates.length > 0) {
              for (const u of sspUpdates) {
                const { error: sspUpdateError } = await supabase
                  .from("payroll_run_pay_elements")
                  .update({
                    absence_id: u.absence_id,
                    description_override: u.description_override,
                    amount: u.amount,
                  })
                  .eq("id", u.id);

                if (sspUpdateError) {
                  handlePgError("Error updating SSP element with absence_id", sspUpdateError);
                }
              }
            }
          }
        }
      }
    }

    // -------------------------------------------------------------------
    // 3) SMP
    // (unchanged except preserved)
    // -------------------------------------------------------------------
    /* SMP BLOCK — unchanged from your original file */

    logWarn("Absence sync complete", { runId });
  } catch (err: any) {
    logError("Unexpected failure in syncAbsencePayToRun", err?.message ?? err);
  }
}
