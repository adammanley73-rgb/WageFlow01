/* C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\[id]\page.tsx */

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Inter } from "next/font/google";

import PageTemplate, { StatTile } from "@/components/ui/PageTemplate";
import { formatUkDate } from "@/lib/formatUkDate";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const MISSING = "—";

type Row = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  email: string;
  gross: number;
  deductions: number;
  net: number;
  calcMode: string;
};

type Candidate = {
  id: string;
  name: string;
  employeeNumber: string;
  email: string;
  payFrequency?: string;
};

type ApiResponse = {
  ok?: boolean;
  debugSource?: string;
  run: any;
  employees: any[];
  totals: any;
  seededMode?: boolean;
  exceptions?: {
    items?: any[];
    blockingCount?: number;
    warningCount?: number;
    total?: number;
  };
};

function gbp(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function toNumberSafe(v: string | number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function statusLabel(s: string) {
  return String(s || "")
    .trim()
    .replaceAll("_", " ")
    .toUpperCase();
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    return v;
  }
  return null;
}

/* -----------------------
   Run label + period fallbacks
------------------------ */

type Frequency = "weekly" | "fortnightly" | "four_weekly" | "monthly" | string;

function isIsoDateOnly(s: any) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? "").trim());
}

function parseIsoDateOnlyToUtc(iso: string) {
  const s = String(iso || "").trim();
  if (!isIsoDateOnly(s)) throw new Error("Bad date: " + s);
  const [y, m, d] = s.split("-").map((p) => parseInt(p, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function isoDateOnlyFromUtc(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

function addDaysUtc(dt: Date, days: number) {
  return new Date(dt.getTime() + days * 86400000);
}

function ukTaxYearStartForPayDate(payDateIso: string) {
  const s = String(payDateIso || "").trim();
  if (!isIsoDateOnly(s)) return null;

  const d = parseIsoDateOnlyToUtc(s);
  const y = d.getUTCFullYear();
  const candidate = new Date(Date.UTC(y, 3, 6));
  const startYear = d.getTime() >= candidate.getTime() ? y : y - 1;

  const start = new Date(Date.UTC(startYear, 3, 6));
  return isoDateOnlyFromUtc(start);
}

function makeRunNumberFromPayDate(frequency: Frequency, payDateIso: string | null) {
  if (!payDateIso || !isIsoDateOnly(payDateIso)) return null;

  const f = String(frequency || "").trim();
  const taxYearStartIso = ukTaxYearStartForPayDate(payDateIso);
  if (!taxYearStartIso) return null;

  const payUtc = parseIsoDateOnlyToUtc(payDateIso);
  const startUtc = parseIsoDateOnlyToUtc(taxYearStartIso);

  const diffDays = Math.round((payUtc.getTime() - startUtc.getTime()) / 86400000);
  if (diffDays < 0) return null;

  if (f === "monthly") {
    const m = payUtc.getUTCMonth();
    const mth = m >= 3 ? m - 3 + 1 : m + 9 + 1;
    return `Mth ${mth}`;
  }

  const period = f === "weekly" ? 7 : f === "fortnightly" ? 14 : f === "four_weekly" ? 28 : null;
  if (!period) return null;

  const n = Math.floor(diffDays / period) + 1;

  if (f === "weekly") return `wk ${n}`;
  if (f === "fortnightly") return `fn ${n}`;
  if (f === "four_weekly") return `4wk ${n}`;

  return null;
}

function derivePeriodFromPayDate(frequency: Frequency, payDateIso: string | null) {
  if (!payDateIso || !isIsoDateOnly(payDateIso)) return null;

  const f = String(frequency || "").trim();
  const endUtc = parseIsoDateOnlyToUtc(payDateIso);

  if (f === "monthly") {
    const [yStr, mStr] = String(payDateIso).split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);

    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;

    const startUtc = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonthUtc = new Date(Date.UTC(y, m, 0));
    return { startIso: isoDateOnlyFromUtc(startUtc), endIso: isoDateOnlyFromUtc(endOfMonthUtc) };
  }

  const len = f === "weekly" ? 7 : f === "fortnightly" ? 14 : f === "four_weekly" ? 28 : null;
  if (!len) return null;

  const startUtc = addDaysUtc(endUtc, -(len - 1));
  return { startIso: isoDateOnlyFromUtc(startUtc), endIso: isoDateOnlyFromUtc(endUtc) };
}

function cleanEmail(v: any) {
  const raw = pickFirst(v, null);
  if (raw === null || raw === undefined) return MISSING;

  let s = String(raw).trim();
  if (!s) return MISSING;

  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "n/a") return MISSING;

  if (s.includes("\uFFFD")) return MISSING;

  if (s === "-" || s === MISSING) return MISSING;

  return s;
}

function mapEmployees(raw: any[]): Row[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: any) => {
    const gross = toNumberSafe(pickFirst(r.gross, r.total_gross, r.gross_pay, 0) as any);
    const deductions = toNumberSafe(pickFirst(r.deductions, r.total_deductions, r.deduction_total, 0) as any);
    const net = toNumberSafe(pickFirst(r.net, r.total_net, r.net_pay, gross - deductions) as any);
    const calcMode = String(pickFirst(r.calc_mode, r.calcMode, "uncomputed") || "uncomputed");

    return {
      id: String(pickFirst(r.id, r.pay_run_employee_id, "") || ""),
      employeeId: String(pickFirst(r.employeeId, r.employee_id, "") || ""),
      employeeName: String(pickFirst(r.employeeName, r.employee_name, r.full_name, MISSING) || MISSING),
      employeeNumber: String(pickFirst(r.employeeNumber, r.employee_number, r.payroll_number, MISSING) || MISSING),
      email: cleanEmail(pickFirst(r.email, r.employee_email, MISSING)),
      gross: Number.isFinite(gross) ? Number(gross.toFixed(2)) : 0,
      deductions: Number.isFinite(deductions) ? Number(deductions.toFixed(2)) : 0,
      net: Number.isFinite(net) ? Number(net.toFixed(2)) : 0,
      calcMode,
    };
  });
}

function calcBadgeStyles(mode: string) {
  const m = String(mode || "").toLowerCase();
  if (m === "full") {
    return { borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.12)", color: "#065f46" };
  }
  if (m === "gross_only") {
    return { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.12)", color: "#92400e" };
  }
  return { borderColor: "#94a3b8", backgroundColor: "rgba(148,163,184,0.14)", color: "#334155" };
}

function severityChip(sev: string) {
  const s = String(sev || "").toLowerCase();
  if (s === "block") {
    return {
      label: "BLOCK",
      style: { borderColor: "#fecaca", backgroundColor: "rgba(239,68,68,0.10)", color: "#991b1b" },
    };
  }
  return {
    label: "WARN",
    style: { borderColor: "#fde68a", backgroundColor: "rgba(245,158,11,0.12)", color: "#92400e" },
  };
}

function isBlock(x: any) {
  return String(x?.severity || "").toLowerCase() === "block";
}

function extractCodes(x: any): string[] {
  const out: string[] = [];

  if (Array.isArray(x?.codes)) out.push(...x.codes.map((c: any) => String(c)));
  if (x?.code) out.push(String(x.code));
  if (x?.warning_code) out.push(String(x.warning_code));
  if (x?.blocking_code) out.push(String(x.blocking_code));

  const clean = out
    .map((c) => String(c || "").trim())
    .filter(Boolean);

  return Array.from(new Set(clean));
}

function isUuid(s: any) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || "").trim());
}

export default function PayrollRunDetailPage() {
  const params = useParams();
  const runId = String((params as any)?.id || "");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState<null | "save" | "approve" | "recalc" | "supp" | "attach" | "attachSelected">(null);

  const [dirty, setDirty] = useState<boolean>(false);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [approvedMsg, setApprovedMsg] = useState<string | null>(null);

  const [exceptionsExpanded, setExceptionsExpanded] = useState<boolean>(false);
  const exceptionsAnchorRef = useRef<HTMLDivElement | null>(null);

  const [suppCheck, setSuppCheck] = useState<{
    checked: boolean;
    loading: boolean;
    open: boolean;
    openId: string | null;
    openStatus: string | null;
  }>({ checked: false, loading: false, open: false, openId: null, openStatus: null });

  const [attachOpen, setAttachOpen] = useState<boolean>(false);
  const [attachLoading, setAttachLoading] = useState<boolean>(false);
  const [attachErr, setAttachErr] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [attachSearch, setAttachSearch] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const load = async () => {
    setApprovedMsg(null);
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/payroll/${runId}`, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed to load payroll run ${runId}`);
      }

      const j: ApiResponse = await res.json();
      setData(j);

      const mapped = mapEmployees(j?.employees);
      setRows(mapped);

      setDirty(false);
      setValidation({});
    } catch (e: any) {
      setErr(e?.message || "Error loading payroll run");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!runId) return;
    load();
  }, [runId]);

  const rowTotals = useMemo(() => {
    const tg = rows.reduce((a, r) => a + (Number.isFinite(r.gross) ? r.gross : 0), 0);
    const td = rows.reduce((a, r) => a + (Number.isFinite(r.deductions) ? r.deductions : 0), 0);
    const tn = rows.reduce((a, r) => a + (Number.isFinite(r.net) ? r.net : 0), 0);
    return {
      gross: Number(tg.toFixed(2)),
      deductions: Number(td.toFixed(2)),
      net: Number(tn.toFixed(2)),
    };
  }, [rows]);

  const apiTotals = useMemo(() => {
    const runObj: any = (data as any)?.run || {};
    const totalsObj: any = (data as any)?.totals || {};

    const gross = toNumberSafe(
      pickFirst(totalsObj.gross, totalsObj.total_gross, runObj.total_gross_pay, runObj.totalGrossPay, 0) as any
    );

    const tax = toNumberSafe(pickFirst(totalsObj.tax, runObj.total_tax, runObj.totalTax, 0) as any);
    const ni = toNumberSafe(pickFirst(totalsObj.ni, runObj.total_ni, runObj.totalNi, 0) as any);

    const net = toNumberSafe(
      pickFirst(totalsObj.net, totalsObj.total_net, runObj.total_net_pay, runObj.totalNetPay, 0) as any
    );

    const deductions = Number((gross - net).toFixed(2));

    return {
      gross: Number(gross.toFixed(2)),
      deductions: Number(deductions.toFixed(2)),
      net: Number(net.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      ni: Number(ni.toFixed(2)),
    };
  }, [data]);

  const displayTotals = rows.length > 0 ? rowTotals : apiTotals;

  const runObj: any = (data as any)?.run || {};
  const employeesRaw: any[] = Array.isArray((data as any)?.employees) ? (data as any).employees : [];

  const runKindRaw = String(pickFirst(runObj.run_kind, runObj.runKind, "primary") || "primary").trim().toLowerCase();
  const isSupplementary = runKindRaw === "supplementary";

  const parentRunId = String(pickFirst(runObj.parent_run_id, runObj.parentRunId, "") || "").trim();
  const hasParent = isUuid(parentRunId);

  const payDateIso = pickFirst(runObj.payDate, runObj.pay_date, null) as any;
  const frequencyRaw = String(pickFirst(runObj.frequency, runObj.pay_frequency, runObj.payFrequency, "") || "").trim();

  const parentFrequency = String(frequencyRaw || "").trim().toLowerCase();
  const allowedSuppFrequencies = ["fortnightly", "four_weekly", "monthly"];
  const frequencyAllowsSupp = allowedSuppFrequencies.includes(parentFrequency);

  const statusRaw = pickFirst(runObj.status, runObj.run_status, null) as any;
  const statusLower = String(statusRaw || "").trim().toLowerCase();
  const canEditRun = statusLower === "draft" || statusLower === "processing";

  const parentStatus = String(statusRaw || "").trim().toLowerCase();
  const parentIsCompleted = parentStatus === "completed";

  useEffect(() => {
    const shouldCheck =
      !!runId &&
      !loading &&
      !!data &&
      !isSupplementary &&
      parentIsCompleted &&
      frequencyAllowsSupp &&
      isIsoDateOnly(String(payDateIso || "").trim());

    if (!shouldCheck) {
      setSuppCheck({ checked: false, loading: false, open: false, openId: null, openStatus: null });
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setSuppCheck((s) => ({ ...s, checked: false, loading: true, open: false, openId: null, openStatus: null }));

        const taxYearStart = ukTaxYearStartForPayDate(String(payDateIso));
        const url = taxYearStart ? `/api/payroll/runs?taxYearStart=${encodeURIComponent(taxYearStart)}` : `/api/payroll/runs`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || "Failed to check supplementary runs");
        }

        const j: any = await res.json().catch(() => ({}));
        const runs = Array.isArray(j?.runs) ? j.runs : [];

        const open = runs.find((r: any) => {
          const kind = String(r?.run_kind || "").trim().toLowerCase();
          const parent = String(r?.parent_run_id || "").trim();
          const st = String(r?.status ?? "draft").trim().toLowerCase();
          const archivedAt = r?.archived_at ?? null;

          if (kind !== "supplementary") return false;
          if (parent !== runId) return false;
          if (archivedAt) return false;
          return st !== "completed";
        });

        if (cancelled) return;

        if (open?.id) {
          setSuppCheck({
            checked: true,
            loading: false,
            open: true,
            openId: String(open.id),
            openStatus: String(open.status ?? "draft"),
          });
        } else {
          setSuppCheck({ checked: true, loading: false, open: false, openId: null, openStatus: null });
        }
      } catch {
        if (cancelled) return;
        setSuppCheck({ checked: true, loading: false, open: false, openId: null, openStatus: null });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [runId, loading, data, isSupplementary, parentIsCompleted, frequencyAllowsSupp, payDateIso]);

  const exceptionsObj: any = (data as any)?.exceptions;
  const exceptionItems = useMemo(() => {
    const items = exceptionsObj?.items;
    return Array.isArray(items) ? items : [];
  }, [exceptionsObj]);

  const seededModeFromApi = typeof (data as any)?.seededMode === "boolean" ? Boolean((data as any)?.seededMode) : null;

  const seededModeDerivedFromCalcMode = useMemo(() => {
    if (!data) return true;
    if (!Array.isArray(employeesRaw) || employeesRaw.length === 0) return true;

    return employeesRaw.some((e: any) => {
      const m = String(pickFirst(e.calc_mode, e.calcMode, "uncomputed") || "uncomputed").toLowerCase();
      return m !== "full";
    });
  }, [data, employeesRaw]);

  const seededMode = seededModeFromApi !== null ? seededModeFromApi : seededModeDerivedFromCalcMode;

  const blockingCount =
    Number.isFinite(Number(exceptionsObj?.blockingCount))
      ? Number(exceptionsObj?.blockingCount)
      : exceptionItems.filter(isBlock).length;

  const warningCount =
    Number.isFinite(Number(exceptionsObj?.warningCount))
      ? Number(exceptionsObj?.warningCount)
      : exceptionItems.filter((x: any) => !isBlock(x)).length;

  const exceptionTotal =
    Number.isFinite(Number(exceptionsObj?.total)) ? Number(exceptionsObj?.total) : exceptionItems.length;

  const hasBlockingExceptions = blockingCount > 0;
  const hasAnyExceptions = exceptionTotal > 0 || blockingCount > 0 || warningCount > 0;

  const apiSeededKnown = seededModeFromApi !== null;
  const apiExceptionsKnown = data ? Object.prototype.hasOwnProperty.call(data, "exceptions") : false;

  const groupedExceptions = useMemo(() => {
    const groups = new Map<string, any>();

    for (let i = 0; i < exceptionItems.length; i++) {
      const x = exceptionItems[i];
      const sev = isBlock(x) ? "block" : "warn";
      const empId = String(pickFirst(x?.employee_id, x?.employeeId, "") || "");
      const name = String(pickFirst(x?.employee_name, x?.employeeName, MISSING) || MISSING);
      const gross = toNumberSafe(pickFirst(x?.gross, x?.gross_pay, 0) as any);

      const keyBase = empId || name || `idx_${i}`;
      const key = `${sev}::${keyBase}`;

      if (!groups.has(key)) {
        groups.set(key, {
          severity: sev,
          employeeId: empId,
          name,
          gross,
          codes: new Set<string>(),
        });
      }

      const g = groups.get(key);
      const codes = extractCodes(x);
      for (const c of codes) g.codes.add(c);

      if (!Number.isFinite(g.gross) || g.gross === 0) {
        if (Number.isFinite(gross) && gross !== 0) g.gross = gross;
      }
    }

    const blocks: any[] = [];
    const warns: any[] = [];

    for (const v of groups.values()) {
      const out = { ...v, codes: Array.from(v.codes) };
      if (v.severity === "block") blocks.push(out);
      else warns.push(out);
    }

    blocks.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    warns.sort((a, b) => String(a.name).localeCompare(String(b.name)));

    return { blocks, warns };
  }, [exceptionItems]);

  const onChangeCell = (id: string, field: "gross" | "deductions" | "net", value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const next = { ...r };
        const n = toNumberSafe(value);

        (next as any)[field] = n;

        if (field === "gross" || field === "deductions") {
          next.net = Number((toNumberSafe(next.gross) - toNumberSafe(next.deductions)).toFixed(2));
        }

        return next;
      })
    );

    setDirty(true);
  };

  useEffect(() => {
    const v: Record<string, string> = {};

    for (const r of rows) {
      const g = toNumberSafe(r.gross);
      const d = toNumberSafe(r.deductions);
      const n = toNumberSafe(r.net);

      if (g < 0) v[r.id] = "Gross cannot be negative";
      else if (d < 0) v[r.id] = "Deductions cannot be negative";
      else if (n < 0) v[r.id] = "Net cannot be negative";
    }

    setValidation(v);
  }, [rows]);

  const hasErrors = Object.keys(validation).length > 0;
  const saving = actionBusy !== null;

  const saveChanges = async () => {
    try {
      setActionBusy("save");
      setErr(null);

      const payload = {
        items: rows.map((r) => ({
          id: r.id,
          gross: Number(toNumberSafe(r.gross).toFixed(2)),
          deductions: Number(toNumberSafe(r.deductions).toFixed(2)),
          net: Number(toNumberSafe(r.net).toFixed(2)),
        })),
      };

      const res = await fetch(`/api/payroll/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to save changes");
      }

      const j: ApiResponse = await res.json();
      setData(j);

      const mapped = mapEmployees(j?.employees);
      setRows(mapped);

      setDirty(false);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setActionBusy(null);
    }
  };

  const recalculateRun = async () => {
    try {
      setActionBusy("recalc");
      setErr(null);
      setApprovedMsg(null);

      const res = await fetch(`/api/payroll/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalculate" }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to run calculation");
      }

      const j: ApiResponse = await res.json();
      setData(j);

      const mapped = mapEmployees(j?.employees);
      setRows(mapped);

      setDirty(false);
      setValidation({});
    } catch (e: any) {
      setErr(e?.message || "Calculation failed");
    } finally {
      setActionBusy(null);
    }
  };

  const approveRun = async () => {
    try {
      setActionBusy("approve");
      setErr(null);

      const res = await fetch(`/api/payroll/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to approve run");
      }

      const j: ApiResponse = await res.json();
      setData(j);

      const mapped = mapEmployees(j?.employees);
      setRows(mapped);

      setDirty(false);
      setApprovedMsg("Run approved. FPS queued in RTI logs.");
    } catch (e: any) {
      setErr(e?.message || "Approval failed");
    } finally {
      setActionBusy(null);
    }
  };

  const createSupplementaryRun = async () => {
    try {
      if (!runId) throw new Error("Missing run id.");
      setActionBusy("supp");
      setErr(null);
      setApprovedMsg(null);

      const res = await fetch(`/api/payroll/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_supplementary", parent_run_id: runId }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to create supplementary run");
      }

      const j: any = await res.json().catch(() => ({}));
      const newId = String(pickFirst(j?.run_id, j?.id, j?.new_run_id, "") || "").trim();

      if (!isUuid(newId)) throw new Error("Supplementary run was created but no valid run_id was returned.");

      window.location.href = `/dashboard/payroll/${newId}`;
    } catch (e: any) {
      setErr(e?.message || "Failed to create supplementary run");
      setActionBusy(null);
    }
  };

  const exportCsv = () => {
    window.location.href = `/api/payroll/${runId}/export`;
  };

  const attachDueEmployees = async () => {
    try {
      if (!runId) throw new Error("Missing run id.");
      setActionBusy("attach");
      setErr(null);
      setApprovedMsg(null);

      const res = await fetch(`/api/payroll/${runId}/attach-employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const j: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(j?.message || j?.error || "Failed to attach due employees");
      }

      setApprovedMsg(j?.message || "Employees attached.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Attach failed");
    } finally {
      setActionBusy(null);
    }
  };

  const openAttachModal = async () => {
    try {
      if (!runId) return;
      setAttachOpen(true);
      setAttachErr(null);
      setAttachSearch("");
      setCandidates([]);
      setSelectedIds({});
      setAttachLoading(true);

      const res = await fetch(`/api/payroll/${runId}/attach-candidates`, { cache: "no-store" });
      const j: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(j?.message || j?.error || "Failed to load attach candidates");
      }

      const list = Array.isArray(j?.candidates) ? j.candidates : [];
      setCandidates(list);

      const init: Record<string, boolean> = {};
      for (const c of list) {
        const id = String(c?.id ?? "").trim();
        if (id) init[id] = false;
      }
      setSelectedIds(init);
    } catch (e: any) {
      setAttachErr(e?.message || "Failed to load employees");
    } finally {
      setAttachLoading(false);
    }
  };

  const closeAttachModal = () => {
    if (attachLoading) return;
    setAttachOpen(false);
    setAttachErr(null);
    setAttachSearch("");
    setCandidates([]);
    setSelectedIds({});
  };

  const toggleAllVisible = (value: boolean, visibleIds: string[]) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      for (const id of visibleIds) next[id] = value;
      return next;
    });
  };

  const attachSelected = async () => {
    try {
      if (!runId) throw new Error("Missing run id.");

      const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
      if (ids.length === 0) {
        setAttachErr("Select at least one employee.");
        return;
      }

      setActionBusy("attachSelected");
      setErr(null);
      setApprovedMsg(null);
      setAttachErr(null);

      const payload = {
        employee_ids: ids,
        employeeIds: ids,
        employees: ids,
      };

      const res = await fetch(`/api/payroll/${runId}/attach-selected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(j?.message || j?.error || "Failed to attach selected employees");
      }

      closeAttachModal();
      setApprovedMsg(j?.message || "Employees attached.");
      await load();
    } catch (e: any) {
      setAttachErr(e?.message || "Attach failed");
    } finally {
      setActionBusy(null);
    }
  };

  const runNameFromApi = String(pickFirst(runObj.runName, runObj.run_name, "") || "").trim();

  const runNumberFromApi = pickFirst(runObj.runNumber, runObj.run_number, null) as any;
  const runNumberDerived = makeRunNumberFromPayDate(frequencyRaw, payDateIso ? String(payDateIso) : null);
  const runNumber = String(pickFirst(runNumberFromApi, runNumberDerived, MISSING) || MISSING);

  const periodDerived = derivePeriodFromPayDate(frequencyRaw, payDateIso ? String(payDateIso) : null);

  const periodStart = pickFirst(runObj.periodStart, runObj.period_start, periodDerived?.startIso ?? null, null) as any;
  const periodEnd = pickFirst(runObj.periodEnd, runObj.period_end, periodDerived?.endIso ?? null, null) as any;

  const payDate = pickFirst(runObj.payDate, runObj.pay_date, null) as any;

  const statusText = statusRaw ? statusLabel(statusRaw) : MISSING;

  const periodText =
    periodStart && periodEnd ? `${formatUkDate(String(periodStart))} to ${formatUkDate(String(periodEnd))}` : MISSING;

  const payDateText = payDate ? formatUkDate(String(payDate)) : MISSING;

  const canApproveBase =
    (String(statusRaw || "") === "draft" || String(statusRaw || "") === "processing") &&
    rows.length > 0 &&
    !dirty &&
    !hasErrors &&
    !saving;

  const apiGateReady = apiSeededKnown && apiExceptionsKnown;
  const canApprove = canApproveBase && apiGateReady && !seededMode && !hasBlockingExceptions;

  const approveDisabledReason = !apiGateReady
    ? "Approve disabled. Run state is incomplete because seededMode or exceptions were not returned by the API. Reload or run calculation."
    : seededMode
    ? "Approve disabled. This run is not fully calculated (seeded mode is on). Run calculations until seededMode is false."
    : hasBlockingExceptions
    ? `Approve disabled. Fix blocking exceptions first (${blockingCount}).`
    : !canApproveBase
    ? "Approve disabled. Ensure employees are loaded, there are no validation errors, and you have no unsaved edits."
    : "";

  const showDataMismatchNote = !loading && rows.length === 0 && Number(apiTotals.gross) > 0;

  const openExceptionsPanel = () => {
    setExceptionsExpanded(true);
    setTimeout(() => {
      try {
        exceptionsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
      }
    }, 0);
  };

  const headline = runNameFromApi ? runNameFromApi : runNumber !== MISSING ? `Run ${runNumber}` : "Run";
  const kindChip = isSupplementary ? "SUPPLEMENTARY" : "PRIMARY";

  const showCreateSupplementaryButton =
    !loading &&
    !isSupplementary &&
    !!runId &&
    parentIsCompleted &&
    frequencyAllowsSupp &&
    suppCheck.checked &&
    !suppCheck.open;

  const canShowAttachButtons = !loading && !!runId && canEditRun;

  const filteredCandidates = useMemo(() => {
    const q = String(attachSearch || "").trim().toLowerCase();
    const list = Array.isArray(candidates) ? candidates : [];
    if (!q) return list;

    return list.filter((c) => {
      const name = String(c?.name ?? "").toLowerCase();
      const num = String(c?.employeeNumber ?? "").toLowerCase();
      const email = String(c?.email ?? "").toLowerCase();
      return name.includes(q) || num.includes(q) || email.includes(q);
    });
  }, [candidates, attachSearch]);

  const visibleIds = useMemo(() => {
    return filteredCandidates.map((c) => String(c?.id ?? "").trim()).filter(Boolean);
  }, [filteredCandidates]);

  const selectedCount = useMemo(() => {
    return Object.keys(selectedIds).filter((k) => selectedIds[k]).length;
  }, [selectedIds]);

  return (
    <PageTemplate title="Payroll" currentSection="payroll">
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl bg-white/95 shadow-sm ring-1 ring-neutral-300 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-extrabold text-slate-900">{headline}</div>

                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                  style={{
                    backgroundColor: "rgba(15,60,133,0.12)",
                    color: "var(--wf-blue)",
                  }}
                >
                  {statusText}
                </span>

                <span
                  className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold"
                  style={{
                    backgroundColor: "rgba(148,163,184,0.14)",
                    borderColor: "#cbd5e1",
                    color: "#334155",
                  }}
                  title="Run type"
                >
                  {kindChip}
                </span>

                {!loading && hasAnyExceptions ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                    style={{
                      backgroundColor: hasBlockingExceptions ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                      color: hasBlockingExceptions ? "#991b1b" : "#92400e",
                      border: `1px solid ${hasBlockingExceptions ? "#fecaca" : "#fde68a"}`,
                    }}
                    title="Exceptions are checks you must review before approval"
                  >
                    Exceptions: {blockingCount} block, {warningCount} warn
                  </span>
                ) : null}

                {!loading && seededMode ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                    style={{
                      backgroundColor: "rgba(245,158,11,0.12)",
                      color: "#92400e",
                      border: "1px solid #fde68a",
                    }}
                    title="Seeded mode means calculations are incomplete"
                  >
                    Seeded mode
                  </span>
                ) : null}
              </div>

              {isSupplementary && hasParent ? (
                <div className="text-sm text-slate-700">
                  Parent run:{" "}
                  <Link
                    href={`/dashboard/payroll/${parentRunId}`}
                    className="font-extrabold underline"
                    style={{ color: "var(--wf-blue)" }}
                  >
                    Open parent run
                  </Link>
                </div>
              ) : null}

              <div className="flex flex-col gap-1 text-sm text-slate-700">
                <div>
                  <span className="font-semibold">Period:</span>{" "}
                  <span className={`${inter.className} font-extrabold`} style={{ color: "#059669" }}>
                    {periodText}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Pay date:</span>{" "}
                  <span className={`${inter.className} font-extrabold`} style={{ color: "var(--wf-blue)" }}>
                    {payDateText}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href="/dashboard/payroll"
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: "var(--wf-blue)" }}
              >
                Back to Runs
              </Link>

              {showCreateSupplementaryButton ? (
                <button
                  type="button"
                  onClick={createSupplementaryRun}
                  disabled={saving || !runId}
                  className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{
                    backgroundColor: "#334155",
                    opacity: saving || !runId ? 0.6 : 1,
                    cursor: saving || !runId ? "not-allowed" : "pointer",
                  }}
                  title="Create a supplementary run for this same pay period (no auto-attach)"
                >
                  {actionBusy === "supp" ? "Creating..." : "Create supplementary run"}
                </button>
              ) : null}

              {canShowAttachButtons && !isSupplementary ? (
                <button
                  type="button"
                  onClick={attachDueEmployees}
                  disabled={saving || !runId}
                  className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{
                    backgroundColor: "#334155",
                    opacity: saving || !runId ? 0.6 : 1,
                    cursor: saving || !runId ? "not-allowed" : "pointer",
                  }}
                  title="Attach all due employees for this run (auto attach, skips already attached)"
                >
                  {actionBusy === "attach" ? "Attaching..." : "Attach due employees"}
                </button>
              ) : null}

              {canShowAttachButtons && isSupplementary ? (
                <button
                  type="button"
                  onClick={openAttachModal}
                  disabled={saving || !runId}
                  className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{
                    backgroundColor: "#334155",
                    opacity: saving || !runId ? 0.6 : 1,
                    cursor: saving || !runId ? "not-allowed" : "pointer",
                  }}
                  title="Supplementary runs do not auto-attach. Pick the employees to include."
                >
                  Attach employees
                </button>
              ) : null}

              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: "#059669" }}
              >
                Export CSV
              </button>

              <button
                type="button"
                onClick={openExceptionsPanel}
                disabled={loading || !hasAnyExceptions}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: hasBlockingExceptions ? "#991b1b" : "#92400e",
                  opacity: loading || !hasAnyExceptions ? 0.6 : 1,
                  cursor: loading || !hasAnyExceptions ? "not-allowed" : "pointer",
                }}
                title={!hasAnyExceptions ? "No exceptions returned for this run" : "Jump to exceptions panel"}
              >
                Exceptions
              </button>

              <button
                type="button"
                onClick={recalculateRun}
                disabled={saving || loading || !runId}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{
                  backgroundColor: "var(--wf-blue)",
                  opacity: saving || loading || !runId ? 0.6 : 1,
                  cursor: saving || loading || !runId ? "not-allowed" : "pointer",
                }}
                title="Run calculation pipeline for this run"
              >
                {actionBusy === "recalc" ? "Calculating..." : "Run calculation"}
              </button>
            </div>
          </div>

          {approvedMsg ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{
                borderColor: "#10b981",
                backgroundColor: "rgba(16,185,129,0.12)",
                color: "#065f46",
              }}
            >
              {approvedMsg}
            </div>
          ) : null}

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {err}
            </div>
          ) : null}

          {seededMode ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{
                borderColor: "#f59e0b",
                backgroundColor: "rgba(245,158,11,0.12)",
                color: "#92400e",
              }}
            >
              Seeded mode. This run is not fully calculated yet. Approval is disabled until seededMode is false and there
              are no blocking exceptions.
            </div>
          ) : null}

          {hasBlockingExceptions ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{
                borderColor: "#fecaca",
                backgroundColor: "rgba(239,68,68,0.10)",
                color: "#991b1b",
              }}
            >
              Approval blocked. Blocking exceptions found: {blockingCount}. Review the Exceptions panel to fix them.
            </div>
          ) : null}

          {showDataMismatchNote ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              This run has totals but no employee rows were returned by the API. The run details still show correctly.
              Approve stays disabled until employees load.
            </div>
          ) : null}
        </div>

        <div
          ref={exceptionsAnchorRef}
          className="rounded-3xl bg-white/95 shadow-sm ring-1 ring-neutral-300 overflow-hidden"
        >
          <div className="px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <div className="text-base font-extrabold text-slate-900">Exceptions</div>
              <div className="text-sm text-slate-700">
                {loading ? "Loading..." : `${blockingCount} blocking, ${warningCount} warnings`}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExceptionsExpanded((v) => !v)}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
              style={{
                backgroundColor: hasBlockingExceptions ? "#991b1b" : "var(--wf-blue)",
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              title="Expand or collapse exceptions"
            >
              {exceptionsExpanded ? "Hide" : "Show"}
            </button>
          </div>

          {exceptionsExpanded ? (
            <div className="border-t border-neutral-200 px-5 py-4 flex flex-col gap-4">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-sm font-extrabold text-slate-900">How to use this</div>
                <div className="mt-1 text-sm text-slate-700">
                  Blocking items must be fixed before approval. Warnings are allowed, but you should review them.
                  Zero gross employees can be valid, for example tax rebates, so they stay as warnings.
                </div>
              </div>

              {!apiExceptionsKnown ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Exceptions were not returned by the API. Approval will stay disabled. Run calculation or reload.
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <div className="text-sm font-extrabold text-slate-900">Blocking</div>

                {groupedExceptions.blocks.length === 0 ? (
                  <div className="text-sm text-slate-700">No blocking exceptions.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {groupedExceptions.blocks.map((g: any, idx: number) => {
                      const chip = severityChip("block");
                      const codes = Array.isArray(g.codes) ? g.codes : [];
                      const gross = toNumberSafe(g.gross);

                      return (
                        <div key={`blk-${idx}`} className="rounded-2xl border border-neutral-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm font-extrabold text-slate-900">{g.name}</div>
                            <span
                              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold"
                              style={chip.style}
                            >
                              {chip.label}
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-slate-700">
                            Gross:{" "}
                            <span className={`${inter.className} font-extrabold`} style={{ color: "var(--wf-blue)" }}>
                              {gbp(gross)}
                            </span>
                          </div>

                          <div className="mt-1 text-xs font-semibold text-slate-700">
                            {codes.length ? `Codes: ${codes.join(", ")}` : "Codes: BLOCK"}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {g.employeeId ? (
                              <Link
                                href={`/dashboard/employees/${g.employeeId}/edit?focus=tax_ni`}
                                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                                style={{ backgroundColor: "#059669" }}
                              >
                                Fix on employee file
                              </Link>
                            ) : (
                              <span className="text-xs font-semibold text-slate-600">
                                Missing employee_id in exception payload.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-sm font-extrabold text-slate-900">Warnings</div>

                {groupedExceptions.warns.length === 0 ? (
                  <div className="text-sm text-slate-700">No warnings.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {groupedExceptions.warns.map((g: any, idx: number) => {
                      const chip = severityChip("warn");
                      const codes = Array.isArray(g.codes) ? g.codes : [];
                      const gross = toNumberSafe(g.gross);

                      return (
                        <div key={`wrn-${idx}`} className="rounded-2xl border border-neutral-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm font-extrabold text-slate-900">{g.name}</div>
                            <span
                              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold"
                              style={chip.style}
                            >
                              {chip.label}
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-slate-700">
                            Gross:{" "}
                            <span className={`${inter.className} font-extrabold`} style={{ color: "var(--wf-blue)" }}>
                              {gbp(gross)}
                            </span>
                          </div>

                          <div className="mt-1 text-xs font-semibold text-slate-700">
                            {codes.length ? `Codes: ${codes.join(", ")}` : "Codes: WARN"}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {g.employeeId ? (
                              <Link
                                href={`/dashboard/employees/${g.employeeId}/edit?focus=tax_ni`}
                                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                                style={{ backgroundColor: "var(--wf-blue)" }}
                              >
                                Open employee file
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!apiSeededKnown ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  seededMode was not returned by the API. Approval will stay disabled. Run calculation or reload.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile title="Employees" value={loading ? "..." : String(rows.length)} />
          <StatTile title="Total Gross" value={gbp(displayTotals.gross)} />
          <StatTile title="Total Deductions" value={gbp(displayTotals.deductions)} />
          <StatTile title="Total Net" value={gbp(displayTotals.net)} />
        </div>

        <div className="rounded-3xl bg-white/95 shadow-sm ring-1 ring-neutral-300 overflow-hidden">
          <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Employees in this run</h2>
            <div className="text-sm text-slate-700">Edit amounts, save, export CSV, or open a payslip.</div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="sticky left-0 z-10 bg-neutral-100 px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Number
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Calc
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Deductions
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Net
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                    Payslip
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 border-b border-neutral-200" colSpan={8}>
                      Loading...
                    </td>
                  </tr>
                ) : null}

                {!loading && rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 border-b border-neutral-200" colSpan={8}>
                      No employees attached to this run.
                    </td>
                  </tr>
                ) : null}

                {!loading &&
                  rows.map((r) => {
                    const rowError = validation?.[r.id];
                    const badge = calcBadgeStyles(r.calcMode);

                    return (
                      <tr key={r.id} className="bg-white">
                        <td className="sticky left-0 z-0 bg-white px-4 py-3 text-sm text-slate-900 border-b border-neutral-200">
                          {r.employeeName || MISSING}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          {r.employeeNumber || MISSING}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          {r.email || MISSING}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <span
                            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold"
                            style={badge}
                            title="Calculation state for this employee in this run"
                          >
                            {String(r.calcMode || "uncomputed")}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <input
                            className={`${inter.className} h-10 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm font-extrabold outline-none focus:ring-2 focus:ring-offset-1`}
                            style={{ color: "var(--wf-blue)" }}
                            type="number"
                            step="0.01"
                            value={Number.isFinite(r.gross) ? r.gross : 0}
                            onChange={(e) => onChangeCell(r.id, "gross", e.target.value)}
                          />
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <input
                            className={`${inter.className} h-10 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm font-extrabold outline-none focus:ring-2 focus:ring-offset-1`}
                            style={{ color: "var(--wf-blue)" }}
                            type="number"
                            step="0.01"
                            value={Number.isFinite(r.deductions) ? r.deductions : 0}
                            onChange={(e) => onChangeCell(r.id, "deductions", e.target.value)}
                          />
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <div className="flex flex-col gap-1">
                            <input
                              className={`${inter.className} h-10 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm font-extrabold outline-none focus:ring-2 focus:ring-offset-1`}
                              style={{ color: "var(--wf-blue)" }}
                              type="number"
                              step="0.01"
                              value={Number.isFinite(r.net) ? r.net : 0}
                              onChange={(e) => onChangeCell(r.id, "net", e.target.value)}
                            />
                            {rowError ? <div className="text-xs font-semibold text-red-700">{rowError}</div> : null}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                          <Link
                            href={`/dashboard/payroll/${runId}/payslip/${r.employeeId}`}
                            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                            style={{ backgroundColor: "var(--wf-blue)" }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 text-sm text-slate-700">
            Live totals reflect your edits. Net defaults to Gross minus Deductions. Approval is blocked until seededMode is
            false and there are no blocking exceptions.
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={saveChanges}
            disabled={!dirty || hasErrors || saving || rows.length === 0}
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition"
            style={{
              backgroundColor: !dirty || hasErrors || saving || rows.length === 0 ? "var(--wf-blue)" : "#059669",
              opacity: !dirty || hasErrors || saving || rows.length === 0 ? 0.6 : 1,
              cursor: !dirty || hasErrors || saving || rows.length === 0 ? "not-allowed" : "pointer",
            }}
            title={rows.length === 0 ? "No employee rows loaded for this run" : "Save employee row changes"}
          >
            {actionBusy === "save" ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={approveRun}
            disabled={!canApprove}
            title={approveDisabledReason || "Approve and queue FPS"}
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition"
            style={{
              backgroundColor: "#059669",
              opacity: !canApprove ? 0.6 : 1,
              cursor: !canApprove ? "not-allowed" : "pointer",
            }}
          >
            {actionBusy === "approve" ? "Working..." : "Approve run"}
          </button>
        </div>

        {attachOpen ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-xl ring-1 ring-neutral-300 overflow-hidden">
              <div className="px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200">
                <div className="flex flex-col">
                  <div className="text-base font-extrabold text-slate-900">Attach employees to supplementary run</div>
                  <div className="text-sm text-slate-700">
                    Pick the employees you want in this supplementary run. It will not auto-attach.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAttachModal}
                  disabled={attachLoading}
                  className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{
                    backgroundColor: "var(--wf-blue)",
                    opacity: attachLoading ? 0.6 : 1,
                    cursor: attachLoading ? "not-allowed" : "pointer",
                  }}
                >
                  Close
                </button>
              </div>

              <div className="px-5 py-4 flex flex-col gap-3">
                {attachErr ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {attachErr}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <input
                    value={attachSearch}
                    onChange={(e) => setAttachSearch(e.target.value)}
                    placeholder="Search name, number, email"
                    className="h-11 w-full sm:w-80 rounded-xl border border-slate-300 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-offset-1"
                  />

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => toggleAllVisible(true, visibleIds)}
                      disabled={attachLoading || visibleIds.length === 0}
                      className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                      style={{
                        backgroundColor: "#334155",
                        opacity: attachLoading || visibleIds.length === 0 ? 0.6 : 1,
                        cursor: attachLoading || visibleIds.length === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      Select visible
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleAllVisible(false, visibleIds)}
                      disabled={attachLoading || visibleIds.length === 0}
                      className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                      style={{
                        backgroundColor: "#64748b",
                        opacity: attachLoading || visibleIds.length === 0 ? 0.6 : 1,
                        cursor: attachLoading || visibleIds.length === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      Clear visible
                    </button>

                    <button
                      type="button"
                      onClick={attachSelected}
                      disabled={attachLoading || saving || selectedCount === 0}
                      className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-95"
                      style={{
                        backgroundColor: "#059669",
                        opacity: attachLoading || saving || selectedCount === 0 ? 0.6 : 1,
                        cursor: attachLoading || saving || selectedCount === 0 ? "not-allowed" : "pointer",
                      }}
                      title={selectedCount === 0 ? "Select at least one employee" : "Attach selected employees"}
                    >
                      {actionBusy === "attachSelected" ? "Attaching..." : `Attach selected (${selectedCount})`}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                  <div className="max-h-[52vh] overflow-y-auto">
                    {attachLoading ? (
                      <div className="px-4 py-4 text-sm text-slate-700">Loading...</div>
                    ) : filteredCandidates.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-slate-700">
                        No eligible employees found. This usually means everyone is already attached or no active employees match the run frequency.
                      </div>
                    ) : (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-neutral-100">
                            <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                              Pick
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                              Employee
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                              Number
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-extrabold text-slate-900 border-b border-neutral-300">
                              Email
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCandidates.map((c) => {
                            const id = String(c?.id ?? "").trim();
                            const checked = Boolean(selectedIds[id]);

                            return (
                              <tr key={id} className="bg-white">
                                <td className="px-4 py-3 border-b border-neutral-200">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      setSelectedIds((prev) => ({ ...prev, [id]: Boolean(e.target.checked) }))
                                    }
                                    className="h-5 w-5"
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-900 border-b border-neutral-200">
                                  {String(c?.name ?? MISSING)}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                                  {String(c?.employeeNumber ?? "") || MISSING}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700 border-b border-neutral-200">
                                  {String(c?.email ?? "") || MISSING}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-600">
                  Only active employees with matching pay frequency are listed. Already attached employees are excluded.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageTemplate>
  );
}
