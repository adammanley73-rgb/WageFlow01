import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const employeesFile = path.join(dataDir, 'employees.json');

async function ensureDataDir() {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
}

async function loadEmployees(): Promise<any[]> {
  try {
    await ensureDataDir();

    if (!existsSync(employeesFile)) {
      return [];
    }

    const data = await readFile(employeesFile, 'utf-8');
    if (!data.trim()) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading employees:', error);
    return [];
  }
}

async function saveEmployees(employees: any[]): Promise<void> {
  try {
    await ensureDataDir();
    await writeFile(employeesFile, JSON.stringify(employees, null, 2));
    console.log('💾 Saved employees to file:', employees.length);
  } catch (error) {
    console.error('Error saving employees:', error);
    throw error;
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employeeId = params.id;
    const body = await request.json();
    console.log('📝 Updating employee with ID:', employeeId, 'Data:', body);

    const employees = await loadEmployees();
    const employeeIndex = employees.findIndex((emp: any) => emp.id === employeeId);

    if (employeeIndex === -1) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updatedEmployee = {
      ...employees[employeeIndex],
      ...body,
      id: employeeId,
      updatedAt: new Date().toISOString(),
    };

    employees[employeeIndex] = updatedEmployee;
    await saveEmployees(employees);

    console.log('✅ Employee updated successfully:', updatedEmployee);

    return NextResponse.json(
      {
        success: true,
        employee: updatedEmployee,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

// GET /api/employees/[id] - Get single employee
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employeeId = params.id;
    console.log('🔍 Getting employee with ID:', employeeId);

    const employees = await loadEmployees();
    const employee = employees.find((emp: any) => emp.id === employeeId);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log('✅ Found employee:', employee);

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    console.error('❌ Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employeeId = params.id;
    console.log('🗑️ Deleting employee with ID:', employeeId);

    const employees = await loadEmployees();
    const employeeIndex = employees.findIndex((emp: any) => emp.id === employeeId);

    if (employeeIndex === -1) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const [deletedEmployee] = employees.splice(employeeIndex, 1);
    await saveEmployees(employees);

    console.log('✅ Employee deleted successfully:', deletedEmployee);

    return NextResponse.json(
      {
        success: true,
        message: 'Employee deleted successfully',
        employee: deletedEmployee,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
