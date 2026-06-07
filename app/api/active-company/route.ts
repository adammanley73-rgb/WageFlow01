// C:\Projects\wageflow01\app\api\active-company\route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Company = {
  id: string;
  name: string | null;
  created_at?: string;
};

type CookieResponse = ReturnType<typeof NextResponse.json>;

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}

function clearCompanyCookies(res: CookieResponse) {
  res.cookies.set("active_company_id", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  res.cookies.set("company_id", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

async function buildCookieHeader(): Promise<string> {
  const jar = await cookies();
  const all = jar.getAll();
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function loadCompanies(origin: string): Promise<Company[]> {
  try {
    const res = await fetch(`${origin}/api/companies`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: await buildCookieHeader(),
      },
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => null as any);

    if (Array.isArray(data)) return data as Company[];
    if (data && Array.isArray(data.companies)) return data.companies as Company[];
    if (data && Array.isArray(data?.data)) return data.data as Company[];

    return [];
  } catch {
    return [];
  }
}

// Response:
// - 204 No Content if no active company cookie exists.
// - 200 { ok:true, id, name, company:{id,name} } if the active company is valid and visible.
// - 400 clears stale cookies if the active company cookie is invalid.
// - 404 if the active company cookie points to a company no longer visible to this account.
export async function GET(req: Request) {
  const jar = await cookies();

  const id =
    jar.get("active_company_id")?.value ??
    jar.get("company_id")?.value ??
    "";

  const companyId = String(id || "").trim();

  if (!companyId) {
    return new NextResponse(null, { status: 204 });
  }

  if (!isUuid(companyId)) {
    const res = NextResponse.json(
      {
        ok: false,
        code: "INVALID_COMPANY_COOKIE",
        error: "The saved company selection is invalid. Choose a company again.",
      },
      { status: 400 }
    );

    clearCompanyCookies(res);
    return res;
  }

  const origin = new URL(req.url).origin;
  const companies = await loadCompanies(origin);
  const match = companies.find((c) => String(c.id) === companyId);

  if (!match) {
    return NextResponse.json(
      {
        ok: false,
        code: "ACTIVE_COMPANY_NOT_AVAILABLE",
        id: companyId,
        error:
          "The saved active company could not be loaded for this account. Choose the company again, or sign out and sign back in if the list is empty.",
      },
      { status: 404 }
    );
  }

  const name = match.name || "Unnamed company";

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
