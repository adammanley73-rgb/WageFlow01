import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/absence/requests - Get all absence requests
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('absence_requests')
      .select(`
        *,
        employees!inner(first_name, last_name),
        absence_types!inner(name)
      `)
      .order('requested_at', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Transform data for frontend
    const transformedRequests = data?.map(request => ({
      id: request.id,
      employee_id: request.employee_id,
      employeeName: `${request.employees.first_name} ${request.employees.last_name}`,
      absence_type_id: request.absence_type_id,
      absence_type_name: request.absence_types.name,
      start_date: request.start_date,
      end_date: request.end_date,
      total_days: request.total_days,
      status: request.status,
      reason: request.reason,
      requested_at: request.requested_at,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      rejection_reason: request.rejection_reason,
      medical_cert_required: request.medical_cert_required,
      medical_cert_received: request.medical_cert_received,
      statutory_pay_amount: request.statutory_pay_amount,
      notes: request.notes
    })) || []
    
    return NextResponse.json(transformedRequests)
  } catch (error) {
    console.error('Error fetching absence requests:', error)
    return NextResponse.json({ error: 'Failed to fetch absence requests' }, { status: 500 })
  }
}

// POST /api/absence/requests - Create new absence request
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('absence_requests')
      .insert([{
        employee_id: body.employee_id,
        absence_type_id: body.absence_type_id,
        start_date: body.start_date,
        end_date: body.end_date,
        total_days: body.total_days,
        half_day_start: body.half_day_start || false,
        half_day_end: body.half_day_end || false,
        reason: body.reason || null,
        status: 'approved' // Auto-approve for now - can add approval workflow later
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Update employee entitlement if it's annual leave
    if (body.absence_type_id === 'HOLIDAY') {
      // First get current used_days
      const { data: entitlement } = await supabase
        .from('absence_entitlements')
        .select('used_days')
        .eq('employee_id', body.employee_id)
        .eq('absence_type_id', 'HOLIDAY')
        .single()
      
      // Then update with new total
      const newUsedDays = (entitlement?.used_days || 0) + body.total_days
      
      await supabase
        .from('absence_entitlements')
        .update({
          used_days: newUsedDays,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', body.employee_id)
        .eq('absence_type_id', 'HOLIDAY')
    }
    
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error creating absence request:', error)
    return NextResponse.json({ error: 'Failed to create absence request' }, { status: 500 })
  }
}