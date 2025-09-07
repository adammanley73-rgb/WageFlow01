import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

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
      const initialData = [
        {
          id: 'emp-001',
          employeeNumber: 'EMP001',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@company.co.uk',
          phone: '+44 7700 900123',
          dateOfBirth: '1985-03-15',
          nationalInsurance: 'AB123456C',
          annualSalary: 35000,
          hireDate: '2020-01-15',
          status: 'active',
          employmentType: 'full_time',
          payScheduleId: 'monthly-25th',
          jobTitle: 'Marketing Manager',
          department: 'Marketing',
          address: {
            line1: '123 High Street',
            line2: '',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'emp-002',
          employeeNumber: 'EMP002',
          firstName: 'Michael',
          lastName: 'Brown',
          email: 'michael.brown@company.co.uk',
          phone: '+44 7700 900124',
          dateOfBirth: '1990-07-22',
          nationalInsurance: 'CD789012E',
          annualSalary: 42000,
          hireDate: '2021-03-10',
          status: 'active',
          employmentType: 'full_time',
          payScheduleId: 'monthly-25th',
          jobTitle: 'Software Developer',
          department: 'Engineering',
          address: {
            line1: '456 Main Road',
            line2: '',
            city: 'Manchester',
            county: 'Greater Manchester',
            postcode: 'M1 1AA',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await writeFile(employeesFile, JSON.stringify(initialData, null, 2));
      return initialData;
    }

    const data = await readFile(employeesFile, 'utf-8');
    return JSON.parse(data);
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

// GET /api/employees - List all employees
export async function GET() {
  try {
    const employees = await loadEmployees();
    console.log('📋 Retrieved employees:', employees.length);

    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Creating employee with data:', body);

    const employees = await loadEmployees();

    const newEmployee = {
      id: `emp-${Date.now()}`,
      employeeNumber: body.employeeNumber,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone ?? null,
      dateOfBirth: body.dateOfBirth,
      nationalInsurance: body.nationalInsurance ?? null,
      annualSalary: body.annualSalary,
      hireDate: body.hireDate,
      status: 'active',
      employmentType: body.employmentType ?? 'full_time',
      payScheduleId: body.payScheduleId ?? null,
      jobTitle: body.jobTitle ?? null,
      department: body.department ?? null,
      address: body.address ?? {
        line1: '',
        line2: '',
        city: '',
        county: '',
        postcode: '',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    employees.push(newEmployee);
    await saveEmployees(employees);

    console.log('✅ Employee created successfully:', newEmployee);

    return NextResponse.json(
      {
        success: true,
        employee: newEmployee,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
