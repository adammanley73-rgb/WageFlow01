/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\sickness\route.ts

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

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const employeeId = body?.employee_id
    const firstDay = body?.first_day
    const lastDayExpected = body?.last_day_expected || null
    const lastDayActual = body?.last_day_actual || null
    const referenceNotes = body?.reference_notes || null

    if (!employeeId || !firstDay || !lastDayExpected) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message:
            "Employee, first day and expected last day are required.",
        },
        { status: 400 }
      )
    }

    if (lastDayExpected < firstDay) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message:
            "Expected last day cannot be earlier than the first day.",
        },
        { status: 400 }
      )
    }

    if (lastDayActual && lastDayActual < firstDay) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message:
            "Actual last day cannot be earlier than the first day.",
        },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const companyId =
      cookieStore.get("active_company_id")?.value ||
      cookieStore.get("company_id")?.value ||
      null

    if (!companyId) {
      return NextResponse.json(
        {
          ok: false,
          code: "NO_COMPANY",
          message: "No active company selected.",
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Check overlap against existing absences for this employee
    const { data: rows, error: rowsError } = await supabase
      .from("absences")
      .select("id, first_day, last_day_expected, last_day_actual")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)

    if (rowsError) {
      console.error("Sickness create overlap DB error:", rowsError)
      return NextResponse.json(
        {
          ok: false,
          code: "DB_ERROR",
          message: "Could not check existing absences.",
        },
        { status: 500 }
      )
    }

    const newStart = firstDay
    const newEnd =
      lastDayActual || lastDayExpected || firstDay

    const conflicts =
      rows?.map((row) => {
        const start = row.first_day
        const end =
          row.last_day_actual ||
          row.last_day_expected ||
          row.first_day

        const overlaps =
          newStart <= end && newEnd >= start

        if (!overlaps) return null

        return {
          id: row.id,
          startDate: start,
          endDate: end,
        }
      }).filter(Boolean) || []

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "ABSENCE_DATE_OVERLAP",
          message:
            "These dates would overlap another existing absence.",
          conflicts,
        },
        { status: 409 }
      )
    }

    const insertPayload = {
      company_id: companyId,
      employee_id: employeeId,
      type: "sickness",
      first_day: firstDay,
      last_day_expected: lastDayExpected,
      last_day_actual: lastDayActual,
      reference_notes: referenceNotes,
    }

    const { error: insertError } = await supabase
      .from("absences")
      .insert(insertPayload)

    if (insertError) {
      console.error("Insert sickness absence error:", insertError)
      return NextResponse.json(
        {
          ok: false,
          code: "DB_ERROR",
          message:
            "Could not create sickness absence. Please try again.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Unexpected error creating sickness absence:", err)
    return NextResponse.json(
      {
        ok: false,
        code: "UNEXPECTED_ERROR",
        message:
          "Unexpected error while saving this sickness absence.",
      },
      { status: 500 }
    )
  }
}
