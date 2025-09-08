import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

// Optional: ensure this route is always dynamic
export const dynamic = 'force-dynamic'

// Helpers
function buildUpdate(body: any) {
  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.firstName !== undefined) update.first_name = body.firstName
  if (body.lastName !== undefined) update.last_name = body.lastName
  if (body.email !== undefined) update.email = body.email
  if (body.phone !== undefined) update.phone = body.phone
  if (body.annualSalary !== undefined) update.annual_salary = body.annualSalary
  if (body.payScheduleId !== undefined) update.pay_schedule_id = body.payScheduleId
  return update
}

// GET /api/employees/[id] - Get single employee
export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const employeeId = context?.params?.id
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 })
    }

    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)  // CHANGED: was 'id', now 'employee_id'
      .single()

    if (error || !employee) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(employee, { status: 200 })
  } catch (err) {
    console.error('Error fetching employee:', err)
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 })
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const employeeId = context?.params?.id
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const update = buildUpdate(body)
    if (Object.keys(update).length === 1) {
      // only has updated_at
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update(update)
      .eq('employee_id', employeeId)  // CHANGED: was 'id', now 'employee_id'
      .select()
      .single()

    if (error || !updatedEmployee) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error?.message || 'Failed to update employee' }, { status: 500 })
    }

    return NextResponse.json({ success: true, employee: updatedEmployee }, { status: 200 })
  } catch (err) {
    console.error('Error updating employee:', err)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const employeeId = context?.params?.id
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 })
    }

    const { data: deletedEmployee, error } = await supabase
      .from('employees')
      .delete()
      .eq('employee_id', employeeId)  // CHANGED: was 'id', now 'employee_id'
      .select()
      .single()

    if (error || !deletedEmployee) {
      console.error('Database delete error:', error)
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(
      { success: true, message: 'Employee deleted successfully', employee: deletedEmployee },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error deleting employee:', err)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}