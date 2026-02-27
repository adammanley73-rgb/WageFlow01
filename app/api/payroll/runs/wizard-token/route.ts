// C:\Users\adamm\Projects\wageflow01\app\api\payroll\runs\wizard-token\route.ts

import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminContext = {
  companyId?: string | null;
};

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message ?? "Unexpected error");
  }
  return "Unexpected error";
}

function createToken(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function GET() {
  try {
    const admin = (await getAdmin()) as unknown as AdminContext | null;

    if (!admin) {
      return NextResponse.json({ ok: false, error: "Admin client not available" }, { status: 503 });
    }

    const companyId = String(admin.companyId ?? "").trim();

    if (!companyId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Active company not set. Expected active_company_id or company_id cookie.",
        },
        { status: 400 }
      );
    }

    const token = createToken();

    const res = NextResponse.json(
      { ok: true, wizardToken: token },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );

    res.cookies.set("wf_payroll_run_wizard", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
    });

    return res;
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}