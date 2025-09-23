import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// Table expected: company_settings
// Schema suggestion (run in Supabase SQL editor):
// create table if not exists company_settings (
//   id text primary key,
//   company_name text not null,
//   paye_reference text not null,
//   accounts_office_ref text not null,
//   pay_calendar text not null check (pay_calendar in ('weekly','fortnightly','four_weekly','monthly')),
//   updated_at timestamp with time zone default now()
// );

const SINGLE_ID = 'default';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('id', SINGLE_ID)
      .maybeSingle();

    if (error) {
      // If table missing, return 204 so client can fall back to localStorage
      if (String(error.message).toLowerCase().includes('relation') || String(error.message).toLowerCase().includes('does not exist')) {
        return new NextResponse(null, { status: 204 });
      }
      return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
    }

    if (!data) return new NextResponse(null, { status: 204 });

    return NextResponse.json({
      companyName: data.company_name,
      payeReference: data.paye_reference,
      accountsOfficeRef: data.accounts_office_ref,
      payCalendar: data.pay_calendar,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      id: SINGLE_ID,
      company_name: String(body.companyName ?? ''),
      paye_reference: String(body.payeReference ?? ''),
      accounts_office_ref: String(body.accountsOfficeRef ?? ''),
      pay_calendar: String(body.payCalendar ?? 'monthly'),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('company_settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      // If table missing, tell client to use local storage
      if (String(error.message).toLowerCase().includes('relation') || String(error.message).toLowerCase().includes('does not exist')) {
        return NextResponse.json({ saved: false, message: 'Table missing. Use local storage for now.' }, { status: 501 });
      }
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
