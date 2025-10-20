// /app/api/companies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/companies
export async function GET(_req: NextRequest) {
  try {
    // Adjust the select if your table has different columns
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase companies error:", error.message);
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected /api/companies error:", err?.message);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

// Optionally add POST later if you want to create new companies
