import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/employees/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
    }

    const { data: employee, error } = await supabase
      .from('employees_new')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error || !employee) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const transformedEmployee = {
      id: employee.employee_id,
      employeeId: employee.employee_id,
      employeeNumber: employee.employee_id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: employee.date_of_birth,
      nationalInsurance: employee.national_insurance_number,
      annualSalary: employee.annual_salary,
      hireDate: employee.hire_date,
      employmentType: employee.employment_type,
      payScheduleId: employee.pay_schedule_id,
      jobTitle: employee.job_title,
      department: employee.department,
      status: employee.status,
      address: employee.address,
      createdAt: employee.created_at,
      updatedAt: employee.updated_at
    };

    return NextResponse.json(transformedEmployee, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching employee:', message);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

// PUT /api/employees/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Normalize annualSalary safely for strict TS
    let normalizedAnnualSalary: number | null = null;
    if (body.annualSalary !== undefined && body.annualSalary !== null) {
      const n =
        typeof body.annualSalary === 'number'
          ? body.annualSalary
          : Number.parseFloat(String(body.annualSalary));
      normalizedAnnualSalary = Number.isFinite(n) ? n : null;
    }

    const updateData = {
      first_name: body.firstName ?? null,
      last_name: body.lastName ?? null,
      email: body.email ? String(body.email).toLowerCase() : null,
      phone: body.phone ?? null,
      date_of_birth: body.dateOfBirth ?? null,
      national_insurance_number: body.nationalInsurance
        ? String(body.nationalInsurance).replace(/\s/g, '').toUpperCase()
        : null,
      annual_salary: normalizedAnnualSalary,
      hire_date: body.hireDate ?? null,
      employment_type: body.employmentType ?? null,
      pay_schedule_id: body.payScheduleId ?? null,
      job_title: body.jobTitle ?? null,
      department: body.department ?? null,
      status: body.status ?? null,
      address: body.address ?? null,
      updated_at: new Date().toISOString()
    };

    const { data: updatedEmployee, error } = await supabase
      .from('employees_new')
      .update(updateData)
      .eq('employee_id', employeeId)
      .select('*')
      .single();

    if (error || !updatedEmployee) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to update employee' },
        { status: 500 }
      );
    }

    const transformedResponse = {
      id: updatedEmployee.employee_id,
      employeeId: updatedEmployee.employee_id,
      employeeNumber: updatedEmployee.employee_id,
      firstName: updatedEmployee.first_name,
      lastName: updatedEmployee.last_name,
      email: updatedEmployee.email,
      phone: updatedEmployee.phone,
      dateOfBirth: updatedEmployee.date_of_birth,
      nationalInsurance: updatedEmployee.national_insurance_number,
      annualSalary: updatedEmployee.annual_salary,
      hireDate: updatedEmployee.hire_date,
      employmentType: updatedEmployee.employment_type,
      payScheduleId: updatedEmployee.pay_schedule_id,
      jobTitle: updatedEmployee.job_title,
      department: updatedEmployee.department,
      status: updatedEmployee.status,
      address: updatedEmployee.address,
      updatedAt: updatedEmployee.updated_at
    };

    return NextResponse.json({ success: true, employee: transformedResponse }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error updating employee:', message);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

// DELETE /api/employees/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
    }

    const { data: deletedEmployee, error } = await supabase
      .from('employees_new')
      .delete()
      .eq('employee_id', employeeId)
      .select('*')
      .single();

    if (error || !deletedEmployee) {
      console.error('Database delete error:', error);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: 'Employee deleted successfully' },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error deleting employee:', message);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
