import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Placeholder API route used by the Reports page.
 * Replace with real logic when you wire it to data.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      environment: process.env.NODE_ENV ?? "development",
    },
    { status: 200 }
  );
}
