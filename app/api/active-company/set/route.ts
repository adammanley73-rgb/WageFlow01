// C:\Projects\wageflow01\app\api\active-company\set\route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const raw = body?.companyId ?? body?.company_id ?? body?.id ?? null;
    const companyId = typeof raw === "string" ? raw.trim() : "";

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
    }

    if (!isUuid(companyId)) {
      return NextResponse.json({ ok: false, error: "Invalid companyId. Choose a company from the list." }, { status: 400 });
    }

    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("vw_member_companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();

    if (error) {
      console.error("active-company/set membership check failed:", error.message);
      return NextResponse.json({ ok: false, error: "Could not confirm company access" }, { status: 500 });
    }

    if (!data?.id) {
      return NextResponse.json({ ok: false, error: "Company is not available to this account" }, { status: 403 });
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });

    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    };

    res.cookies.set("active_company_id", companyId, cookieOptions);
    res.cookies.set("company_id", companyId, cookieOptions);

    return res;
  } catch (e) {
    console.error("active-company/set POST error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
