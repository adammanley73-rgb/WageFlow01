import { NextResponse } from "next/server";

type PayFrequency = "weekly" | "bi-weekly" | "monthly";

type PayrollRunEntry = {
  employeeId: string;
  employee: {
    name: string;
    employeeNumber: string;
    email: string;
  };
  earnings: {
    basicPay: number;
    overtime: number;
    bonus: number;
    gross: number;
  };
  deductions: {
    incomeTax: number;
    nationalInsurance: number;
    pensionEmployee: number;
    total: number;
  };
  netPay: number;
  payFrequency: PayFrequency;
};

type PayrollRunInput = {
  type?: string;
  payFrequency?: PayFrequency;
  payPeriod?: {
    startDate?: string;
    endDate?: string;
    payDate?: string;
  };
  entries?: PayrollRunEntry[];
  totals?: {
    grossPay?: number;
    totalDeductions?: number;
    netPay?: number;
  };
  employeeCount?: number;
  status?: string;
};

type PayrollRun = {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  description: string;
  status: string;
  totalGrossPay: number;
  totalNetPay: number;
  employeeCount: number;
  createdBy: string;
  createdAt: string;
  entries: PayrollRunEntry[];
  payFrequency: PayFrequency;
};

// Demo storage (replace with your database)
let payrollRuns: PayrollRun[] = [];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PayrollRunInput;

    console.log("Received payroll data:", body); // Debug log

    // Helpers
    const todayStr = new Date().toISOString().split("T")[0];
    const toNumber = (v: unknown, fallback = 0) =>
      typeof v === "number" && Number.isFinite(v) ? v : fallback;

    // Create new payroll run with proper date handling
    const newPayrollRun: PayrollRun = {
      id: `PR-${Date.now()}`,
      runNumber: `PAY-${new Date().getFullYear()}-${String(
        payrollRuns.length + 1
      ).padStart(3, "0")}`,
      payPeriodStart: body.payPeriod?.startDate || todayStr,
      payPeriodEnd: body.payPeriod?.endDate || todayStr,
      payDate: body.payPeriod?.payDate || todayStr,
      description: `${(body.payFrequency || "monthly")
        .charAt(0)
        .toUpperCase()}${(body.payFrequency || "monthly").slice(
        1
      )} Batch Payroll - ${body.employeeCount || 0} employees`,
      status: body.status || "draft",
      totalGrossPay: toNumber(body.totals?.grossPay, 0),
      totalNetPay: toNumber(body.totals?.netPay, 0),
      employeeCount: body.employeeCount || (body.entries?.length ?? 0),
      createdBy: "System Admin",
      createdAt: new Date().toISOString(),
      entries: Array.isArray(body.entries) ? body.entries : [],
      payFrequency: body.payFrequency || "monthly",
    };

    console.log("Created payroll run:", newPayrollRun); // Debug log

    payrollRuns.push(newPayrollRun);

    return NextResponse.json({
      success: true,
      payrollRun: newPayrollRun,
      message: "Payroll run created successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Failed to create payroll run:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create payroll run",
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log("Returning payroll runs:", payrollRuns); // Debug log
    return NextResponse.json(payrollRuns);
  } catch (error: unknown) {
    console.error("Failed to fetch payroll runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll runs" },
      { status: 500 }
    );
  }
}
