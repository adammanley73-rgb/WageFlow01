/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\check-overlap\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabaseUrl(): string {
return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getSupabaseKey(): string {
return (
process.env.SUPABASE_SERVICE_ROLE_KEY ||
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
""
);
}

function readChunkedCookieValue(
all: { name: string; value: string }[],
baseName: string
): string | null {
const exact = all.find((c) => c.name === baseName);
if (exact) return exact.value;

const parts = all
.filter((c) => c.name.startsWith(baseName + "."))
.map((c) => {
const m = c.name.match(/.(\d+)$/);
const idx = m ? Number(m[1]) : 0;
return { idx, value: c.value };
})
.sort((a, b) => a.idx - b.idx);

if (parts.length === 0) return null;
return parts.map((p) => p.value).join("");
}

function extractAccessTokenFromCookies(): string | null {
try {
const jar = cookies();
const all = jar.getAll();

const bases = new Set<string>();

for (const c of all) {
  const n = c.name;
  if (!n.includes("auth-token")) continue;
  if (!n.startsWith("sb-") && !n.includes("sb-")) continue;
  bases.add(n.replace(/\.\d+$/, ""));
}

for (const base of bases) {
  const raw = readChunkedCookieValue(all as any, base);
  if (!raw) continue;

  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  try {
    const obj = JSON.parse(decoded);
    if (obj && typeof obj.access_token === "string") return obj.access_token;
  } catch {}

  try {
    const asJson = Buffer.from(decoded, "base64").toString("utf8");
    const obj = JSON.parse(asJson);
    if (obj && typeof obj.access_token === "string") return obj.access_token;
  } catch {}
}

return null;


} catch {
return null;
}
}

function createSupabaseRequestClient() {
const url = getSupabaseUrl();
const key = getSupabaseKey();

if (!url || !key) {
throw new Error("Supabase env is missing (URL or key)");
}

const accessToken = extractAccessTokenFromCookies();

const opts: any = {
auth: { persistSession: false, autoRefreshToken: false },
};

if (accessToken) {
opts.global = { headers: { Authorization: "Bearer " + accessToken } };
}

return createClient(url, key, opts);
}

export async function GET(request: any) {
try {
const searchParams = request?.nextUrl?.searchParams;

if (!searchParams) {
  return NextResponse.json({
    ok: true,
    code: "NO_CHECK",
    message: "Not enough information to check overlaps.",
  });
}

const employeeId = searchParams.get("employee_id");
const firstDay = searchParams.get("first_day");

if (!employeeId || !firstDay) {
  return NextResponse.json({
    ok: true,
    code: "NO_CHECK",
    message: "Not enough information to check overlaps.",
  });
}

const cookieStore = cookies();
const companyId =
  cookieStore.get("active_company_id")?.value ||
  cookieStore.get("company_id")?.value ||
  null;

if (!companyId) {
  return NextResponse.json({
    ok: true,
    code: "NO_COMPANY",
    message: "No active company selected.",
  });
}

const supabase = createSupabaseRequestClient();

const { data: rows, error } = await supabase
  .from("absences")
  .select("id, first_day, last_day_expected, last_day_actual")
  .eq("company_id", companyId)
  .eq("employee_id", employeeId);

if (error) {
  console.error("Overlap check DB error:", error);
  return NextResponse.json({
    ok: true,
    code: "DB_ERROR",
    message: "Could not check overlaps.",
  });
}

const newStart = firstDay;

const conflicts =
  rows
    ?.map((row: any) => {
      const end =
        row.last_day_actual || row.last_day_expected || row.first_day;

      const overlaps = newStart >= row.first_day && newStart <= end;
      if (!overlaps) return null;

      return {
        id: row.id,
        startDate: row.first_day,
        endDate: end,
      };
    })
    .filter(Boolean) || [];

if (conflicts.length > 0) {
  return NextResponse.json({
    ok: false,
    code: "ABSENCE_DATE_OVERLAP",
    message: "This absence would overlap another existing absence.",
    conflicts,
  });
}

return NextResponse.json({ ok: true });


} catch (err) {
console.error("Overlap check unexpected error:", err);
return NextResponse.json({
ok: true,
code: "UNEXPECTED_ERROR",
message: "Could not check overlaps.",
});
}
}