// C:\Users\adamm\Projects\wageflow01\lib\formatUkDate.ts

function isUkDate(s: string) {
  return /^\d{2}-\d{2}-\d{4}$/.test(s);
}

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isoDateOnlyToUk(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
}

function safeParseDate(input: string) {
  const dt = new Date(input);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatUkDate(
  input: string | null | undefined,
  fallback: string = "—"
): string {
  if (input === null || input === undefined) return fallback;

  const s = String(input).trim();
  if (!s) return fallback;

  // Already UK format.
  if (isUkDate(s)) return s;

  // Date-only strings from DB. Avoid UTC day shift by not using new Date("YYYY-MM-DD").
  if (isIsoDateOnly(s)) return isoDateOnlyToUk(s);

  // Timestamps. Format in Europe/London for consistent UK display.
  const dt = safeParseDate(s);
  if (!dt) return s;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(dt);

  const dd = parts.find((p) => p.type === "day")?.value ?? "";
  const mm = parts.find((p) => p.type === "month")?.value ?? "";
  const yyyy = parts.find((p) => p.type === "year")?.value ?? "";

  if (!dd || !mm || !yyyy) return s;
  return `${dd}-${mm}-${yyyy}`;
}

export function formatUkDateTime(
  input: string | null | undefined,
  fallback: string = "—",
  withSeconds: boolean = false
): string {
  if (input === null || input === undefined) return fallback;

  const s = String(input).trim();
  if (!s) return fallback;

  // If it's date-only or already dd-mm-yyyy, date-time adds no value.
  if (isUkDate(s) || isIsoDateOnly(s)) return formatUkDate(s, fallback);

  const dt = safeParseDate(s);
  if (!dt) return s;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).formatToParts(dt);

  const dd = parts.find((p) => p.type === "day")?.value ?? "";
  const mm = parts.find((p) => p.type === "month")?.value ?? "";
  const yyyy = parts.find((p) => p.type === "year")?.value ?? "";
  const hh = parts.find((p) => p.type === "hour")?.value ?? "";
  const min = parts.find((p) => p.type === "minute")?.value ?? "";
  const ss = withSeconds ? parts.find((p) => p.type === "second")?.value ?? "" : "";

  if (!dd || !mm || !yyyy) return s;

  if (!hh || !min) {
    return `${dd}-${mm}-${yyyy}`;
  }

  return withSeconds && ss
    ? `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`
    : `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}
