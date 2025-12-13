// app/api/active-company/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Returns the currently selected company from cookies set by /api/select-company.
// Response: { id: string, name: string | null } or 404 if no active company cookie exists.
export async function GET(_req: Request) {
  const jar = cookies();

  // Prefer explicit active_company_* cookie names, fall back to generic ones if present.
  const id =
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    "";

  const name =
    jar.get("active_company_name")?.value ??
    jar.get("company_name")?.value ??
    null;

  if (!id) {
    return NextResponse.json(
      { error: "No active company selected" },
      { status: 404 }
    );
  }

  return NextResponse.json({ id, name }, { status: 200 });
}
