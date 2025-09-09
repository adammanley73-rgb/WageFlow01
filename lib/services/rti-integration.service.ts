// WageFlow RTI Integration Service

export interface RTISubmission {
  payrollRunId: string;
  submissionType: 'FPS' | 'EPS' | 'EYU';
  hmrcReference?: string;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: string;
  acceptedAt?: string;
  errors?: string[];
}

export interface RTIResponse {
  success: boolean;
  reference?: string;
  correlationId?: string;
  errors?: string[];
  warnings?: string[];
}

export class RTIIntegrationService {
  // Submit FPS (Full Payment Submission) to HMRC
  static async submitFPS(payrollRunId: string): Promise<RTIResponse> {
    try {
      console.log(`📤 Submitting FPS for payroll run: ${payrollRunId}`);

      // Simulate HMRC API call
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));

      // Simulate successful submission
      const reference = `FPS-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      return {
        success: true,
        reference,
        correlationId: `CORR-${Date.now()}`,
        warnings: ['Employee EMP001: Tax code may need updating for next period']
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('RTI FPS submission failed:', message);
      return {
        success: false,
        errors: ['Failed to connect to HMRC RTI service']
      };
    }
  }

  // Submit EPS (Employer Payment Summary) to HMRC
  static async submitEPS(payrollRunId: string): Promise<RTIResponse> {
    try {
      console.log(`📤 Submitting EPS for payroll run: ${payrollRunId}`);

      await new Promise<void>((resolve) => setTimeout(resolve, 1500));

      const reference = `EPS-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      return {
        success: true,
        reference,
        correlationId: `CORR-${Date.now()}`
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('RTI EPS submission failed:', message);
      return {
        success: false,
        errors: ['EPS submission failed']
      };
    }
  }

  // Check submission status
  static async checkSubmissionStatus(reference: string): Promise<{
    status: 'pending' | 'accepted' | 'rejected';
    lastChecked: string;
    errors?: string[];
  }> {
    try {
      console.log(`🔍 Checking RTI submission status: ${reference}`);

      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

      // Simulate HMRC response
      return {
        status: 'accepted',
        lastChecked: new Date().toISOString()
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('RTI status check failed:', message);
      return {
        status: 'pending',
        lastChecked: new Date().toISOString(),
        errors: ['Unable to check status at this time']
      };
    }
  }

  // Get RTI submission history
  static async getSubmissionHistory(payrollRunId: string): Promise<RTISubmission[]> {
    // Demo submission history
    return [
      {
        payrollRunId,
        submissionType: 'FPS',
        hmrcReference: 'FPS-2025-001-ABC123',
        status: 'accepted',
        submittedAt: '2025-08-01T09:00:00Z',
        acceptedAt: '2025-08-01T09:15:00Z'
      },
      {
        payrollRunId,
        submissionType: 'EPS',
        hmrcReference: 'EPS-2025-001-DEF456',
        status: 'accepted',
        submittedAt: '2025-08-01T09:30:00Z',
        acceptedAt: '2025-08-01T09:45:00Z'
      }
    ];
  }

  // Validate payroll data before submission
  static validateForRTI(payrollRunData: {
    employeeCount?: number;
    payDate?: string;
    grossPay?: number;
  }): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation rules
    if (!payrollRunData.employeeCount || payrollRunData.employeeCount === 0) {
      errors.push('No employees found in payroll run');
    }

    if (!payrollRunData.payDate) {
      errors.push('Pay date is required for RTI submission');
    }

    if (!payrollRunData.grossPay || payrollRunData.grossPay <= 0) {
      errors.push('Total gross pay must be greater than 0');
    }

    // Warning checks
    if ((payrollRunData.employeeCount ?? 0) > 100) {
      warnings.push('Large payroll run - submission may take longer than usual');
    }

    if (payrollRunData.payDate) {
      const payDate = new Date(payrollRunData.payDate);
      const today = new Date();
      const daysDiff = (payDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 30) {
        warnings.push('Pay date is more than 30 days in the future');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Generate RTI compliance report
  static generateComplianceReport(submissions: RTISubmission[]): {
    totalSubmissions: number;
    successRate: number;
    pendingSubmissions: number;
    lastSubmissionDate?: string;
    compliance: {
      status: 'compliant' | 'warning' | 'non_compliant';
      message: string;
    };
  } {
    const total = submissions.length;
    const successful = submissions.filter((s) => s.status === 'accepted').length;
    const pending = submissions.filter((s) => s.status === 'pending').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const lastSubmission = submissions
      .filter((s) => s.submittedAt)
      .sort(
        (a, b) =>
          new Date(b.submittedAt as string).getTime() -
          new Date(a.submittedAt as string).getTime()
      )[0];

    let complianceStatus: 'compliant' | 'warning' | 'non_compliant' = 'compliant';
    let complianceMessage = 'All RTI submissions are up to date';

    if (successRate < 95) {
      complianceStatus = 'warning';
      complianceMessage = 'Some RTI submissions have failed - review and resubmit';
    }

    if (pending > 5) {
      complianceStatus = 'non_compliant';
      complianceMessage = 'Too many pending submissions - immediate attention required';
    }

    return {
      totalSubmissions: total,
      successRate,
      pendingSubmissions: pending,
      lastSubmissionDate: lastSubmission?.submittedAt,
      compliance: {
        status: complianceStatus,
        message: complianceMessage
      }
    };
  }

  // Real-time RTI validation
  static validateRTIData(payrollData: {
    employees: Array<{
      nationalInsurance: string;
      taxCode: string;
      grossPay: number;
      tax: number;
      ni: number;
    }>;
    payPeriod: { start: string; end: string };
    payDate: string;
  }): {
    valid: boolean;
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
  } {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];

    // Validate pay period
    const periodStart = new Date(payrollData.payPeriod.start);
    const periodEnd = new Date(payrollData.payPeriod.end);
    const payDate = new Date(payrollData.payDate);

    if (periodEnd <= periodStart) {
      errors.push({
        field: 'payPeriod',
        message: 'Pay period end date must be after start date',
        severity: 'error'
      });
    }

    if (payDate < periodEnd) {
      errors.push({
        field: 'payDate',
        message: 'Pay date should be after or on the pay period end date',
        severity: 'warning'
      });
    }

    // Validate employees
    payrollData.employees.forEach((employee, index) => {
      // National Insurance validation
      const niPattern = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/;
      if (!niPattern.test(employee.nationalInsurance)) {
        errors.push({
          field: `employees[${index}].nationalInsurance`,
          message: 'Invalid National Insurance number format',
          severity: 'error'
        });
      }

      // Tax code validation
      const taxCodePattern = /^(?:\d{1,4}[LMNPTY]|[KSTD]\d{1,4}|BR|NT)$/;
      if (!taxCodePattern.test(employee.taxCode)) {
        errors.push({
          field: `employees[${index}].taxCode`,
          message: 'Invalid tax code format',
          severity: 'warning'
        });
      }

      // Calculation validation
      if (employee.grossPay <= 0) {
        errors.push({
          field: `employees[${index}].grossPay`,
          message: 'Gross pay must be greater than 0',
          severity: 'error'
        });
      }

      if (employee.tax < 0 || employee.ni < 0) {
        errors.push({
          field: `employees[${index}].deductions`,
          message: 'Tax and NI deductions cannot be negative',
          severity: 'error'
        });
      }
    });

    const hasErrors = errors.some((e) => e.severity === 'error');

    return {
      valid: !hasErrors,
      errors
    };
  }

  // Generate submission XML (simplified version)
  static generateRTIXML(payrollData: {
    payrollRunId: string;
    payPeriod: { start: string; end: string };
    payDate: string;
    employees?: Array<unknown>;
    totalGrossPay?: number;
    totalTax?: number;
    totalNI?: number;
  }): string {
    const now = new Date().toISOString();
    const submissionId = `SUB-${Date.now()}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<RTISubmission xmlns="http://www.hmrc.gov.uk/schemas/rti/fps/2025">
  <Header>
    <SubmissionId>${submissionId}</SubmissionId>
    <Timestamp>${now}</Timestamp>
    <PayrollRunId>${payrollData.payrollRunId}</PayrollRunId>
  </Header>
  <PayrollData>
    <PayPeriod>
      <Start>${payrollData.payPeriod.start}</Start>
      <End>${payrollData.payPeriod.end}</End>
    </PayPeriod>
    <PayDate>${payrollData.payDate}</PayDate>
    <EmployeeCount>${payrollData.employees?.length ?? 0}</EmployeeCount>
    <TotalGrossPay>${payrollData.totalGrossPay ?? 0}</TotalGrossPay>
    <TotalTax>${payrollData.totalTax ?? 0}</TotalTax>
    <TotalNI>${payrollData.totalNI ?? 0}</TotalNI>
  </PayrollData>
</RTISubmission>`;
  }
}
