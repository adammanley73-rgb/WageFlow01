/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\payroll\runs\wizard-token\route.ts

import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Admin client not available" },
        { status: 503 }
      );
    }

    const { companyId } = admin;

    if (!companyId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Active company not set. Expected active_company_id or company_id cookie.",
        },
        { status: 400 }
      );
    }

    const token =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(16).slice(2);

    const res = NextResponse.json(
      { ok: true, wizardToken: token },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    res.cookies.set("wf_payroll_run_wizard", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
