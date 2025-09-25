/* @ts-nocheck */
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

type LogRow = {
  id: string;
  pay_run_id: string | null;
  type: 'FPS' | 'EPS';
  period: string;
  submitted_at: string;
  reference: string | null;
  status: 'accepted' | 'rejected' | 'pending';
  message: string | null;
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('rti_logs')
      .select('id, pay_run_id, type, period, submitted_at, reference, status, message')
      .order('submitted_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: 'Failed to load RTI logs' }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map((x: LogRow) => ({
      id: x.id,
      payRunId: x.pay_run_id,
      type: x.type,
      period: x.period,
      submittedAt: x.submitted_at,
      reference: x.reference ?? '',
      status: x.status,
      message: x.message ?? '',
    })));
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


