/* app/api/companies/route.ts */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("companies")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      // Return a proper 500 so CI and Vercel don’t silently “succeed”
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch companies" },
      { status: 500 }
    );
  }
}
