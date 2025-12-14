/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\check-overlap\route.ts

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured")
  }

  return createClient(url, serviceKey)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employee_id")
    const firstDay = searchParams.get("first_day")

    // Not enough info to check
    if (!employeeId || !firstDay) {
      return NextResponse.json({
        ok: true,
        code: "NO_CHECK",
        message: "Not enough information to check overlaps.",
      })
    }

    const cookieStore = cookies()
    const companyId =
      cookieStore.get("active_company_id")?.value ||
      cookieStore.get("company_id")?.value ||
      null

    if (!companyId) {
      return NextResponse.json({
        ok: true,
        code: "NO_COMPANY",
        message: "No active company selected.",
      })
    }

    const supabase = getSupabaseClient()

    const { data: rows, error } = await supabase
      .from("absences")
      .select("id, first_day, last_day_expected, last_day_actual")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)

    if (error) {
      console.error("Overlap check DB error:", error)
      return NextResponse.json({
        ok: true,
        code: "DB_ERROR",
        message: "Could not check overlaps.",
      })
    }

    const newStart = firstDay

    const conflicts =
      rows?.map((row) => {
        const end =
          row.last_day_actual ||
          row.last_day_expected ||
          row.first_day

        const overlaps =
          newStart >= row.first_day && newStart <= end

        if (!overlaps) return null

        return {
          id: row.id,
          startDate: row.first_day,
          endDate: end,
        }
      }).filter(Boolean) || []

    if (conflicts.length > 0) {
      return NextResponse.json({
        ok: false,
        code: "ABSENCE_DATE_OVERLAP",
        message: "This absence would overlap another existing absence.",
        conflicts,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Overlap check unexpected error:", err)
    return NextResponse.json({
      ok: true,
      code: "UNEXPECTED_ERROR",
      message: "Could not check overlaps.",
    })
  }
}
