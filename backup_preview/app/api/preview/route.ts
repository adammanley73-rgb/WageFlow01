/* @ts-nocheck */
import { NextResponse } from "next/server";

// Literal map instead of dynamic require
const modules: Record<string, any> = {
  payroll: { message: "Payroll API stub active" },
  employees: { message: "Employees API stub active" },
  settings: { message: "Settings API stub active" },
  absence: { message: "Absence API stub active" }
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    available: Object.keys(modules),
    profile: process.env.BUILD_PROFILE || "dev"
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { module } = body || {};
    if (!module || !modules[module]) {
      return NextResponse.json({ ok: false, error: "Unknown module" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: modules[module] });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

