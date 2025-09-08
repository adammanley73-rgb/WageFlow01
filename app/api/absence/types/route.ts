import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/absence/types - Get all absence types
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('absence_types')
      .select('*')
      .order('name')

    if (error) {
      console.error('❌ Database error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [], { status: 200 })
  } catch (err) {
    console.error('❌ Error fetching absence types:', err)
    return NextResponse.json(
      { error: 'Failed to fetch absence types' },
      { status: 500 }
    )
  }
}
