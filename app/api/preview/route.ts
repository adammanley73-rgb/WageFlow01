/* @ts-nocheck */
import { NextResponse } from "next/server";

/**
 * Preview endpoint: accepts any payload from the preview form and
 * returns a stable stub calculation so the UI never blows up.
 * No dynamic require. No module allow-list.
 */

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Preview API alive",
    profile: process.env.BUILD_PROFILE || "dev"
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // Extract typical preview inputs if present
    const gross = Number(body?.gross ?? body?.amount ?? 0);
    const code = String(body?.code ?? body?.taxCode ?? "1257L");
    const period = String(body?.period ?? "monthly");
    const studentLoan = Number(body?.studentLoan ?? 0);
    const postgraduateLoan = Number(body?.postgradLoan ?? 0);

    // Minimal deterministic stub so UI can render something
    const result = {
      inputs: { gross, code, period, studentLoan, postgraduateLoan },
      // fixed zeros keep preview stable; swap with real calc later
      tax: 0,
      ni: 0,
      loan: 0,
      net: gross
    };

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
}
