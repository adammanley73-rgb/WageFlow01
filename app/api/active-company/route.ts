// C:\Users\adamm\Projects\wageflow01\app\api\active-company\route.ts
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

type Company = {
  id: string;
  name: string;
  created_at?: string;
};

function getBaseUrl(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.VERCEL_URL ??
    "localhost:3000";

  const normalizedHost = host.startsWith("http") ? host : `${proto}://${host}`;
  return normalizedHost.replace(/\/$/, "");
}

function buildCookieHeader(): string {
  const jar = cookies();
  const all = jar.getAll();
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function loadCompanies(): Promise<Company[]> {
  try {
    const baseUrl = getBaseUrl();

    const res = await fetch(`${baseUrl}/api/companies`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: buildCookieHeader(),
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.companies)) return data.companies;

    return [];
  } catch {
    return [];
  }
}

// Response:
// - 204 No Content if no active company cookie exists
// - 200 { id, name } if cookie exists (name may be null if not found in list)
export async function GET(_req: Request) {
  const jar = cookies();

  const id =
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    "";

  if (!id) {
    return new NextResponse(null, { status: 204 });
  }

  const companies = await loadCompanies();
  const match = companies.find((c) => c.id === id);

  return NextResponse.json(
    { id, name: match?.name ?? null },
    { status: 200 }
  );
}
