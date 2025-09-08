import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/absence/entitlements - Get all employee entitlements
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('absence_entitlements')
      .select(
        `
        id,
        employee_id,
        absence_type_id,
        holiday_year_start,
        holiday_year_end,
        total_entitlement_days,
        used_days,
        remaining_days,
        carried_over_days,
        employees:employees!inner(first_name,last_name),
        absence_types:absence_types!inner(name)
      `
      )
      .order('employee_id')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const transformedEntitlements =
      data?.map((entitlement: any) => ({
        id: entitlement.id,
        employee_id: entitlement.employee_id,
        employeeName: `${entitlement.employees?.first_name ?? ''} ${entitlement.employees?.last_name ?? ''}`.trim(),
        absence_type_id: entitlement.absence_type_id,
        absence_type_name: entitlement.absence_types?.name ?? '',
        holiday_year_start: entitlement.holiday_year_start,
        holiday_year_end: entitlement.holiday_year_end,
        total_entitlement_days: entitlement.total_entitlement_days,
        used_days: entitlement.used_days,
        remaining_days: entitlement.remaining_days,
        carried_over_days: entitlement.carried_over_days,
      })) ?? []

    return NextResponse.json(transformedEntitlements, { status: 200 })
  } catch (error) {
    console.error('Error fetching absence entitlements:', error)
    return NextResponse.json({ error: 'Failed to fetch absence entitlements' }, { status: 500 })
  }
}
