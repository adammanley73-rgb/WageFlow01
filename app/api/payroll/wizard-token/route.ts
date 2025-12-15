// C:\Users\adamm\Projects\wageflow01\app\api\payroll\wizard-token\route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const res = NextResponse.json(
    { ok: true, token, expiresInSeconds: 600, purpose: "payroll_run_create" },
    { status: 200 }
  );

  // Short-lived guardrail cookie. Not a security boundary. A friction boundary.
  res.cookies.set("wf_payroll_run_wizard", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });

  return res;
}
