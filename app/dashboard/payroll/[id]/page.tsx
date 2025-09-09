'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Workflow types (same as before)
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
  name: string;
  payPeriod: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  description: string;
  status: string;
  workflow_status?: WorkflowStatus;
  workflow_history?: WorkflowHistoryEntry[];
  employeeCount: number;
  grossPay: number;
  netPay: number;
  totalTax: number;
  totalNI: number;
  totalPension: number;
  createdDate: string;
  createdBy: string;
  submittedDate?: string;
  approved_by_user_id?: string;
  approved_at?: string;
  submitted_to_hmrc_at?: string;
}

interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  grossPay: number;
  taxDeduction: number;
  niDeduction: number;
  pensionDeduction: number;
  netPay: number;
  taxCode: string;
}

// Workflow configurations
const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ['processing', 'cancelled'],
  processing: ['review', 'draft', 'cancelled'], 
  review: ['approved', 'processing'],
  approved: ['submitted', 'review'],
  submitted: ['completed'],
  completed: [],
  cancelled: ['draft']
};

const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
  canEdit: boolean;
  canDelete: boolean;
}> = {
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

export default function PayrollRunDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const payrollId = params?.id;
  
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWorkflowHistory, setShowWorkflowHistory] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Demo payroll run data with workflow status
      const demoPayrollRuns: PayrollRun[] = [
        {
          id: 'pr-001',
          runNumber: 'PR-2025-001',
          name: 'Monthly Payroll - July 2025',
          payPeriod: '01/07/2025 - 31/07/2025',
          payPeriodStart: '2025-07-01',
          payPeriodEnd: '2025-07-31',
          payDate: '2025-07-31',
          description: 'Regular monthly payroll run',
          status: 'completed',
          workflow_status: 'completed',
          employeeCount: 3,
          grossPay: 9000.00,
          netPay: 6850.00,
          totalTax: 1385.00,
          totalNI: 780.00,
          totalPension: 450.00,
          createdDate: '2025-07-28',
          createdBy: 'Adam',
          submittedDate: '2025-08-01',
          approved_by_user_id: 'Adam',
          approved_at: '2025-07-30T14:30:00Z',
          submitted_to_hmrc_at: '2025-08-01T09:00:00Z',
          workflow_history: [
            {
              id: '1',
              from_status: null,
              to_status: 'draft',
              changed_by: 'Adam',
              changed_at: '2025-07-28T10:00:00Z',
              comment: 'Payroll run created',
              automated: true
            },
            {
              id: '2',
              from_status: 'draft',
              to_status: 'processing',
              changed_by: 'Adam',
              changed_at: '2025-07-29T09:00:00Z',
              comment: 'Started payroll calculations'
            },
            {
              id: '3',
              from_status: 'processing',
              to_status: 'review',
              changed_by: 'System',
              changed_at: '2025-07-29T09:15:00Z',
              comment: 'Calculations completed automatically',
              automated: true
            },
            {
              id: '4',
              from_status: 'review',
              to_status: 'approved',
              changed_by: 'Adam',
              changed_at: '2025-07-30T14:30:00Z',
              comment: 'Reviewed and approved for submission'
            },
            {
              id: '5',
              from_status: 'approved',
              to_status: 'submitted',
              changed_by: 'Adam',
              changed_at: '2025-08-01T09:00:00Z',
              comment: 'Submitted to HMRC RTI'
            },
            {
              id: '6',
              from_status: 'submitted',
              to_status: 'completed',
              changed_by: 'System',
              changed_at: '2025-08-01T10:30:00Z',
              comment: 'HMRC submission confirmed',
              automated: true
            }
          ]
        },
        {
          id: 'pr-002',
          runNumber: 'PR-2025-002',
          name: 'Monthly Payroll - August 2025',
          payPeriod: '01/08/2025 - 31/08/2025',
          payPeriodStart: '2025-08-01',
          payPeriodEnd: '2025-08-31',
          payDate: '2025-08-31',
          description: 'Regular monthly payroll run',
          status: 'review',
          workflow_status: 'review',
          employeeCount: 3,
          grossPay: 9000.00,
          netPay: 6850.00,
          totalTax: 1385.00,
          totalNI: 780.00,
          totalPension: 450.00,
          createdDate: '2025-08-28',
          createdBy: 'Adam',
          workflow_history: [
            {
              id: '1',
              from_status: null,
              to_status: 'draft',
              changed_by: 'Adam',
              changed_at: '2025-08-28T10:00:00Z',
              comment: 'Payroll run created'
            },
            {
              id: '2',
              from_status: 'draft',
              to_status: 'processing',
              changed_by: 'Adam',
              changed_at: '2025-08-29T09:00:00Z',
              comment: 'Started payroll calculations'
            },
            {
              id: '3',
              from_status: 'processing',
              to_status: 'review',
              changed_by: 'System',
              changed_at: '2025-08-29T09:15:00Z',
              comment: 'Calculations completed - ready for review',
              automated: true
            }
          ]
        }
      ];
      
      // Demo payroll entries data
      const demoPayrollEntries: { [key: string]: PayrollEntry[] } = {
        'pr-001': [
          {
            employeeId: 'EMP001',
            employeeName: 'Sarah Johnson',
            employeeNumber: 'EMP001',
            grossPay: 2916.67,
            taxDeduction: 450.00,
            niDeduction: 280.00,
            pensionDeduction: 145.83,
            netPay: 2040.84,
            taxCode: '1257L'
          },
          {
            employeeId: 'EMP002',
            employeeName: 'James Wilson',
            employeeNumber: 'EMP002',
            grossPay: 2333.33,
            taxDeduction: 315.00,
            niDeduction: 200.00,
            pensionDeduction: 116.67,
            netPay: 1701.66,
            taxCode: '1257L'
          },
          {
            employeeId: 'EMP003',
            employeeName: 'Emma Brown',
            employeeNumber: 'EMP003',
            grossPay: 3750.00,
            taxDeduction: 625.00,
            niDeduction: 380.00,
            pensionDeduction: 187.50,
            netPay: 2557.50,
            taxCode: '1257L'
          }
        ],
        'pr-002': [
          {
            employeeId: 'EMP001',
            employeeName: 'Sarah Johnson',
            employeeNumber: 'EMP001',
            grossPay: 2916.67,
            taxDeduction: 440.00,
            niDeduction: 290.00,
            pensionDeduction: 145.83,
            netPay: 2040.84,
            taxCode: '1257L'
          },
          {
            employeeId: 'EMP002',
            employeeName: 'James Wilson',
            employeeNumber: 'EMP002',
            grossPay: 2333.33,
            taxDeduction: 310.00,
            niDeduction: 210.00,
            pensionDeduction: 116.67,
            netPay: 1696.66,
            taxCode: '1257L'
          }
        ]
      };
      
      const foundPayrollRun = demoPayrollRuns.find(pr => pr.id === payrollId);
      
      if (foundPayrollRun) {
        setPayrollRun(foundPayrollRun);
        setPayrollEntries(demoPayrollEntries[payrollId || ''] || []);
      }
      
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [payrollId]);

  // Handle workflow status changes
  const handleStatusChange = async (newStatus: WorkflowStatus) => {
    if (!payrollRun) return;
    
    try {
      const needsConfirmation = ['cancelled', 'submitted', 'completed'].includes(newStatus);
      
      if (needsConfirmation) {
        const confirmed = confirm(`Are you sure you want to change status to ${newStatus}?`);
        if (!confirmed) return;
      }

      // Update payroll run status
      const updatedRun = {
        ...payrollRun,
        workflow_status: newStatus,
        status: newStatus
      };
      
      setPayrollRun(updatedRun);
      alert(`✅ Status changed to ${newStatus}`);
      
    } catch (error) {
      console.error('Status change error:', error);
      alert('❌ Failed to change status');
    }
  };

  // Get available workflow transitions
  const getAvailableTransitions = (currentStatus: WorkflowStatus): WorkflowStatus[] => {
    return WORKFLOW_TRANSITIONS[currentStatus] || [];
  };

  // Get workflow status badge
  const getWorkflowStatusBadge = (status: WorkflowStatus) => {
    const config = WORKFLOW_STATUS_CONFIG[status] || WORKFLOW_STATUS_CONFIG.draft;
    
    return (
      <span
        style={{
          padding: '6px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 600,
          textTransform: 'capitalize',
          backgroundColor: config.bgColor,
          color: config.color,
          border: `1px solid ${config.color}`,
        }}
        title={config.description}
      >
        {config.label}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB');
    } catch (error) {
      return dateStr;
    }
  };

  // Format datetime for workflow history
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateStr;
    }
  };

  const styles = {
    container: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
      minHeight: '100vh',
      padding: '40px 20px',
    } as React.CSSProperties,
    maxWidth: {
      maxWidth: '1200px',
      margin: '0 auto',
    } as React.CSSProperties,
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '24px 32px',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    } as React.CSSProperties,
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0 0 8px 0',
    } as React.CSSProperties,
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      margin: '0 0 24px 0',
    } as React.CSSProperties,
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
      marginBottom: '16px',
    } as React.CSSProperties,
    buttonSecondary: {
      display: 'inline-block',
      padding: '8px 16px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      color: '#3b82f6',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 600,
      border: '1px solid #3b82f6',
      cursor: 'pointer',
      marginRight: '8px',
      marginBottom: '8px',
    } as React.CSSProperties,
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginTop: '16px',
    },
    th: {
      backgroundColor: '#f9fafb',
      padding: '12px',
      textAlign: 'left' as const,
      fontSize: '14px',
      fontWeight: 600,
      color: '#374151',
      borderBottom: '1px solid #e5e7eb',
    } as React.CSSProperties,
    td: {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb',
      fontSize: '14px',
      color: '#1f2937',
    } as React.CSSProperties,
    loading: {
      textAlign: 'center' as const,
      padding: '80px 20px',
      fontSize: '18px',
      color: '#6b7280',
    } as React.CSSProperties,
    brand: { color: '#3b82f6' } as React.CSSProperties,
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    } as React.CSSProperties,
    statCard: {
      padding: '16px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    workflowHistory: {
      maxHeight: '300px',
      overflowY: 'auto' as const,
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      padding: '12px',
    } as React.CSSProperties,
    historyEntry: {
      padding: '8px 12px',
      marginBottom: '8px',
      backgroundColor: '#f9fafb',
      borderRadius: '4px',
      borderLeft: '3px solid #10b981',
    } as React.CSSProperties,
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card}>
            <div style={styles.loading}>🔄 Loading Payroll Run Details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card}>
            <h1 style={styles.title}>Payroll Run Not Found</h1>
            <p style={styles.subtitle}>
              The payroll run you're looking for doesn't exist or has been removed.
            </p>
            <button
              style={styles.button}
              onClick={() => router.push('/dashboard/payroll')}
            >
              ← Back to Payroll Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = (payrollRun.workflow_status || 'draft') as WorkflowStatus;
  const availableTransitions = getAvailableTransitions(currentStatus);
  const config = WORKFLOW_STATUS_CONFIG[currentStatus];

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.card}>
          <h1 style={styles.title}>
            💼 <span style={styles.brand}>WageFlow</span> Payroll Run Details
          </h1>
          <p style={styles.subtitle}>
            {payrollRun.name} - {payrollRun.description}
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              style={styles.buttonSecondary}
              onClick={() => router.push('/dashboard/payroll')}
            >
              ← Back to Payroll
            </button>
            {config.canEdit && (
              <button
                style={styles.buttonSecondary}
                onClick={() => alert('Edit functionality coming soon!')}
              >
                ✏️ Edit
              </button>
            )}
            <button
              style={styles.buttonSecondary}
              onClick={() => setShowWorkflowHistory(!showWorkflowHistory)}
            >
              📋 {showWorkflowHistory ? 'Hide' : 'Show'} History
            </button>
          </div>
        </div>

        {/* Payroll Run Summary */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0' }}>
              {payrollRun.runNumber}
            </h2>
            {getWorkflowStatusBadge(currentStatus)}
          </div>
          
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Pay Period</div>
              <div style={{ fontWeight: 'bold' }}>{formatDate(payrollRun.payPeriodStart)} - {formatDate(payrollRun.payPeriodEnd)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Pay Date</div>
              <div style={{ fontWeight: 'bold' }}>{formatDate(payrollRun.payDate)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Employees</div>
              <div style={{ fontWeight: 'bold' }}>{payrollRun.employeeCount}</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Gross Pay</div>
              <div style={{ fontWeight: 'bold' }}>{formatCurrency(payrollRun.grossPay)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Net Pay</div>
              <div style={{ fontWeight: 'bold' }}>{formatCurrency(payrollRun.netPay)}</div>
            </div>
          </div>
        </div>

        {/* Workflow Actions */}
        {availableTransitions.length > 0 && (
          <div style={styles.card}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>
              Workflow Actions
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {availableTransitions.map((nextStatus) => {
                const nextConfig = WORKFLOW_STATUS_CONFIG[nextStatus];
                return (
                  <button
                    key={nextStatus}
                    style={{
                      ...styles.buttonSecondary,
                      backgroundColor: nextConfig.bgColor,
                      color: nextConfig.color,
                      border: `1px solid ${nextConfig.color}`,
                    }}
                    onClick={() => handleStatusChange(nextStatus)}
                  >
                    → {nextConfig.label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
              Current: {config.description}
            </div>
          </div>
        )}

        {/* Workflow History */}
        {showWorkflowHistory && payrollRun.workflow_history && (
          <div style={styles.card}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>
              Workflow History
            </h3>
            <div style={styles.workflowHistory}>
              {payrollRun.workflow_history.map((entry) => (
                <div key={entry.id} style={styles.historyEntry}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>
                      {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : `Created as ${entry.to_status}`}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatDateTime(entry.changed_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#4b5563' }}>
                    By: {entry.changed_by} {entry.automated && '(Automated)'}
                  </div>
                  {entry.comment && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {entry.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employee Breakdown */}
        <div style={styles.card}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>
            Employee Breakdown
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Gross Pay</th>
                  <th style={styles.th}>Tax</th>
                  <th style={styles.th}>National Insurance</th>
                  <th style={styles.th}>Pension</th>
                  <th style={styles.th}>Net Pay</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollEntries.map((entry) => (
                  <tr key={entry.employeeId}>
                    <td style={styles.td}>
                      <div>
                        <strong>{entry.employeeName}</strong>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {entry.employeeNumber} • {entry.taxCode}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>{formatCurrency(entry.grossPay)}</td>
                    <td style={styles.td}>{formatCurrency(entry.taxDeduction)}</td>
                    <td style={styles.td}>{formatCurrency(entry.niDeduction)}</td>
                    <td style={styles.td}>{formatCurrency(entry.pensionDeduction)}</td>
                    <td style={styles.td}>
                      <strong>{formatCurrency(entry.netPay)}</strong>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{
                          ...styles.buttonSecondary,
                          fontSize: '11px',
                          padding: '4px 8px',
                        }}
                        onClick={() => router.push(`/dashboard/employees/${entry.employeeId}`)}
                      >
                        View Employee
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}