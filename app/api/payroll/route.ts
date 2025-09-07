import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Data directory for storing payroll runs
const dataDir = path.join(process.cwd(), 'data');
const payrollFile = path.join(dataDir, 'payroll-runs.json');

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
}

// Load payroll runs from file
async function loadPayrollRuns(): Promise<any[]> {
  try {
    await ensureDataDir();

    if (!existsSync(payrollFile)) {
      // Create initial demo data
      const initialData = [
        {
          id: 'pr-demo-001',
          runNumber: 'PR-2025-09-01',
          payPeriodStart: '2025-08-01',
          payPeriodEnd: '2025-08-31',
          payDate: '2025-09-05',
          description: 'Demo Payroll - August 2025',
          status: 'completed',
          totalGrossPay: 15000,
          totalNetPay: 11250,
          employeeCount: 3,
          createdBy: 'Admin',
          createdAt: new Date('2025-08-31').toISOString(),
          updatedAt: new Date('2025-08-31').toISOString(),
        },
      ];

      await writeFile(payrollFile, JSON.stringify(initialData, null, 2));
      return initialData;
    }

    const data = await readFile(payrollFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading payroll runs:', error);
    return [];
  }
}

// Save payroll runs to file
async function savePayrollRuns(runs: any[]): Promise<void> {
  try {
    await ensureDataDir();
    await writeFile(payrollFile, JSON.stringify(runs, null, 2));
    console.log('💾 Saved payroll runs to file:', runs.length);
  } catch (error) {
    console.error('Error saving payroll runs:', error);
    throw error;
  }
}

// POST /api/payroll - Create new payroll run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Creating payroll run with data:', JSON.stringify(body, null, 2));

    // Load existing runs
    const payrollRuns = await loadPayrollRuns();

    // Generate unique run number with timestamp (zero-padded hhmm)
    const now = new Date();
    const runNumber = `PR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    // Calculate totals from employees if provided
    const employees = Array.isArray(body?.employees) ? body.employees : [];
    const calculatedTotals = employees.reduce(
      (acc: any, emp: any) => {
        acc.gross += Number(emp?.grossPay) || 0;
        acc.net += Number(emp?.netPay) || 0;
        acc.tax += Number(emp?.taxDeduction) || 0;
        acc.ni += Number(emp?.niDeduction) || 0;
        acc.pension += Number(emp?.pensionDeduction) || 0;
        return acc;
      },
      { gross: 0, net: 0, tax: 0, ni: 0, pension: 0 },
    );

    // Create payroll run object
    const newPayrollRun = {
      id: `pr-${Date.now()}`,
      runNumber,
      payPeriodStart: body?.payPeriodStart ?? null,
      payPeriodEnd: body?.payPeriodEnd ?? null,
      payDate: body?.payDate ?? null,
      description: body?.description || `Payroll Run - ${new Date().toLocaleDateString('en-GB')}`,
      employees,
      selectedEmployees: Array.isArray(body?.selectedEmployees) ? body.selectedEmployees : [],
      newStartersCheck: body?.newStartersCheck || {},
      totals: body?.totals || calculatedTotals,
      totalGrossPay: Number(body?.totalGrossPay) || calculatedTotals.gross,
      totalNetPay: Number(body?.totalNetPay) || calculatedTotals.net,
      status: 'draft',
      createdBy: body?.createdBy || body?.newStartersCheck?.checkedBy || 'System',
      employeeCount: employees.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to array and save
    const updated = [...payrollRuns, newPayrollRun];
    await savePayrollRuns(updated);

    console.log('✅ Payroll run created and saved to file:', {
      id: newPayrollRun.id,
      runNumber: newPayrollRun.runNumber,
      totalRuns: updated.length,
    });

    return NextResponse.json(
      {
        success: true,
        id: newPayrollRun.id,
        runNumber: newPayrollRun.runNumber,
        message: 'Payroll run created successfully',
        payrollRun: newPayrollRun,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('❌ Error creating payroll run:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create payroll run',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// GET /api/payroll - List payroll runs
export async function GET(_request: NextRequest) {
  try {
    console.log('📋 GET /api/payroll called - loading from file');

    const payrollRuns = await loadPayrollRuns();

    console.log('📊 Loaded payroll runs:', payrollRuns.length);
    console.log(
      '📋 Runs details:',
      payrollRuns.map((run) => ({
        id: run.id,
        runNumber: run.runNumber,
        status: run.status,
        employeeCount: run.employeeCount,
      })),
    );

    // Sort by creation date (newest first) without mutating the source array
    const sortedRuns = [...payrollRuns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json(sortedRuns, { status: 200 });
  } catch (error) {
    console.error('❌ Error fetching payroll runs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payroll runs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/payroll - Clear all runs (for testing)
export async function DELETE() {
  try {
    const current = await loadPayrollRuns();
    const count = current.length;

    await savePayrollRuns([]);

    console.log(`🗑️ Cleared ${count} payroll runs`);

    return NextResponse.json(
      {
        success: true,
        message: `Cleared ${count} payroll runs`,
        cleared: count,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('❌ Error clearing payroll runs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear payroll runs',
      },
      { status: 500 },
    );
  }
}
