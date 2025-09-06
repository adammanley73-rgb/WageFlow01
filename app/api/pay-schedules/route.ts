import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET /api/pay-schedules - Get all pay schedules
export async function GET() {
  try {
    const { data: schedules, error } = await supabase
      .from('pay_schedules')
      .select(
        `
        id,
        name,
        frequency,
        pay_day_of_week,
        pay_day_of_month,
        description,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeSchedules = schedules ?? [];

    // Get employee counts for each schedule
    const schedulesWithCounts = await Promise.all(
      safeSchedules.map(async (schedule) => {
        const { count, error: countError } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('pay_schedule_id', schedule.id)
          .eq('status', 'active');

        if (countError) {
          console.error('Count error for schedule', schedule.id, countError);
        }

        return {
          id: schedule.id,
          name: schedule.name,
          frequency: schedule.frequency,
          payDayOfWeek: schedule.pay_day_of_week,
          payDayOfMonth: schedule.pay_day_of_month,
          description: schedule.description,
          isActive: schedule.is_active,
          employeeCount: count ?? 0,
          createdAt: schedule.created_at,
          updatedAt: schedule.updated_at,
        };
      })
    );

    return NextResponse.json({ schedules: schedulesWithCounts });
  } catch (error) {
    console.error('Failed to fetch pay schedules:', error);
    return NextResponse.json(
      { error: 'Failed to load pay schedules' },
      { status: 500 }
    );
  }
}

// POST /api/pay-schedules - Create new pay schedule
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      frequency,
      payDayOfWeek,
      payDayOfMonth,
      description,
    }: {
      name?: string;
      frequency?: 'weekly' | 'bi_weekly' | 'monthly' | string;
      payDayOfWeek?: number | string | null;
      payDayOfMonth?: number | string | null;
      description?: string | null;
    } = body ?? {};

    // Validate required fields
    if (!name || !frequency) {
      return NextResponse.json(
        { error: 'Name and frequency are required' },
        { status: 400 }
      );
    }

    // Normalize numeric fields (allow strings from forms)
    const dayOfWeek =
      payDayOfWeek === '' || payDayOfWeek == null
        ? null
        : Number.parseInt(String(payDayOfWeek), 10);
    const dayOfMonth =
      payDayOfMonth === '' || payDayOfMonth == null
        ? null
        : Number.parseInt(String(payDayOfMonth), 10);

    // Validate frequency-specific fields
    if (frequency === 'monthly' && !dayOfMonth) {
      return NextResponse.json(
        { error: 'Pay day of month is required for monthly schedules' },
        { status: 400 }
      );
    }

    if ((frequency === 'weekly' || frequency === 'bi_weekly') && !dayOfWeek) {
      return NextResponse.json(
        { error: 'Pay day of week is required for weekly/bi-weekly schedules' },
        { status: 400 }
      );
    }

    const { data: schedule, error } = await supabase
      .from('pay_schedules')
      .insert({
        name,
        frequency,
        pay_day_of_week: dayOfWeek,
        pay_day_of_month: dayOfMonth,
        description: description || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedSchedule = {
      id: schedule.id,
      name: schedule.name,
      frequency: schedule.frequency,
      payDayOfWeek: schedule.pay_day_of_week,
      payDayOfMonth: schedule.pay_day_of_month,
      description: schedule.description,
      isActive: schedule.is_active,
      employeeCount: 0,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
    };

    return NextResponse.json(formattedSchedule, { status: 201 });
  } catch (error) {
    console.error('Failed to create pay schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create pay schedule' },
      { status: 500 }
    );
  }
}
