/* @ts-nocheck */
import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  try {
    const admin = await getAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Admin client not available" }, { status: 503 });

    const { client, companyId } = admin;
    if (!params?.id) return NextResponse.json({ ok: false, error: "Missing run id" }, { status: 400 });

    const { data: run, error: runErr } = await client
      .from("payroll_runs")
      .select("id, run_number, frequency, period_start, period_end")
      .eq("id", params.id)
      .eq("company_id", companyId)
      .single();

    if (runErr) return NextResponse.json({ ok: false, error: runErr }, { status: 500 });
    return NextResponse.json({ ok: true, run });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}

