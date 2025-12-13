/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\absence\[id]\delete\route.ts

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

export async function DELETE(
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
      .select("id, status")
      .eq("company_id", companyId)
      .eq("id", id)
      .single()

    if (error || !absence) {
      console.error("Delete absence load error:", error)
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: "Absence not found.",
        },
        { status: 404 }
      )
    }

    if (absence.status !== "draft") {
      return NextResponse.json(
        {
          ok: false,
          code: "STATUS_NOT_DRAFT",
          message: "Only draft absences can be deleted.",
        },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from("absences")
      .delete()
      .eq("company_id", companyId)
      .eq("id", id)

    if (deleteError) {
      console.error("Delete absence error:", deleteError)
      return NextResponse.json(
        {
          ok: false,
          code: "DB_ERROR",
          message:
            "Could not delete this absence. Please try again.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Unexpected error deleting absence:", err)
    return NextResponse.json(
      {
        ok: false,
        code: "UNEXPECTED_ERROR",
        message:
          "Unexpected error while deleting this absence.",
      },
      { status: 500 }
    )
  }
}
