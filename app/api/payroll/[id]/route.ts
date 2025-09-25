/* @ts-nocheck */
import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";
type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const admin = await getAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Admin client not available" }, { status: 503 });

    const { client, companyId } = admin;
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "Missing payroll run id" }, { status: 400 });

    const { data: run, error: runErr } = await client
      .from("payroll_runs")
      .select("id, run_number, frequency, period_start, period_end")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (runErr) return NextResponse.json({ ok: false, error: runErr }, { status: 500 });

    return NextResponse.json({
      ok: true,
      run: run ?? { id, run_number: "PREVIEW", frequency: "monthly", period_start: null, period_end: null },
      employees: [],
      totals: { gross: 0, tax: 0, ni: 0, net: 0 }
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}

