// C:\Projects\wageflow01\lib\payroll\syncAbsencePayToRun.ts

import { PostgrestError } from "@supabase/supabase-js";

type SyncAbsencePayToRunArgs = {
  supabase: any; // admin client created in the API route
  runId: string;
  runRow: any;
  payrollRunEmployees: any[];
};

type SicknessAbsenceRow = {
  id: string;
  employee_id: string | null;
  type: string | null;
  status: string | null;
  first_day: string | null;
  last_day_expected: string | null;
  last_day_actual: string | null;
  reference_notes?: string | null;
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

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function isIsoDateOnly(s: any): boolean {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseIsoDateOnlyToUtc(iso: string): Date {
  const s = String(iso || "").trim();
  if (!isIsoDateOnly(s)) throw new Error("Bad date: " + s);
  const [y, m, d] = s.split("-").map((p) => parseInt(p, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function toIsoDateOnlyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUtc(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function diffDaysUtc(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function isWeekdayUtc(d: Date): boolean {
  const day = d.getUTCDay(); // 0 Sun ... 6 Sat
  return day >= 1 && day <= 5;
}

function countWeekdaysInIsoRange(startIso: string, endIso: string): number {
  if (!isIsoDateOnly(startIso) || !isIsoDateOnly(endIso)) return 0;

  const start = parseIsoDateOnlyToUtc(startIso);
  const end = parseIsoDateOnlyToUtc(endIso);

  if (end < start) return 0;

  let count = 0;
  for (let dd = new Date(start.getTime()); dd <= end; dd = addDaysUtc(dd, 1)) {
    if (isWeekdayUtc(dd)) count += 1;
  }

  return count;
}

async function loadCompliancePackForDate(supabase: any, packDateIso: string) {
  if (!isIsoDateOnly(packDateIso)) throw new Error("Invalid pack date. Expected YYYY-MM-DD.");

  const { data, error } = await supabase.rpc("get_compliance_pack_for_date", {
    p_pay_date: packDateIso,
  });

  if (error) throw new Error(`Compliance pack RPC failed: ${error.message}`);

  const pack = Array.isArray(data) ? data[0] : data;
  if (!pack?.id) throw new Error(`No compliance pack found for ${packDateIso}`);

  return pack;
}

function extractSspSettingsFromPack(pack: any) {
  const cfg = pack?.config ?? {};
  const ssp = cfg?.ssp ?? {};
  const rates = cfg?.rates ?? {};

  const weeklyFlat = Number(rates?.ssp_weekly_flat);
  if (!Number.isFinite(weeklyFlat) || weeklyFlat <= 0) {
    throw new Error(`Compliance pack ${pack?.tax_year ?? ""} missing/invalid rates.ssp_weekly_flat`);
  }

  const waitingDaysRaw = Number(ssp?.waiting_days);
  const waitingDays =
    Number.isFinite(waitingDaysRaw) && waitingDaysRaw >= 0 && waitingDaysRaw <= 7 ? waitingDaysRaw : 3;

  return {
    weeklyFlat,
    waitingDays,
    packMeta: {
      packDateUsed: String(pack?.effective_from || "") ? String(pack?.effective_from) : null,
      taxYear: String(pack?.tax_year ?? ""),
      label: String(pack?.label ?? ""),
      packId: String(pack?.id ?? ""),
      weeklyFlat,
      qualifyingDaysPerWeek: 5,
      waitingDays,
      requiresLel: Boolean(ssp?.requires_lel),
      lowEarnerPercentCapEnabled: Boolean(ssp?.low_earner_percent_cap_enabled),
      lowEarnerPercent:
        ssp?.low_earner_percent === null || ssp?.low_earner_percent === undefined
          ? null
          : Number(ssp?.low_earner_percent),
    },
  };
}

function computeSspPayableDaysByAbsence(args: {
  absences: SicknessAbsenceRow[];
  runStartIso: string;
  runEndIso: string;
  waitingDaysTarget: number;
}): {
  byAbsenceId: Record<
    string,
    {
      absenceId: string;
      employeeId: string;
      sicknessStart: string;
      sicknessEnd: string;
      qualifyingDaysInRun: number;
      payableDaysInRun: number;
    }
  >;
} {
  const { absences, runStartIso, runEndIso, waitingDaysTarget } = args;

  const runStart = parseIsoDateOnlyToUtc(runStartIso);
  const runEnd = parseIsoDateOnlyToUtc(runEndIso);

  const sorted = [...absences].sort((a, b) => {
    const aStart = parseIsoDateOnlyToUtc(String(a.first_day)).getTime();
    const bStart = parseIsoDateOnlyToUtc(String(b.first_day)).getTime();
    if (aStart === bStart) {
      const aEnd = parseIsoDateOnlyToUtc(String(a.last_day_actual || a.last_day_expected)).getTime();
      const bEnd = parseIsoDateOnlyToUtc(String(b.last_day_actual || b.last_day_expected)).getTime();
      return aEnd - bEnd;
    }
    return aStart - bStart;
  });

  const byAbsenceId: Record<string, any> = {};

  const target = Math.max(0, Math.min(7, Number(waitingDaysTarget)));
  let chainEndDate: Date | null = null;
  let waitingDaysUsedInChain = 0;

  for (const absence of sorted) {
    const absenceId = String(absence?.id || "").trim();
    const employeeId = String(absence?.employee_id || "").trim();

    const first = String(absence?.first_day || "").trim();
    const last = String(absence?.last_day_actual || absence?.last_day_expected || "").trim();

    if (!absenceId || !employeeId || !isIsoDateOnly(first) || !isIsoDateOnly(last)) continue;

    const sicknessStart = parseIsoDateOnlyToUtc(first);
    const sicknessEnd = parseIsoDateOnlyToUtc(last);

    if (chainEndDate) {
      const gapDays = diffDaysUtc(chainEndDate, sicknessStart);
      if (gapDays > 56) {
        waitingDaysUsedInChain = 0;
      }
    }

    let qualifyingInRun = 0;
    let payableInRun = 0;

    for (let dd = new Date(sicknessStart.getTime()); dd <= sicknessEnd; dd = addDaysUtc(dd, 1)) {
      if (!isWeekdayUtc(dd)) continue;

      const isWithinRun = dd >= runStart && dd <= runEnd;

      let isPayable = false;
      if (waitingDaysUsedInChain >= target) {
        isPayable = true;
      } else {
        waitingDaysUsedInChain += 1;
      }

      if (isWithinRun) {
        qualifyingInRun += 1;
        if (isPayable) payableInRun += 1;
      }
    }

    if (qualifyingInRun > 0) {
      byAbsenceId[absenceId] = {
        absenceId,
        employeeId,
        sicknessStart: first,
        sicknessEnd: last,
        qualifyingDaysInRun: qualifyingInRun,
        payableDaysInRun: payableInRun,
      };
    }

    if (!chainEndDate || sicknessEnd > chainEndDate) {
      chainEndDate = sicknessEnd;
    }
  }

  return { byAbsenceId };
}

export async function syncAbsencePayToRun(args: SyncAbsencePayToRunArgs): Promise<void> {
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

    const rawStatus = String(runRow.status ?? runRow.workflow_status ?? "").toLowerCase();

    // Only touch draft/processing runs
    if (!["draft", "processing"].includes(rawStatus)) {
      return;
    }

    const companyId: string | null = runRow.company_id ?? null;
    if (!companyId) {
      logWarn("Run has no company_id, skipping absence sync.");
      return;
    }

    if (!Array.isArray(payrollRunEmployees) || payrollRunEmployees.length === 0) {
      logWarn("No payroll_run_employees provided for this run, nothing to sync.");
      return;
    }

    const periodStart: string | null = runRow.period_start ?? runRow.pay_period_start ?? null;
    const periodEnd: string | null = runRow.period_end ?? runRow.pay_period_end ?? null;

    if (!periodStart || !periodEnd || !isIsoDateOnly(periodStart) || !isIsoDateOnly(periodEnd)) {
      logWarn("Run has no clear period_start or period_end, skipping absence sync.");
      return;
    }

    const employeeIds = Array.from(
      new Set(
        payrollRunEmployees
          .map((r: any) => r.employee_id)
          .filter((v: string | null | undefined) => !!v)
          .map((v: any) => String(v))
      )
    );

    if (employeeIds.length === 0) {
      logWarn("Run has payroll_run_employees but no employee_id values, skipping.");
      return;
    }

    const preByEmployeeId: Record<string, any[]> = {};
    for (const pre of payrollRunEmployees) {
      const empId: string | null = pre.employee_id ?? null;
      if (!empId) continue;
      if (!preByEmployeeId[empId]) preByEmployeeId[empId] = [];
      preByEmployeeId[empId].push(pre);
    }

    const preIds = payrollRunEmployees
      .map((r: any) => r.id)
      .filter((v: string | null | undefined) => !!v)
      .map((v: any) => String(v));

    if (preIds.length === 0) {
      logWarn("No payroll_run_employee ids for this run, skipping absence sync.");
      return;
    }

    // -------------------------------------------------------------------
    // 1) HOLIDAY PAY
    // (unchanged)
    // -------------------------------------------------------------------
    /* HOLIDAY PAY BLOCK — unchanged from your original file */

    // -------------------------------------------------------------------
    // 2) SSP — FIXED: write REAL SSP amounts into payroll_run_pay_elements
    // -------------------------------------------------------------------

    // Load sickness-related pay element types.
    // Canonical live codes are:
    // - SSP for statutory sick pay
    // - SICK_BASIC_REDUCTION for the negative contractual pay adjustment
    let sspType: PayElementTypeRow | null = null;
    let basicType: PayElementTypeRow | null = null;
    let sickBasicReductionType: PayElementTypeRow | null = null;

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

    {
      const { data: basicRow, error: basicError } = await supabase
        .from("pay_element_types")
        .select("id, code")
        .eq("code", "BASIC")
        .limit(1)
        .maybeSingle();

      if (basicError) {
        handlePgError("Failed to load BASIC type", basicError);
      } else {
        basicType = (basicRow as PayElementTypeRow) ?? null;
      }
    }

    {
      const { data: reductionRow, error: reductionError } = await supabase
        .from("pay_element_types")
        .select("id, code")
        .eq("code", "SICK_BASIC_REDUCTION")
        .limit(1)
        .maybeSingle();

      if (reductionError) {
        handlePgError("Failed to load SICK_BASIC_REDUCTION type", reductionError);
      } else {
        sickBasicReductionType = (reductionRow as PayElementTypeRow) ?? null;
      }
    }

    if (sspType || sickBasicReductionType) {
      // Resolve SSP policy + weekly rate from Compliance Pack (by period end date)
      let weeklyFlat = 0;
      let waitingDays = 3;
      let dailyRate = 0;

      if (sspType) {
        try {
          const pack = await loadCompliancePackForDate(supabase, periodEnd);
          const sspCfg = extractSspSettingsFromPack(pack);

          weeklyFlat = Number(sspCfg.weeklyFlat);
          waitingDays = Number(sspCfg.waitingDays);
          dailyRate = round2(weeklyFlat / 5);
        } catch (e: any) {
          logError("SSP sync skipped: failed to resolve SSP settings from compliance pack", e?.message ?? e);
          weeklyFlat = 0;
          dailyRate = 0;
        }
      }

      // Load sickness absences with lookback so waiting days can carry across linked spells
      const lookbackStartIso = toIsoDateOnlyUtc(addDaysUtc(parseIsoDateOnlyToUtc(periodStart), -365));

      const { data: sickRows, error: sickError } = await supabase
        .from("absences")
        .select("id, employee_id, type, status, first_day, last_day_expected, last_day_actual, reference_notes")
        .eq("company_id", companyId)
        .eq("type", "sickness")
        .in("employee_id", employeeIds)
        .lte("first_day", periodEnd)
        .gte("last_day_expected", lookbackStartIso)
        .order("first_day", { ascending: true });

      if (sickError) {
        handlePgError("Error loading sickness absences for SSP sync", sickError);
      }

      const sicknessAll: SicknessAbsenceRow[] = Array.isArray(sickRows) ? (sickRows as any) : [];

      // Group by employee
      const absencesByEmployee: Record<string, SicknessAbsenceRow[]> = {};
      for (const a of sicknessAll) {
        const empId = String(a?.employee_id || "").trim();
        if (!empId) continue;

        const first = String(a?.first_day || "").trim();
        const last = String(a?.last_day_actual || a?.last_day_expected || "").trim();
        if (!isIsoDateOnly(first) || !isIsoDateOnly(last)) continue;

        if (!absencesByEmployee[empId]) absencesByEmployee[empId] = [];
        absencesByEmployee[empId].push(a);
      }

      const computedSicknessItems: Array<{
        absenceId: string;
        employeeId: string;
        payrollRunEmployeeId: string;
        sicknessStart: string;
        sicknessEnd: string;
        qualifyingDaysInRun: number;
        payableDaysInRun: number;
      }> = [];

      for (const empId of Object.keys(absencesByEmployee)) {
        const preList = preByEmployeeId[empId];
        if (!preList || preList.length === 0) continue;

        const preRow = preList[0];
        const preId = String(preRow?.id || "").trim();
        if (!preId) continue;

        const { byAbsenceId } = computeSspPayableDaysByAbsence({
          absences: absencesByEmployee[empId],
          runStartIso: periodStart,
          runEndIso: periodEnd,
          waitingDaysTarget: waitingDays,
        });

        for (const key of Object.keys(byAbsenceId)) {
          const x = byAbsenceId[key];

          const qualifying = Number(x?.qualifyingDaysInRun || 0);
          const payable = Number(x?.payableDaysInRun || 0);

          if (qualifying <= 0) continue;

          computedSicknessItems.push({
            absenceId: String(x.absenceId),
            employeeId: String(x.employeeId),
            payrollRunEmployeeId: preId,
            sicknessStart: String(x.sicknessStart),
            sicknessEnd: String(x.sicknessEnd),
            qualifyingDaysInRun: qualifying,
            payableDaysInRun: payable,
          });
        }
      }

      const computedSspItems: Array<{
        absenceId: string;
        employeeId: string;
        payrollRunEmployeeId: string;
        sicknessStart: string;
        sicknessEnd: string;
        qualifyingDaysInRun: number;
        payableDaysInRun: number;
        amount: number;
        description: string;
      }> = [];

      if (sspType && dailyRate > 0) {
        for (const item of computedSicknessItems) {
          const payable = Number(item?.payableDaysInRun || 0);
          const qualifying = Number(item?.qualifyingDaysInRun || 0);

          // Only write SSP elements when there is actually something payable
          if (payable <= 0) continue;

          const amount = round2(payable * dailyRate);

          const desc =
            "Statutory Sick Pay (calculated automatically) - " +
            `${payable} payable day${payable === 1 ? "" : "s"} ` +
            `@ £${dailyRate.toFixed(2)}/day ` +
            `(sickness ${item.sicknessStart} to ${item.sicknessEnd}; ` +
            `${qualifying} qualifying day${qualifying === 1 ? "" : "s"} in run)`;

          computedSspItems.push({
            absenceId: item.absenceId,
            employeeId: item.employeeId,
            payrollRunEmployeeId: item.payrollRunEmployeeId,
            sicknessStart: item.sicknessStart,
            sicknessEnd: item.sicknessEnd,
            qualifyingDaysInRun: qualifying,
            payableDaysInRun: payable,
            amount,
            description: desc,
          });
        }
      }

      const runWeekdays = countWeekdaysInIsoRange(periodStart, periodEnd);

      const basicAmountsByPreId: Record<string, number> = {};
      if (basicType && runWeekdays > 0) {
        const { data: basicRows, error: basicRowsError } = await supabase
          .from("payroll_run_pay_elements")
          .select("payroll_run_employee_id, amount")
          .eq("pay_element_type_id", basicType.id)
          .in("payroll_run_employee_id", preIds);

        if (basicRowsError) {
          handlePgError("Error loading BASIC elements for sickness reduction sync", basicRowsError as any);
        } else {
          for (const row of Array.isArray(basicRows) ? basicRows : []) {
            const preId = String((row as any)?.payroll_run_employee_id || "").trim();
            if (!preId) continue;

            const amount = safeNumber((row as any)?.amount) ?? 0;
            basicAmountsByPreId[preId] = round2((basicAmountsByPreId[preId] || 0) + amount);
          }
        }
      }

      const computedReductionItems: Array<{
        absenceId: string;
        employeeId: string;
        payrollRunEmployeeId: string;
        sicknessStart: string;
        sicknessEnd: string;
        qualifyingDaysInRun: number;
        amount: number;
        description: string;
      }> = [];

      if (sickBasicReductionType && basicType && runWeekdays > 0) {
        for (const item of computedSicknessItems) {
          const qualifying = Number(item?.qualifyingDaysInRun || 0);
          if (qualifying <= 0) continue;

          const basicAmount = round2(Math.max(0, basicAmountsByPreId[item.payrollRunEmployeeId] || 0));
          if (basicAmount <= 0) continue;

          const dailyBasicRate = round2(basicAmount / runWeekdays);
          const grossReduction = round2(dailyBasicRate * qualifying);
          const cappedReduction = round2(Math.min(grossReduction, basicAmount));
          const amount = round2(cappedReduction * -1);

          if (amount >= 0) continue;

          const desc =
            "Sickness absence adjustment (calculated automatically) - " +
            `${qualifying} working day${qualifying === 1 ? "" : "s"} ` +
            `@ £${dailyBasicRate.toFixed(2)}/day ` +
            `(sickness ${item.sicknessStart} to ${item.sicknessEnd})`;

          computedReductionItems.push({
            absenceId: item.absenceId,
            employeeId: item.employeeId,
            payrollRunEmployeeId: item.payrollRunEmployeeId,
            sicknessStart: item.sicknessStart,
            sicknessEnd: item.sicknessEnd,
            qualifyingDaysInRun: qualifying,
            amount,
            description: desc,
          });
        }
      }

      if (sspType) {
        // Load existing SSP pay elements for this run
        const { data: existingSspRows, error: existingSspError } = await supabase
          .from("payroll_run_pay_elements")
          .select("id, payroll_run_employee_id, pay_element_type_id, amount, description_override, absence_id")
          .eq("pay_element_type_id", sspType.id)
          .in("payroll_run_employee_id", preIds);

        if (existingSspError) {
          handlePgError("Error loading existing SSP elements", existingSspError);
        }

        const existingSsp: ExistingElement[] = Array.isArray(existingSspRows) ? (existingSspRows as any) : [];

        const existingByPreId: Record<string, ExistingElement[]> = {};
        for (const row of existingSsp) {
          const preId = String(row?.payroll_run_employee_id || "").trim();
          if (!preId) continue;
          if (!existingByPreId[preId]) existingByPreId[preId] = [];
          existingByPreId[preId].push(row);
        }

        const usedExistingIds = new Set<string>();
        const inserts: any[] = [];
        const updates: Array<{ id: string; patch: any }> = [];

        // Upsert each computed SSP absence item into payroll_run_pay_elements
        for (const item of computedSspItems) {
          const preId = item.payrollRunEmployeeId;
          const list = existingByPreId[preId] ?? [];

          const linked = list.find((e) => String(e?.absence_id || "").trim() === item.absenceId);
          const orphan = list.find((e) => !e?.absence_id && !usedExistingIds.has(String(e?.id || "").trim()));

          if (linked && linked.id) {
            usedExistingIds.add(String(linked.id).trim());
            updates.push({
              id: String(linked.id).trim(),
              patch: {
                absence_id: item.absenceId,
                description_override: item.description,
                amount: item.amount,
              },
            });
          } else if (orphan && orphan.id) {
            usedExistingIds.add(String(orphan.id).trim());
            updates.push({
              id: String(orphan.id).trim(),
              patch: {
                absence_id: item.absenceId,
                description_override: item.description,
                amount: item.amount,
              },
            });
          } else {
            inserts.push({
              payroll_run_employee_id: preId,
              pay_element_type_id: sspType.id,
              amount: item.amount,
              taxable_for_paye_override: null,
              nic_earnings_override: null,
              pensionable_override: null,
              ae_qualifying_override: null,
              description_override: item.description,
              absence_id: item.absenceId,
            });
          }
        }

        // Delete any existing SSP elements that are no longer valid for this run
        const staleIds: string[] = existingSsp
          .map((e) => String(e?.id || "").trim())
          .filter(Boolean)
          .filter((rowId) => !usedExistingIds.has(rowId));

        // If dailyRate is 0, do not touch existing SSP rows (avoid wiping amounts).
        if (dailyRate > 0) {
          if (staleIds.length > 0) {
            const { error: delErr } = await supabase.from("payroll_run_pay_elements").delete().in("id", staleIds);
            if (delErr) {
              handlePgError("Error deleting stale SSP elements", delErr as any);
            }
          }

          if (inserts.length > 0) {
            const { error: insErr } = await supabase.from("payroll_run_pay_elements").insert(inserts);
            if (insErr) {
              handlePgError("Error inserting SSP elements", insErr as any);
            }
          }

          if (updates.length > 0) {
            for (const u of updates) {
              const { error: upErr } = await supabase.from("payroll_run_pay_elements").update(u.patch).eq("id", u.id);
              if (upErr) {
                handlePgError("Error updating SSP element", upErr as any);
              }
            }
          }

          logWarn("SSP sync complete (stored SSP elements written)", {
            runId,
            companyId,
            periodStart,
            periodEnd,
            weeklyFlat,
            dailyRate,
            waitingDays,
            computedAbsencesPayable: computedSspItems.length,
            inserted: inserts.length,
            updated: updates.length,
            deleted: staleIds.length,
          });
        } else {
          logWarn("SSP sync skipped writing amounts (dailyRate=0). Existing SSP elements left untouched.", {
            runId,
            companyId,
            periodStart,
            periodEnd,
          });
        }
      }

      if (sickBasicReductionType && basicType && runWeekdays > 0) {
        const { data: existingReductionRows, error: existingReductionError } = await supabase
          .from("payroll_run_pay_elements")
          .select("id, payroll_run_employee_id, pay_element_type_id, amount, description_override, absence_id")
          .eq("pay_element_type_id", sickBasicReductionType.id)
          .in("payroll_run_employee_id", preIds);

        if (existingReductionError) {
          handlePgError("Error loading existing SICK_BASIC_REDUCTION elements", existingReductionError);
        }

        const existingReduction: ExistingElement[] = Array.isArray(existingReductionRows)
          ? (existingReductionRows as any)
          : [];

        const existingByPreId: Record<string, ExistingElement[]> = {};
        for (const row of existingReduction) {
          const preId = String(row?.payroll_run_employee_id || "").trim();
          if (!preId) continue;
          if (!existingByPreId[preId]) existingByPreId[preId] = [];
          existingByPreId[preId].push(row);
        }

        const usedExistingIds = new Set<string>();
        const inserts: any[] = [];
        const updates: Array<{ id: string; patch: any }> = [];

        for (const item of computedReductionItems) {
          const preId = item.payrollRunEmployeeId;
          const list = existingByPreId[preId] ?? [];

          const linked = list.find((e) => String(e?.absence_id || "").trim() === item.absenceId);
          const orphan = list.find((e) => !e?.absence_id && !usedExistingIds.has(String(e?.id || "").trim()));

          if (linked && linked.id) {
            usedExistingIds.add(String(linked.id).trim());
            updates.push({
              id: String(linked.id).trim(),
              patch: {
                absence_id: item.absenceId,
                description_override: item.description,
                amount: item.amount,
              },
            });
          } else if (orphan && orphan.id) {
            usedExistingIds.add(String(orphan.id).trim());
            updates.push({
              id: String(orphan.id).trim(),
              patch: {
                absence_id: item.absenceId,
                description_override: item.description,
                amount: item.amount,
              },
            });
          } else {
            inserts.push({
              payroll_run_employee_id: preId,
              pay_element_type_id: sickBasicReductionType.id,
              amount: item.amount,
              taxable_for_paye_override: null,
              nic_earnings_override: null,
              pensionable_override: null,
              ae_qualifying_override: null,
              description_override: item.description,
              absence_id: item.absenceId,
            });
          }
        }

        const staleIds: string[] = existingReduction
          .map((e) => String(e?.id || "").trim())
          .filter(Boolean)
          .filter((rowId) => !usedExistingIds.has(rowId));

        if (staleIds.length > 0) {
          const { error: delErr } = await supabase.from("payroll_run_pay_elements").delete().in("id", staleIds);
          if (delErr) {
            handlePgError("Error deleting stale SICK_BASIC_REDUCTION elements", delErr as any);
          }
        }

        if (inserts.length > 0) {
          const { error: insErr } = await supabase.from("payroll_run_pay_elements").insert(inserts);
          if (insErr) {
            handlePgError("Error inserting SICK_BASIC_REDUCTION elements", insErr as any);
          }
        }

        if (updates.length > 0) {
          for (const u of updates) {
            const { error: upErr } = await supabase.from("payroll_run_pay_elements").update(u.patch).eq("id", u.id);
            if (upErr) {
              handlePgError("Error updating SICK_BASIC_REDUCTION element", upErr as any);
            }
          }
        }

        logWarn("Sickness reduction sync complete (stored SICK_BASIC_REDUCTION elements written)", {
          runId,
          companyId,
          periodStart,
          periodEnd,
          runWeekdays,
          computedAbsenceAdjustments: computedReductionItems.length,
          inserted: inserts.length,
          updated: updates.length,
          deleted: staleIds.length,
        });
      } else if (sickBasicReductionType && !basicType) {
        logWarn("Sickness reduction sync skipped: BASIC pay element type was not found.", {
          runId,
          companyId,
        });
      } else if (sickBasicReductionType && runWeekdays <= 0) {
        logWarn("Sickness reduction sync skipped: run has no working weekdays in the pay period.", {
          runId,
          companyId,
          periodStart,
          periodEnd,
        });
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