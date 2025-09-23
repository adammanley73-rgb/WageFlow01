// app/api/employees/[id]/route.ts
// Purpose: Safe employee delete with precheck against payroll usage.
// Returns 409 with counts if the employee appears in payroll tables.
// Uses service role key. Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE in env.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Json =
  | { ok: true; deleted: boolean; id: string }
  | { ok: false; code: string; message: string; details?: unknown }

function bad(message: string, code = 'BAD_REQUEST', details?: unknown) {
  const body: Json = { ok: false, code, message, details }
  return NextResponse.json(body, { status: code === 'NOT_FOUND' ? 404 : code === 'EMPLOYEE_IN_USE' ? 409 : 400 })
}

function serverError(message: string, details?: unknown) {
  const body: Json = { ok: false, code: 'SERVER_ERROR', message, details }
  return NextResponse.json(body, { status: 500 })
}

function envMissing() {
  return bad(
    'Server is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE in .env.local then restart.',
    'BAD_REQUEST'
  )
}

function isUuid(id: string) {
  // looser UUID check, accepts v4 and others
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export const dynamic = 'force-dynamic' // ensure server runtime
export const runtime = 'nodejs'        // service key requires Node runtime

export async function DELETE(
  _req: NextRequest,
  ctx: { params: { id: string } }
): Promise<NextResponse<Json>> {
  try {
    const id = ctx.params?.id
    if (!id || !isUuid(id)) {
      return bad('Invalid employee id. Must be a UUID.')
    }

    const supabase = getServiceClient()
    if (!supabase) return envMissing()

    // If payroll tables aren’t created yet, treat as zero references.
    // Check payroll_run_employees
    let preCount = 0
    {
      const { error, count } = await supabase
        .from('payroll_run_employees')
        .select('employee_id', { count: 'exact', head: true })
        .eq('employee_id', id)
      // Table might not exist on early DBs
      if (error && error.code !== '42P01' /* undefined_table */) {
        return serverError('Failed checking payroll_run_employees.', { code: error.code, message: error.message })
      }
      if (!error && typeof count === 'number') preCount = count
    }

    // Check payroll_entries
    let peCount = 0
    {
      const { error, count } = await supabase
        .from('payroll_entries')
        .select('employee_id', { count: 'exact', head: true })
        .eq('employee_id', id)
      if (error && error.code !== '42P01') {
        return serverError('Failed checking payroll_entries.', { code: error.code, message: error.message })
      }
      if (!error && typeof count === 'number') peCount = count
    }

    const totalRefs = preCount + peCount
    if (totalRefs > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: 'EMPLOYEE_IN_USE',
          message: 'Cannot delete employee. They appear in payroll history.',
          details: { payroll_run_employees: preCount, payroll_entries: peCount, total: totalRefs }
        },
        { status: 409 }
      )
    }

    // Proceed with delete
    const { data, error } = await supabase.from('employees').delete().eq('id', id).select('id').single()
    if (error?.code === 'PGRST116') {
      // no rows
      return bad('Employee not found.', 'NOT_FOUND')
    }
    if (error) {
      // If DB-level FK/trigger blocks, surface a friendly message
      if (error.code === '23503' /* foreign_key_violation */) {
        return NextResponse.json(
          {
            ok: false,
            code: 'EMPLOYEE_IN_USE',
            message: 'Cannot delete employee. Database reports existing payroll references.',
            details: { db_error: error.message }
          },
          { status: 409 }
        )
      }
      return serverError('Delete failed.', { code: error.code, message: error.message })
    }

    return NextResponse.json({ ok: true, deleted: true, id: data.id }, { status: 200 })
  } catch (e: any) {
    return serverError('Unexpected server error.', { message: e?.message })
  }
}
