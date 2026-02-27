// C:\Projects\wageflow01\app\api\employees\[id]\delete\route.ts

import { NextResponse } from "next/server";
import { env } from "@lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, _ctx: RouteContext) {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: "employees/delete disabled on preview" }, { status: 404 });
  }

  return NextResponse.json({ ok: false, error: "not implemented" }, { status: 501 });
}