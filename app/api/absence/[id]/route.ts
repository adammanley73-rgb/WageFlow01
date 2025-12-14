/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\[id]\route.ts

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

function getCompanyIdFromCookies() {
  const cookieStore = cookies()
  return (
    cookieStore.get("active_company_id")?.value ||
    cookieStore.get("company_id")?.value ||
    null
  )
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const id = context?.params?.id

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_ID",
          message: "Absence id is required.",
        },
        { status: 400 }
      )
    }

    const companyId = getCompanyIdFromCookies()
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

    const { data: absence, error } = await supabase
      .from("absences")
      .select(
        "id, company_id, employee_id, type, first_day, last_day_expected, last_day_actual, reference_notes, status"
      )
      .eq("company_id", companyId)
      .eq("id", id)
      .single()

    if (error || !absence) {
      console.error("Load absence error:", error)
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: "Absence not found.",
        },
        { status: 404 }
      )
    }

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("first_name, last_name, employee_number")
      .eq("company_id", companyId)
      .eq("id", absence.employee_id)
      .limit(1)
      .single()

    if (empError) {
      console.warn(
        "Could not load employee for absence:",
        empError
      )
    }

    let employeeLabel = "Employee"
    if (employee) {
      const name =
        [employee.first_name, employee.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || "Employee"
      const number = employee.employee_number || ""
      employeeLabel = number ? `${name} (${number})` : name
    }

    return NextResponse.json({
      ok: true,
      absence: {
        id: absence.id,
        employeeId: absence.employee_id,
        employeeLabel,
        type: absence.type,
        firstDay: absence.first_day,
        lastDayExpected: absence.last_day_expected,
        lastDayActual: absence.last_day_actual,
        referenceNotes: absence.reference_notes,
        status: absence.status || null,
      },
    })
  } catch (err) {
    console.error("Unexpected error loading absence:", err)
    return NextResponse.json(
      {
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: "Could not load this absence.",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const id = context?.params?.id

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_ID",
          message: "Absence id is required.",
        },
        { status: 400 }
      )
    }

    const companyId = getCompanyIdFromCookies()
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

    const body = await request.json()

    const firstDay = body?.first_day
    const lastDayExpected = body?.last_day_expected || null
    const lastDayActual = body?.last_day_actual || null
    const referenceNotes = body?.reference_notes || null

    if (!firstDay || !lastDayExpected) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message:
            "First day and expected last day are required.",
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

    const supabase = getSupabaseClient()

    const { data: current, error: currentError } = await supabase
      .from("absences")
      .select("id, employee_id")
      .eq("company_id", companyId)
      .eq("id", id)
      .single()

    if (currentError || !current) {
      console.error("Load current absence for update error:", currentError)
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: "Absence not found.",
        },
        { status: 404 }
      )
    }

    // Overlap check ignoring this absence itself
    const { data: rows, error: rowsError } = await supabase
      .from("absences")
      .select("id, first_day, last_day_expected, last_day_actual")
      .eq("company_id", companyId)
      .eq("employee_id", current.employee_id)
      .neq("id", id)

    if (rowsError) {
      console.error("Update overlap DB error:", rowsError)
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

    const updates = {
      first_day: firstDay,
      last_day_expected: lastDayExpected,
      last_day_actual: lastDayActual,
      reference_notes: referenceNotes,
    }

    const { error: updateError } = await supabase
      .from("absences")
      .update(updates)
      .eq("company_id", companyId)
      .eq("id", id)

    if (updateError) {
      console.error("Update absence error:", updateError)
      return NextResponse.json(
        {
          ok: false,
          code: "DB_ERROR",
          message:
            "Could not update this absence. Please try again.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Unexpected error updating absence:", err)
    return NextResponse.json(
      {
        ok: false,
        code: "UNEXPECTED_ERROR",
        message:
          "Unexpected error while updating this absence.",
      },
      { status: 500 }
    )
  }
}
