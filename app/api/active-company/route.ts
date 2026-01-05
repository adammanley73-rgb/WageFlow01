// C:\Users\adamm\Projects\wageflow01\app\api\active-company\route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Company = {
  id: string;
  name: string | null;
  created_at?: string;
};

function buildCookieHeader(): string {
  const jar = cookies();
  const all = jar.getAll();
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function loadCompanies(origin: string): Promise<Company[]> {
  try {
    const res = await fetch(`${origin}/api/companies`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: buildCookieHeader(),
      },
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => (null as any));

    if (Array.isArray(data)) return data as Company[];
    if (data && Array.isArray(data.companies)) return data.companies as Company[];
    if (data && Array.isArray(data?.data)) return data.data as Company[];

    return [];
  } catch {
    return [];
  }
}

// Response:
// - 204 No Content if no active company cookie exists
// - 200 { ok:true, id, name, company:{id,name} }
export async function GET(req: Request) {
  const jar = cookies();

  const id =
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    "";

  const companyId = String(id || "").trim();

  if (!companyId) {
    return new NextResponse(null, { status: 204 });
  }

  const origin = new URL(req.url).origin;

  const companies = await loadCompanies(origin);
  const match = companies.find((c) => String(c.id) === companyId);

  const name = match?.name ?? "(name unavailable)";

  return NextResponse.json(
    {
      ok: true,
      id: companyId,
      name,
      company: { id: companyId, name },
    },
    { status: 200 }
  );
}
