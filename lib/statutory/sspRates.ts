// C:\Users\adamm\Projects\wageflow01\lib\statutory\sspRates.ts
// SSP rates + settings resolved from Compliance Packs by date.
// Default behaviour (no date) remains supported for legacy callers,
// but all new SSP wiring should pass a date.

export type IsoDate = `${number}-${number}-${number}`;

type CompliancePack = {
  id: string;
  tax_year: string;
  effective_from: string;
  effective_to: string;
  status: string;
  config: any;
};

type ResolvedSspConfig = {
  weeklyFlat: number;
  payableFromDay: number; // 1 for reform, 4 for legacy
  waitingDays: number; // 0 for reform, 3 for legacy
  requiresLel: boolean; // false for reform, true for legacy
  lowEarnerPercentCapEnabled: boolean; // true for reform, false for legacy
  lowEarnerPercent: number | null; // 0.80 for reform
};

function isoToday(): IsoDate {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as IsoDate;
}

function assertIsoDate(value: string): asserts value is IsoDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ISO date: ${value}. Expected YYYY-MM-DD`);
  }
}

// In a server context we can call the internal API endpoint that already
// enforces auth and resolves the correct pack by payDate.
// This keeps all pack logic in one place.
async function fetchCompliancePackForDate(onDate: IsoDate): Promise<CompliancePack> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL?.startsWith("http")
      ? process.env.VERCEL_URL
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "";

  // Local dev: no NEXT_PUBLIC_SITE_URL set, just call relative.
  const url = base
    ? `${base}/api/compliance/pack?payDate=${encodeURIComponent(onDate)}`
    : `/api/compliance/pack?payDate=${encodeURIComponent(onDate)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    // Ensure we do not cache across requests. You want fresh policy every run.
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch compliance pack (${res.status}): ${text}`);
  }

  const json = await res.json();
  if (!json?.ok || !json?.pack) {
    throw new Error(`Compliance pack response malformed: ${JSON.stringify(json)}`);
  }

  return json.pack as CompliancePack;
}

function resolveSspConfigFromPack(pack: CompliancePack): ResolvedSspConfig {
  const cfg = pack?.config ?? {};
  const ssp = cfg?.ssp ?? {};
  const rates = cfg?.rates ?? {};

  const weeklyFlat = Number(rates?.ssp_weekly_flat);
  if (!Number.isFinite(weeklyFlat) || weeklyFlat <= 0) {
    throw new Error(`Invalid SSP weekly flat rate in pack ${pack.tax_year}`);
  }

  const payableFromDay = Number(ssp?.payable_from_day);
  const waitingDays = Number(ssp?.waiting_days);

  const requiresLel = Boolean(ssp?.requires_lel);
  const lowEarnerPercentCapEnabled = Boolean(ssp?.low_earner_percent_cap_enabled);

  const lowEarnerPercentRaw = ssp?.low_earner_percent;
  const lowEarnerPercent =
    lowEarnerPercentRaw === null || lowEarnerPercentRaw === undefined
      ? null
      : Number(lowEarnerPercentRaw);

  if (!Number.isFinite(payableFromDay) || payableFromDay < 1 || payableFromDay > 7) {
    throw new Error(`Invalid SSP payable_from_day in pack ${pack.tax_year}`);
  }

  if (!Number.isFinite(waitingDays) || waitingDays < 0 || waitingDays > 7) {
    throw new Error(`Invalid SSP waiting_days in pack ${pack.tax_year}`);
  }

  if (lowEarnerPercentCapEnabled) {
    if (!Number.isFinite(lowEarnerPercent as number) || (lowEarnerPercent as number) <= 0 || (lowEarnerPercent as number) > 1) {
      throw new Error(`Invalid SSP low_earner_percent in pack ${pack.tax_year}`);
    }
  }

  return {
    weeklyFlat,
    payableFromDay,
    waitingDays,
    requiresLel,
    lowEarnerPercentCapEnabled,
    lowEarnerPercent,
  };
}

// ---------- Public API ----------

/**
 * Legacy default: returns weekly SSP flat rate for today.
 * New code should call getSspWeeklyRateForDate("YYYY-MM-DD").
 */
export function getSspWeeklyRate(): number {
  return getSspWeeklyRateForDateSync(isoToday());
}

/**
 * Legacy default: returns daily SSP flat rate for today, assuming 5 qualifying days/week.
 * New code should call getSspDailyRateForDate("YYYY-MM-DD", qualifyingDaysPerWeek).
 */
export function getSspDailyRate(): number {
  return getSspDailyRateForDateSync(isoToday(), 5);
}

/**
 * Async: resolve SSP config for a given date using compliance pack.
 */
export async function getSspConfigForDate(onDate: IsoDate): Promise<ResolvedSspConfig> {
  const pack = await fetchCompliancePackForDate(onDate);
  return resolveSspConfigFromPack(pack);
}

/**
 * Async: weekly SSP flat rate for date.
 */
export async function getSspWeeklyRateForDate(onDate: IsoDate): Promise<number> {
  const cfg = await getSspConfigForDate(onDate);
  return cfg.weeklyFlat;
}

/**
 * Async: daily SSP flat rate for date.
 * daily = weekly / qualifyingDaysPerWeek
 */
export async function getSspDailyRateForDate(onDate: IsoDate, qualifyingDaysPerWeek: number): Promise<number> {
  if (!Number.isFinite(qualifyingDaysPerWeek) || qualifyingDaysPerWeek <= 0 || qualifyingDaysPerWeek > 7) {
    throw new Error("Invalid qualifyingDaysPerWeek. Must be 1..7");
  }
  const weekly = await getSspWeeklyRateForDate(onDate);
  return Number((weekly / qualifyingDaysPerWeek).toFixed(2));
}

// ---------- Sync helpers (for legacy callers) ----------
// These keep existing routes working while we migrate them to async pack-aware calls.
// They assume the server has already cached packs at runtime via the API route.
// If fetch fails, they throw with a clear message.

function getSspWeeklyRateForDateSync(onDate: IsoDate): number {
  // IMPORTANT:
  // We cannot synchronously fetch. For legacy callers, we do the next best thing:
  // use an environment default, but ONLY if explicitly provided.
  // This prevents silent wrong payments.
  const fallback = process.env.WAGEFLOW_SSP_WEEKLY_FALLBACK;
  if (fallback) {
    const v = Number(fallback);
    if (Number.isFinite(v) && v > 0) return v;
  }
  throw new Error(
    `SSP weekly rate requested synchronously for ${onDate}. ` +
      `Migrate caller to async getSspWeeklyRateForDate() or set WAGEFLOW_SSP_WEEKLY_FALLBACK temporarily.`
  );
}

function getSspDailyRateForDateSync(onDate: IsoDate, qualifyingDaysPerWeek: number): number {
  const weekly = getSspWeeklyRateForDateSync(onDate);
  return Number((weekly / qualifyingDaysPerWeek).toFixed(2));
}
