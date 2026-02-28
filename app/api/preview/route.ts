// C:\Projects\wageflow01\app\api\preview\route.ts

import { NextResponse } from "next/server";

/**
 * Preview endpoint: accepts any payload from the preview form and
 * returns a stable stub calculation so the UI never blows up.
 * No dynamic require. No module allow-list.
 */

export const runtime = "nodejs";

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toString(value: unknown, fallback = ""): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.trim() || fallback;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Preview API alive",
    profile: process.env.BUILD_PROFILE || "dev",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const gross = toNumber(body.gross ?? body.amount, 0);
    const code = toString(body.code ?? body.taxCode, "1257L");
    const period = toString(body.period, "monthly");
    const studentLoan = toNumber(body.studentLoan, 0);
    const postgraduateLoan = toNumber(body.postgradLoan, 0);

    const result = {
      inputs: { gross, code, period, studentLoan, postgraduateLoan },
      tax: 0,
      ni: 0,
      loan: 0,
      net: gross,
    };

    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}