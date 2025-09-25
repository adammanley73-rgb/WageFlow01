/* @ts-nocheck */
import { NextResponse } from "next/server";
type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "Missing payroll run id" }, { status: 400 });

    const csv = "employee_id,status\n";
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payroll_${id}.csv"`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}

