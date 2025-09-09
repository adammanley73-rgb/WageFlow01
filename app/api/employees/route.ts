import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/employees - Get all employees
export async function GET() {
  try {
    console.log('🔍 API: Starting to fetch employees...');

    const { data, error } = await supabase
      .from('employees_new')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json([], { status: 200 });
    }

    // Transform and filter out employees with missing critical data
    const employees = (Array.isArray(data) ? data : [])
      .filter((emp: any) => {
        const hasRequiredFields = !!(emp?.employee_id && emp?.first_name && emp?.last_name && emp?.email);
        if (!hasRequiredFields) {
          console.warn(`⚠️ Skipping employee ${emp?.employee_id ?? 'UNKNOWN'} - missing required fields`);
        }
        return hasRequiredFields;
      })
      .map((emp: any) => ({
        id: emp.employee_id,
        employeeId: emp.employee_id,
        employeeNumber: emp.employee_id,
        firstName: emp.first_name,
        lastName: emp.last_name,
        email: emp.email,
        phone: emp.phone ?? '',
        dateOfBirth: emp.date_of_birth ?? '',
        nationalInsurance: emp.national_insurance_number ?? '',
        annualSalary: typeof emp.annual_salary === 'number' && Number.isFinite(emp.annual_salary) ? emp.annual_salary : 0,
        hireDate: emp.hire_date ?? '',
        employmentType: emp.employment_type ?? 'full_time',
        payScheduleId: emp.pay_schedule_id ?? '',
        jobTitle: emp.job_title ?? '',
        department: emp.department ?? '',
        status: emp.status ?? 'active',
        address: emp.address ?? null,
        createdAt: emp.created_at ?? '',
        updatedAt: emp.updated_at ?? ''
      }));

    console.log(`✅ Returning ${employees.length} valid employees`);

    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

// POST /api/employees - Create new employee
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Generate a simple default ID if not provided (reduces collision risk)
    const employeeId: string =
      body.employeeId && String(body.employeeId).trim().length > 0
        ? String(body.employeeId)
        : `EMP${Date.now().toString().slice(-6)}`;

    // Normalize annualSalary safely
    let annualSalary: number | null = null;
    if (body.annualSalary !== undefined && body.annualSalary !== null) {
      const parsed = typeof body.annualSalary === 'number' ? body.annualSalary : Number.parseFloat(String(body.annualSalary));
      annualSalary = Number.isFinite(parsed) ? parsed : null;
    }

    // Normalize NI number
    const nationalInsurance: string | null = body.nationalInsurance
      ? String(body.nationalInsurance).replace(/\s/g, '').toUpperCase()
      : null;

    const insertPayload = {
      employee_id: employeeId,
      first_name: body.firstName ?? null,
      last_name: body.lastName ?? null,
      email: body.email ? String(body.email).toLowerCase() : null,
      phone: body.phone ?? null,
      date_of_birth: body.dateOfBirth ?? null,
      national_insurance_number: nationalInsurance,
      annual_salary: annualSalary,
      hire_date: body.hireDate || new Date().toISOString().split('T')[0],
      employment_type: body.employmentType || 'full_time',
      pay_schedule_id: body.payScheduleId ?? null,
      job_title: body.jobTitle ?? null,
      department: body.department ?? null,
      status: body.status || 'active',
      address: body.address ?? null
    };

    const { data, error } = await supabase
      .from('employees_new')
      .insert([insertPayload])
      .select('*')
      .single();

    if (error || !data) {
      console.error('❌ Error creating employee:', error);
      return NextResponse.json({ error: error?.message || 'Failed to create employee' }, { status: 500 });
    }

    const transformedEmployee = {
      id: data.employee_id,
      employeeId: data.employee_id,
      employeeNumber: data.employee_id,
      firstName: data.first_name ?? '',
      lastName: data.last_name ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      dateOfBirth: data.date_of_birth ?? '',
      nationalInsurance: data.national_insurance_number ?? '',
      annualSalary: typeof data.annual_salary === 'number' && Number.isFinite(data.annual_salary) ? data.annual_salary : 0,
      hireDate: data.hire_date ?? '',
      employmentType: data.employment_type ?? 'full_time',
      payScheduleId: data.pay_schedule_id ?? '',
      jobTitle: data.job_title ?? '',
      department: data.department ?? '',
      status: data.status ?? 'active',
      address: data.address ?? null,
      createdAt: data.created_at ?? '',
      updatedAt: data.updated_at ?? ''
    };

    return NextResponse.json({ success: true, employee: transformedEmployee }, { status: 201 });
  } catch (error) {
    console.error('❌ Error in POST /api/employees:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
