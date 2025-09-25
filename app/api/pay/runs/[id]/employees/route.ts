/* @ts-nocheck */
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
      .from("pay_run_employees")
      .select("id, employee_id, status")
      .eq("run_id", params.id)
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
    return NextResponse.json({ ok: true, runId: params.id, items: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}

