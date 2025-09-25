/* @ts-nocheck */
import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";

export async function GET() {
  try {
    const admin = await getAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Admin client not available" }, { status: 503 });

    const { client, companyId } = admin;
    const { data, error } = await client.from("pay_runs").select("*").eq("company_id", companyId);

    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}

