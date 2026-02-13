/* @ts-nocheck */
/* E:\Projects\wageflow01\app\api\pay\runs\[id]\employees\route.ts */

import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";

type RouteContext = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const admin = await getAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Admin client not available" }, { status: 503 });

    const { client, companyId } = admin;
    if (!params?.id) return NextResponse.json({ ok: false, error: "Missing run id" }, { status: 400 });

    const { data, error } = await client
      .from("payroll_run_employees")
      .select("id, employee_id, calc_mode")
      .eq("run_id", params.id)
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });

    const items = (data ?? []).map((r: any) => ({
      id: r.id,
      employee_id: r.employee_id,
      status: r.calc_mode ?? "uncomputed", // keep legacy response shape
    }));

    return NextResponse.json({ ok: true, runId: params.id, items });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}
