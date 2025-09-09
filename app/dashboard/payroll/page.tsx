'use client';
import type { CSSProperties } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BulkOperations } from '@/components/payroll/bulk-operations';
import { AutomationService } from '@/lib/services/automation.service';
import { RTIIntegrationService } from '@/lib/services/rti-integration.service';

// Workflow types and configurations
type WorkflowStatus =
  | 'draft'
  | 'processing'
  | 'review'
  | 'approved'
  | 'submitted'
  | 'completed'
  | 'cancelled';

interface WorkflowHistoryEntry {
  id: string;
  from_status: WorkflowStatus | null;
  to_status: WorkflowStatus;
  changed_by: string;
  changed_at: string;
  comment?: string;
  automated?: boolean;
}

interface PayrollRun {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  description: string;
  status: string;
  workflow_status?: WorkflowStatus;
  workflow_history?: WorkflowHistoryEntry[];
  totalGrossPay: number;
  totalNetPay: number;
  employeeCount: number;
  createdBy: string;
  createdAt: string;
  payFrequency?: string;
  approved_by_user_id?: string;
  approved_at?: string;
  submitted_to_hmrc_at?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
}

// Workflow transitions configuration
const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ['processing', 'cancelled'],
  processing: ['review', 'draft', 'cancelled'],
  review: ['approved', 'processing'],
  approved: ['submitted', 'review'],
  submitted: ['completed'],
  completed: [],
  cancelled: ['draft']
};

// Status display configurations
const WORKFLOW_STATUS_CONFIG: Record<
  WorkflowStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    description: string;
    canEdit: boolean;
    canDelete: boolean;
  }
> = {
  draft: {
    label: 'Draft',
    color: '#92400e',
    bgColor: '#fef3c7',
    description: 'Payroll run is being prepared',
    canEdit: true,
    canDelete: true
  },
  processing: {
    label: 'Processing',
    color: '#1e40af',
    bgColor: '#dbeafe',
    description: 'Calculations in progress',
    canEdit: false,
    canDelete: false
  },
  review: {
    label: 'Review',
    color: '#92400e',
    bgColor: '#fef3c7',
    description: 'Ready for approval',
    canEdit: false,
    canDelete: false
  },
  approved: {
    label: 'Approved',
    color: '#166534',
    bgColor: '#dcfce7',
    description: 'Approved for HMRC submission',
    canEdit: false,
    canDelete: false
  },
  submitted: {
    label: 'RTI Submitted',
    color: '#7c3aed',
    bgColor: '#f3e8ff',
    description: 'Submitted to HMRC',
    canEdit: false,
    canDelete: false
  },
  completed: {
    label: 'Completed',
    color: '#166534',
    bgColor: '#dcfce7',
    description: 'Fully processed and paid',
    canEdit: false,
    canDelete: false
  },
  cancelled: {
    label: 'Cancelled',
    color: '#dc2626',
    bgColor: '#fee2e2',
    description: 'Cancelled payroll run',
    canEdit: false,
    canDelete: true
  }
};

export default function PayrollDashboardPage() {
  const router = useRouter();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [automationStatus, setAutomationStatus] = useState<any>(null);

  // Load payroll runs from API
  useEffect(() => {
    const loadPayrollRuns = async () => {
      try {
        console.log('🔍 Loading payroll runs from API...');
        const response = await fetch('/api/payroll');
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Raw payroll data from API:', data);
          // Remove duplicates by ID and sort by creation date (newest first)
          const uniqueRuns: PayrollRun[] = Array.isArray(data)
            ? data
                .filter(
                  (run: PayrollRun, index: number, self: PayrollRun[]) =>
                    index === self.findIndex((r) => r.id === run.id)
                )
                .sort(
                  (a, b) =>
                    new Date(b.createdAt || 0).getTime() -
                    new Date(a.createdAt || 0).getTime()
                )
            : [];
          console.log('✅ Processed payroll runs:', uniqueRuns);
          setPayrollRuns(uniqueRuns);

          // Get smart suggestions
          const suggestions = AutomationService.getWorkflowSuggestions(
            uniqueRuns.map((run) => ({
              id: run.id,
              workflow_status: (run.workflow_status || run.status || 'draft') as WorkflowStatus,
              createdAt: run.createdAt
            }))
          );
          setSmartSuggestions(suggestions.map((s: any) => s.message));

          // Get automation status
          const autoStatus = AutomationService.getAutomationStatus();
          setAutomationStatus(autoStatus);
        } else {
          console.error('❌ API response not OK:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Failed to load payroll runs:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadPayrollRuns();
  }, []);

  // Handle bulk actions
  const handleBulkAction = async (
    action: string,
    selectedRuns: string[],
    newStatus?: WorkflowStatus
  ) => {
    try {
      console.log('🔧 Executing bulk action:', action, 'on runs:', selectedRuns, 'new status:', newStatus);

      // Simulate bulk operation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update runs in state
      if (newStatus) {
        setPayrollRuns((prev) =>
          prev.map((run) =>
            selectedRuns.includes(run.id)
              ? { ...run, workflow_status: newStatus, status: newStatus }
              : run
          )
        );
      }

      // Check for automation triggers
      for (const runId of selectedRuns) {
        if (newStatus) {
          const automationRules = AutomationService.shouldTriggerAutomation(runId, newStatus);
          for (const rule of automationRules) {
            await AutomationService.executeAutomation(runId, rule);
          }
        }
      }
    } catch (error) {
      console.error('❌ Bulk action failed:', error);
      throw error;
    }
  };

  // Handle workflow status changes
  const handleStatusChange = async (payrollRunId: string, newStatus: WorkflowStatus) => {
    try {
      // Show confirmation for important actions
      const needsConfirmation = ['cancelled', 'submitted', 'completed'].includes(newStatus);

      if (needsConfirmation) {
        const confirmed = confirm(`Are you sure you want to change status to ${newStatus}?`);
        if (!confirmed) return;
      }

      // Handle RTI submission
      if (newStatus === 'submitted') {
        console.log('📤 Submitting to HMRC RTI...');
        const rtiResult = await RTIIntegrationService.submitFPS(payrollRunId);

        if (!rtiResult.success) {
          alert(`❌ RTI Submission failed: ${rtiResult.errors?.join(', ')}`);
          return;
        }

        console.log('✅ RTI Submitted:', rtiResult.reference);
      }

      console.log(`🔄 Changing status of ${payrollRunId} to ${newStatus}`);

      // Update local state optimistically
      setPayrollRuns((prev) =>
        prev.map((run) =>
          run.id === payrollRunId ? { ...run, workflow_status: newStatus, status: newStatus } : run
        )
      );

      // Check for automation triggers
      const automationRules = AutomationService.shouldTriggerAutomation(payrollRunId, newStatus);
      for (const rule of automationRules) {
        setTimeout(() => {
          AutomationService.executeAutomation(payrollRunId, rule);
        }, (rule as any).trigger?.timeDelay || 0);
      }

      alert(`✅ Status changed to ${newStatus}`);
    } catch (error) {
      console.error('Status change error:', error);
      alert('❌ Failed to change status');
    }
  };

  // Get available workflow transitions for a status
  const getAvailableTransitions = (currentStatus: WorkflowStatus): WorkflowStatus[] => {
    return WORKFLOW_TRANSITIONS[currentStatus] || [];
  };

  // Format currency
  const formatCurrency = (amount: number) => `£${(amount ?? 0).toFixed(2)}`;

  // Improved date formatting
  const formatDate = (dateStr: string | Date) => {
    try {
      if (!dateStr) {
        console.warn('⚠️ Empty date string provided');
        return 'N/A';
      }
      let date: Date;
      if (typeof dateStr === 'string') {
        if (dateStr.includes('T')) {
          date = new Date(dateStr);
        } else {
          date = new Date(`${dateStr}T12:00:00.000Z`);
        }
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) {
        console.error('❌ Invalid date created from:', dateStr);
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('❌ Date formatting error:', error, 'for date:', dateStr);
      return 'Format Error';
    }
  };

  // Get enhanced status badge with workflow styling
  const getWorkflowStatusBadge = (status: WorkflowStatus | string) => {
    const workflowStatus = status as WorkflowStatus;
    const config = WORKFLOW_STATUS_CONFIG[workflowStatus] || WORKFLOW_STATUS_CONFIG.draft;

    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'capitalize',
          backgroundColor: config.bgColor,
          color: config.color,
          border: `1px solid ${config.color}`
        }}
        title={config.description}
      >
        {config.label}
      </span>
    );
  };

  // Get workflow action buttons
  const getWorkflowActionButtons = (run: PayrollRun) => {
    const currentStatus = (run.workflow_status || run.status || 'draft') as WorkflowStatus;
    const availableTransitions = getAvailableTransitions(currentStatus);

    if (availableTransitions.length === 0) {
      return null;
    }

    return (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {availableTransitions.map((nextStatus) => {
          const config = WORKFLOW_STATUS_CONFIG[nextStatus];
          return (
            <button
              key={nextStatus}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: config.bgColor,
                color: config.color
              }}
              onClick={() => handleStatusChange(run.id, nextStatus)}
              title={`Change to ${config.label}`}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    );
  };

  // Calculate totals
  const totalStats = payrollRuns.reduce(
    (acc, run) => {
      acc.totalGross += run.totalGrossPay || 0;
      acc.totalNet += run.totalNetPay || 0;
      return acc;
    },
    { totalGross: 0, totalNet: 0 }
  );

  const styles = {
    container: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
      minHeight: '100vh',
      padding: '40px 20px'
    } as CSSProperties,
    maxWidth: {
      maxWidth: '1200px',
      margin: '0 auto'
    } as CSSProperties,
    headerCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px 32px',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    } as CSSProperties,
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0 0 8px 0'
    } as CSSProperties,
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      margin: '0 0 24px 0'
    } as CSSProperties,
    nav: {
      display: 'flex',
      gap: '24px'
    } as CSSProperties,
    navLink: {
      color: '#4b5563',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: 500,
      padding: '8px 16px',
      borderRadius: '6px',
      backgroundColor: 'rgba(255, 255, 255, 0.5)'
    } as CSSProperties,
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    } as CSSProperties,
    statCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    } as CSSProperties,
    statTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#6b7280',
      margin: '0 0 8px 0',
      textTransform: 'uppercase'
    } as CSSProperties,
    statValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0'
    } as CSSProperties,
    actionsCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '32px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    } as CSSProperties,
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0 0 16px 0'
    } as CSSProperties,
    button: {
      display: 'inline-block',
      padding: '12px 24px',
      backgroundColor: '#10b981',
      color: '#000000',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 700,
      border: 'none',
      cursor: 'pointer',
      marginRight: '16px',
      marginBottom: '16px'
    } as CSSProperties,
    buttonSecondary: {
      display: 'inline-block',
      padding: '12px 24px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      color: '#3b82f6',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      border: '1px solid #3b82f6',
      cursor: 'pointer',
      marginRight: '16px',
      marginBottom: '16px'
    } as CSSProperties,
    tableCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    } as CSSProperties,
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '16px'
    } as CSSProperties,
    th: {
      backgroundColor: '#f9fafb',
      padding: '12px',
      textAlign: 'left',
      fontSize: '14px',
      fontWeight: 600,
      color: '#374151',
      borderBottom: '1px solid #e5e7eb'
    } as CSSProperties,
    td: {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb',
      fontSize: '14px',
      color: '#1f2937',
      verticalAlign: 'top'
    } as CSSProperties,
    loading: {
      textAlign: 'center',
      padding: '80px 20px',
      fontSize: '18px',
      color: '#6b7280'
    } as CSSProperties,
    noData: {
      textAlign: 'center',
      padding: '40px',
      color: '#6b7280',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      marginTop: '16px'
    } as CSSProperties,
    viewButton: {
      padding: '6px 12px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      marginBottom: '4px'
    } as CSSProperties,
    brand: { color: '#3b82f6' } as CSSProperties,
    subtleText: { fontSize: '12px', color: '#6b7280' } as CSSProperties,
    freqBadge: {
      fontSize: '10px',
      color: '#059669',
      fontWeight: 600,
      marginTop: '2px'
    } as CSSProperties,
    overflowAuto: { overflowX: 'auto' } as CSSProperties
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.headerCard}>
            <div style={styles.loading}>🔄 Loading Payroll Dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.headerCard}>
          <h1 style={styles.title}>
            💼 <span style={styles.brand}>WageFlow</span> Payroll Dashboard
            {automationStatus?.enabled && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginLeft: '8px'
                }}
              >
                🤖 Automation Active ({automationStatus.activeRules} rules)
              </span>
            )}
          </h1>
          <p style={styles.subtitle}>Manage payroll runs and UK RTI submissions</p>
          <nav style={styles.nav}>
            <a href="/dashboard" style={styles.navLink}>
              Dashboard
            </a>
            <a href="/dashboard/employees" style={styles.navLink}>
              Employees
            </a>
          </nav>
        </div>

        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && (
          <div>
            {smartSuggestions.map((suggestion, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px'
                }}
              >
                <p style={{ fontSize: '14px', color: '#065f46', margin: 0 }}>{suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Total Payroll Runs</h3>
            <p style={styles.statValue}>{payrollRuns.length}</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>YTD Gross Pay</h3>
            <p style={styles.statValue}>{formatCurrency(totalStats.totalGross)}</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>YTD Net Pay</h3>
            <p style={styles.statValue}>{formatCurrency(totalStats.totalNet)}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.actionsCard}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <button style={styles.button} onClick={() => router.push('/dashboard/payroll/batch')}>
            💼 Process Payroll Run
          </button>
          <a href="/dashboard/employees" style={styles.buttonSecondary}>
            👥 Manage Employees
          </a>
          <button
            style={styles.buttonSecondary}
            onClick={async () => {
              const runs = payrollRuns.filter((r) => r.workflow_status === 'approved');
              if (runs.length > 0) {
                const confirmed = confirm(`Submit ${runs.length} approved payroll runs to HMRC?`);
                if (confirmed) {
                  for (const run of runs) {
                    await handleStatusChange(run.id, 'submitted');
                  }
                }
              } else {
                alert('No approved payroll runs ready for RTI submission');
              }
            }}
          >
            📊 RTI Submission
          </button>
        </div>

        {/* Bulk Operations */}
        <BulkOperations
          payrollRuns={payrollRuns.map((run) => ({
            id: run.id,
            runNumber: run.runNumber,
            name: run.description,
            workflow_status: run.workflow_status,
            status: run.status,
            employeeCount: run.employeeCount,
            grossPay: run.totalGrossPay,
            netPay: run.totalNetPay
          }))}
          onBulkAction={handleBulkAction}
          onRefresh={() => window.location.reload()}
        />

        {/* Payroll Runs Table */}
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Recent Payroll Runs ({payrollRuns.length})</h2>
          {payrollRuns.length === 0 ? (
            <div style={styles.noData}>
              <div>📄 No payroll runs found</div>
              <p>Create your first payroll run to get started!</p>
            </div>
          ) : (
            <div style={styles.overflowAuto}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Payroll Run</th>
                    <th style={styles.th}>Pay Period</th>
                    <th style={styles.th}>Pay Date</th>
                    <th style={styles.th}>Employees</th>
                    <th style={styles.th}>Gross Pay</th>
                    <th style={styles.th}>Net Pay</th>
                    <th style={styles.th}>Workflow Status</th>
                    <th style={styles.th}>Created By</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map((run) => (
                    <tr key={run.id}>
                      <td style={styles.td}>
                        <div>
                          <strong>{run.runNumber}</strong>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{run.description}</div>
                          {run.payFrequency && (
                            <div style={styles.freqBadge}>📅 {run.payFrequency.toUpperCase()}</div>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {formatDate(run.payPeriodStart)} - {formatDate(run.payPeriodEnd)}
                      </td>
                      <td style={styles.td}>{formatDate(run.payDate)}</td>
                      <td style={styles.td}>{run.employeeCount}</td>
                      <td style={styles.td}>{formatCurrency(run.totalGrossPay)}</td>
                      <td style={styles.td}>{formatCurrency(run.totalNetPay)}</td>
                      <td style={styles.td}>
                        {getWorkflowStatusBadge(run.workflow_status || run.status || 'draft')}
                      </td>
                      <td style={styles.td}>{run.createdBy}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <button
                            style={styles.viewButton}
                            onClick={() => {
                              console.log('🔍 Navigating to payroll run details:', run.id);
                              router.push(`/dashboard/payroll/${run.id}`);
                            }}
                          >
                            👁️ View
                          </button>
                          {getWorkflowActionButtons(run)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
